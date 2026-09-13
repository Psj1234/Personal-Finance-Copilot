import assert from 'node:assert/strict'
import express from 'express'
import db from '../db/database.js'
import { generateWeeklyDigest } from '../services/digestService.js'
import { createDigestRouter } from './digest.js'
import { authenticate } from '../middleware/auth.js'
import { createToken } from '../services/authService.js'

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

const testToken = createToken({ userId: 1, email: 'aarav@example.com' })

const app = express()
app.use(express.json())
app.use(
  '/api/digest',
  authenticate,
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

async function get(queryString = '', options = {}) {
  const headers = {
    Authorization: options.noAuth ? '' : (options.token ? `Bearer ${options.token}` : `Bearer ${testToken}`),
    ...(options.headers || {}),
  }
  if (options.rawAuth !== undefined) {
    headers.Authorization = options.rawAuth
  }
  const response = await fetch(`${baseUrl}${queryString}`, { headers })
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
  failureTriggered = false

  // 9. 401: Missing Authorization header
  const resNoAuth = await get('?startDate=2026-03-25&endDate=2026-03-31', { noAuth: true })
  testEqual(resNoAuth.status, 401, 'Returns 401 when no token provided')
  testAssert(resNoAuth.body.error.includes('Authentication required'), 'Mentions authentication required')

  // 10. 401: Malformed Authorization header
  const resMalformedAuth = await get('?startDate=2026-03-25&endDate=2026-03-31', { rawAuth: 'Basic abc123' })
  testEqual(resMalformedAuth.status, 401, 'Returns 401 on malformed scheme')

  // 11. 401: Invalid signature
  const resInvalidSig = await get('?startDate=2026-03-25&endDate=2026-03-31', { rawAuth: `Bearer ${testToken}tampered` })
  testEqual(resInvalidSig.status, 401, 'Returns 401 on invalid token signature')

  // 12. 401: Expired token
  const expiredToken = createToken({ userId: 1, email: 'aarav@example.com' }, { expiresIn: -10 })
  const resExpired = await get('?startDate=2026-03-25&endDate=2026-03-31', { token: expiredToken })
  testEqual(resExpired.status, 401, 'Returns 401 on expired token')

  // 13. Multi-User Isolation in Digest API
  const oldUsers = db.prepare("SELECT id FROM users WHERE email IN ('digest_api_a@test.com', 'digest_api_b@test.com')").all()
  for (const u of oldUsers) {
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(u.id)
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(u.id)
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id)
  }

  const uARes = db.prepare(`
    INSERT INTO users (name, email, password_hash, currency, locale)
    VALUES ('Digest API User A', 'digest_api_a@test.com', 'hashA', 'INR', 'en')
  `).run()
  const uAId = uARes.lastInsertRowid

  const uBRes = db.prepare(`
    INSERT INTO users (name, email, password_hash, currency, locale)
    VALUES ('Digest API User B', 'digest_api_b@test.com', 'hashB', 'INR', 'en')
  `).run()
  const uBId = uBRes.lastInsertRowid

  const tokenA = createToken({ userId: uAId, email: 'digest_api_a@test.com' })
  const tokenB = createToken({ userId: uBId, email: 'digest_api_b@test.com' })

  // Insert distinct transactions for A and B
  db.prepare(`
    INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, '2026-05-02', 'Alpha Boutique', 3500, 'expense', 'Shopping', 'A Shopping')
  `).run(uAId)

  db.prepare(`
    INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, '2026-05-02', 'Beta Flight', 18000, 'expense', 'Travel', 'B Travel')
  `).run(uBId)

  // Digest for A
  const digestApiA = await get('?startDate=2026-05-01&endDate=2026-05-07', { token: tokenA })
  testEqual(digestApiA.status, 200, 'User A returns 200')
  testEqual(digestApiA.body.user.name, 'Digest API User A', 'User A name matches')
  testEqual(digestApiA.body.summary.totalExpenses, 3500, 'User A expenses is 3500')
  testEqual(digestApiA.body.largestExpense.merchant, 'Alpha Boutique', 'User A largest expense is Alpha Boutique')

  // Digest for B
  const digestApiB = await get('?startDate=2026-05-01&endDate=2026-05-07', { token: tokenB })
  testEqual(digestApiB.status, 200, 'User B returns 200')
  testEqual(digestApiB.body.user.name, 'Digest API User B', 'User B name matches')
  testEqual(digestApiB.body.summary.totalExpenses, 18000, 'User B expenses is 18000')
  testEqual(digestApiB.body.largestExpense.merchant, 'Beta Flight', 'User B largest expense is Beta Flight')

  // 14. Spoofing Prevention: passing ?userId= in query is ignored and cannot leak other user's data
  const spoofAttempt = await get(`?startDate=2026-05-01&endDate=2026-05-07&userId=${uBId}`, { token: tokenA })
  testEqual(spoofAttempt.status, 200, 'User A spoof query returns 200')
  testEqual(spoofAttempt.body.user.name, 'Digest API User A', 'Returned digest is strictly User A, ignoring ?userId query spoof')
  testEqual(spoofAttempt.body.summary.totalExpenses, 3500, 'User A expenses strictly returned despite spoof query')

  // Cleanup test users
  for (const id of [uAId, uBId]) {
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(id)
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(id)
    db.prepare('DELETE FROM users WHERE id = ?').run(id)
  }

  console.log(`Digest API route tests passed: ${assertionCount} assertions`)
} finally {
  db.close()
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
}
