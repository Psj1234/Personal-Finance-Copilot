import assert from 'node:assert/strict'
import express from 'express'
import db from '../db/database.js'
import { generateWeeklyDigest } from '../services/digestService.js'
import { createDigestRouter } from './digest.js'

let failureTriggered = false
let assertionCount = 0

function testAssert(condition, message) {
  assert.ok(condition, message)
  assertionCount++
}
function testEqual(actual, expected, message) {
  assert.equal(actual, expected, message)
  assertionCount++
}

const app = express()
app.use(express.json())
app.use(
  '/api/digest',
  createDigestRouter({
    generateWeeklyDigest: (opts) => {
      if (failureTriggered) {
        throw new Error('Sensitive database SQL internals and secrets: gsk_test123')
      }
      return generateWeeklyDigest(opts)
    },
  }),
)

app.use((error, _request, response, next) => {
  if (response.headersSent) {
    return next(error)
  }
  const statusCode = error.statusCode || 500
  const message = statusCode === 500 ? 'Internal server error' : error.message
  response.status(statusCode).json({ error: message })
})

const server = await new Promise((resolve) => {
  const instance = app.listen(0, () => resolve(instance))
})
const { port } = server.address()
const baseUrl = `http://localhost:${port}/api/digest/weekly`

async function get(queryString = '') {
  const response = await fetch(`${baseUrl}${queryString}`)
  return {
    status: response.status,
    body: await response.json(),
  }
}

try {
  // 1. Successful 200 response with March 2026 data
  const res200 = await get('?startDate=2026-03-25&endDate=2026-03-31')
  testEqual(res200.status, 200, 'Returns 200 for valid date range')

  // Verify response structure
  testAssert('period' in res200.body, 'Body contains period')
  testAssert('user' in res200.body, 'Body contains user')
  testAssert('summary' in res200.body, 'Body contains summary')
  testAssert('largestExpense' in res200.body, 'Body contains largestExpense')
  testAssert('topCategories' in res200.body, 'Body contains topCategories')
  testAssert('budgetAlerts' in res200.body, 'Body contains budgetAlerts')

  // Verify values
  testEqual(res200.body.period.startDate, '2026-03-25', 'Period startDate is correct')
  testEqual(res200.body.period.endDate, '2026-03-31', 'Period endDate is correct')
  testEqual(res200.body.period.days, 7, 'Period days is 7')
  testEqual(res200.body.user.name, 'Aarav Mehta', 'User name is Aarav Mehta')
  testEqual(res200.body.summary.totalExpenses, 7510, 'Total expenses is 7510')
  testEqual(res200.body.summary.transactionCount, 7, 'Transaction count is 7')
  testEqual(res200.body.largestExpense.merchant, 'Cash Withdrawal', 'Largest merchant is Cash Withdrawal')
  testEqual(res200.body.largestExpense.amount, 2600, 'Largest amount is 2600')

  // 2. Zero-result date range
  const resZero = await get('?startDate=2026-04-01&endDate=2026-04-07')
  testEqual(resZero.status, 200, 'Returns 200 for zero-result date range')
  testEqual(resZero.body.summary.totalExpenses, 0, 'Zero expenses in empty range')
  testEqual(resZero.body.summary.transactionCount, 0, 'Zero transactions in empty range')
  testEqual(resZero.body.largestExpense, null, 'largestExpense is null')
  testEqual(resZero.body.topCategories.length, 0, 'topCategories is empty array')

  // 3. 400: Missing startDate
  const resNoStart = await get('?endDate=2026-03-31')
  testEqual(resNoStart.status, 400, 'Returns 400 when startDate is missing')
  testAssert(resNoStart.body.error.includes('startDate is required'), 'Error mentions startDate')

  // 4. 400: Missing endDate
  const resNoEnd = await get('?startDate=2026-03-25')
  testEqual(resNoEnd.status, 400, 'Returns 400 when endDate is missing')
  testAssert(resNoEnd.body.error.includes('endDate is required'), 'Error mentions endDate')

  // 5. 400: Invalid date format
  const resInvalidFormat = await get('?startDate=25-03-2026&endDate=2026-03-31')
  testEqual(resInvalidFormat.status, 400, 'Returns 400 on invalid format')
  testAssert(resInvalidFormat.body.error.includes('YYYY-MM-DD format'), 'Error mentions format')

  // 6. 400: Non-existent calendar date
  const resInvalidCalendar = await get('?startDate=2026-02-31&endDate=2026-03-31')
  testEqual(resInvalidCalendar.status, 400, 'Returns 400 on non-existent calendar date')
  testAssert(resInvalidCalendar.body.error.includes('YYYY-MM-DD format'), 'Error mentions format')

  // 7. 400: startDate after endDate
  const resInverted = await get('?startDate=2026-03-31&endDate=2026-03-25')
  testEqual(resInverted.status, 400, 'Returns 400 when startDate > endDate')
  testAssert(resInverted.body.error.includes('startDate must be earlier than or equal to endDate'), 'Error mentions order')

  // 8. 500: Internal server error - verify no credential or SQL error leakage
  failureTriggered = true
  const res500 = await get('?startDate=2026-03-25&endDate=2026-03-31')
  testEqual(res500.status, 500, 'Returns 500 on internal error')
  testEqual(res500.body.error, 'Internal server error', 'Returns generic error message only')
  testAssert(!JSON.stringify(res500.body).includes('gsk_'), 'Does not leak API key')
  testAssert(!JSON.stringify(res500.body).includes('database SQL'), 'Does not leak SQL details')
  testAssert(!JSON.stringify(res500.body).includes('stack'), 'Does not leak stack trace')

  console.log(`Digest API route tests passed: ${assertionCount} assertions`)
} finally {
  db.close()
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
}
