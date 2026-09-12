import assert from 'node:assert/strict'
import express from 'express'
import db from '../db/database.js'
import { createBudgetsRouter } from './budgets.js'

const app = express()
app.use(express.json())
app.use('/api/budgets', createBudgetsRouter({ currentDate: '2026-03-31' }))
app.use((error, _request, response, next) => {
  if (response.headersSent) {
    return next(error)
  }
  response.status(error.statusCode || 500).json({ error: error.message })
})

const server = await new Promise((resolve) => {
  const instance = app.listen(0, () => resolve(instance))
})
const { port } = server.address()
const baseUrl = `http://localhost:${port}/api/budgets`
const createdTransactionIds = []
let createdBudgetId

async function request(path = '', options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return { status: response.status, body: response.status === 204 ? null : await response.json() }
}

function insertTransaction(category, amount, type) {
  const result = db
    .prepare(`
      INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
      VALUES (1, '2026-03-31', ?, ?, ?, ?, ?)
    `)
    .run(`Budget QA ${type}`, amount, type, category, 'Budget API test')
  createdTransactionIds.push(result.lastInsertRowid)
}

try {
  const initial = await request()
  assert.equal(initial.status, 200)
  assert.equal(initial.body.budgets.length, 8)
  assert.ok(initial.body.budgets.every((budget) => 'spent' in budget && 'remaining' in budget && 'percentageUsed' in budget))

  const create = await request('', {
    method: 'POST',
    body: JSON.stringify({ category: 'Education', monthlyLimit: 1000 }),
  })
  assert.equal(create.status, 201)
  createdBudgetId = create.body.budget.id
  insertTransaction('Education', 300, 'expense')
  insertTransaction('Education', 10000, 'income')

  const calculated = await request()
  const education = calculated.body.budgets.find((budget) => budget.id === createdBudgetId)
  assert.equal(education.spent, 300)
  assert.equal(education.remaining, 700)
  assert.equal(education.percentageUsed, 30)

  const overspend = await request(`/${createdBudgetId}`, {
    method: 'PUT',
    body: JSON.stringify({ monthlyLimit: 100 }),
  })
  assert.equal(overspend.status, 200)
  assert.equal(overspend.body.budget.spent, 300)
  assert.ok(overspend.body.budget.percentageUsed > 100)
  assert.equal(overspend.body.budget.remaining, -200)

  const missingLimit = await request(`/${createdBudgetId}`, { method: 'PUT', body: JSON.stringify({}) })
  assert.equal(missingLimit.status, 400)
  const zeroLimit = await request(`/${createdBudgetId}`, { method: 'PUT', body: JSON.stringify({ monthlyLimit: 0 }) })
  assert.equal(zeroLimit.status, 400)
  const negativeLimit = await request(`/${createdBudgetId}`, { method: 'PUT', body: JSON.stringify({ monthlyLimit: -5 }) })
  assert.equal(negativeLimit.status, 400)
  const invalidLimit = await request(`/${createdBudgetId}`, { method: 'PUT', body: JSON.stringify({ monthlyLimit: 'not-a-number' }) })
  assert.equal(invalidLimit.status, 400)
  assert.equal((await request('/999999', { method: 'PUT', body: JSON.stringify({ monthlyLimit: 500 }) })).status, 404)

  const invalidCategory = await request('', {
    method: 'POST',
    body: JSON.stringify({ category: 'Luxury', monthlyLimit: 5000 }),
  })
  assert.equal(invalidCategory.status, 400)
  const duplicate = await request('', {
    method: 'POST',
    body: JSON.stringify({ category: 'Food', monthlyLimit: 5000 }),
  })
  assert.equal(duplicate.status, 409)

  const deleted = await request(`/${createdBudgetId}`, { method: 'DELETE' })
  assert.equal(deleted.status, 204)
  assert.equal((await request(`/${createdBudgetId}`, { method: 'PUT', body: JSON.stringify({ monthlyLimit: 500 }) })).status, 404)
  assert.equal((await request('/999999', { method: 'DELETE' })).status, 404)
} finally {
  const deleteTransactions = db.prepare('DELETE FROM transactions WHERE id = ?')
  for (const transactionId of createdTransactionIds) {
    deleteTransactions.run(transactionId)
  }
  if (createdBudgetId) {
    db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = 1').run(createdBudgetId)
  }
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  db.close()
}

console.log('Budget API tests passed: 16 assertions')
