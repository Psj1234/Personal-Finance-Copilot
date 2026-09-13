import assert from 'node:assert/strict'
import app from '../app.js'
import db from '../db/database.js'
import { createToken, hashPassword } from '../services/authService.js'
import { retrieveTransactions } from '../services/ragService.js'

const server = await new Promise((resolve) => {
  const instance = app.listen(0, () => resolve(instance))
})
const { port } = server.address()
const baseUrl = `http://localhost:${port}/api`

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token !== undefined) {
    headers.Authorization = token ? `Bearer ${token}` : ''
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { status: response.status, body: json }
}

function cleanupTestUsers() {
  const users = db.prepare("SELECT id FROM users WHERE email IN ('test_usera@isolation.com', 'test_userb@isolation.com')").all()
  for (const u of users) {
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(u.id)
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(u.id)
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id)
  }
}

try {
  console.log('--- Running Cross-User Security & Isolation Tests ---')

  cleanupTestUsers()

  // Setup User A and User B
  const hashedPassword = hashPassword('Secret123!')
  const resA = db.prepare(`
    INSERT INTO users (name, email, password_hash, currency, locale)
    VALUES ('User Alpha', 'test_usera@isolation.com', ?, 'INR', 'en')
  `).run(hashedPassword)
  const userA = { id: resA.lastInsertRowid, email: 'test_usera@isolation.com' }

  const resB = db.prepare(`
    INSERT INTO users (name, email, password_hash, currency, locale)
    VALUES ('User Beta', 'test_userb@isolation.com', ?, 'INR', 'en')
  `).run(hashedPassword)
  const userB = { id: resB.lastInsertRowid, email: 'test_userb@isolation.com' }

  const tokenA = createToken({ userId: userA.id, email: userA.email })
  const tokenB = createToken({ userId: userB.id, email: userB.email })

  // ==================================================
  // A. AUTHENTICATION MIDDLEWARE
  // ==================================================
  console.log('Testing Authentication Middleware...')

  // Missing Authorization header -> 401
  const noHeader = await apiRequest('/transactions')
  assert.equal(noHeader.status, 401)
  assert.equal(noHeader.body?.error, 'Authentication required')

  // Malformed Authorization header -> 401
  const malformedHeader = await fetch(`${baseUrl}/transactions`, {
    headers: { Authorization: 'Basic dXNlcjpwYXNz' },
  })
  assert.equal(malformedHeader.status, 401)

  // Empty Bearer token -> 401
  const emptyBearer = await fetch(`${baseUrl}/transactions`, {
    headers: { Authorization: 'Bearer ' },
  })
  assert.equal(emptyBearer.status, 401)

  // Invalid signature -> 401
  const invalidSig = await fetch(`${baseUrl}/transactions`, {
    headers: { Authorization: `Bearer ${tokenA}tampered` },
  })
  assert.equal(invalidSig.status, 401)

  // Expired token -> 401
  const expiredToken = createToken({ userId: userA.id, email: userA.email }, { expiresIn: -10 })
  const expiredRes = await apiRequest('/transactions', { token: expiredToken })
  assert.equal(expiredRes.status, 401)

  // Token referencing deleted / nonexistent user -> 401
  const nonExistentToken = createToken({ userId: 9999999, email: 'ghost@example.com' })
  const ghostRes = await apiRequest('/transactions', { token: nonExistentToken })
  assert.equal(ghostRes.status, 401)

  // Valid token allows request through
  const validRes = await apiRequest('/transactions', { token: tokenA })
  assert.equal(validRes.status, 200)

  // ==================================================
  // B. TRANSACTIONS ISOLATION
  // ==================================================
  console.log('Testing Transactions Isolation...')

  // Insert transaction A1 for User A
  const postA = await apiRequest('/transactions', {
    method: 'POST',
    token: tokenA,
    body: {
      date: '2026-03-25',
      merchant: 'AlphaMerchant_Exclusive',
      amount: 1200,
      type: 'expense',
      category: 'Shopping',
      rawDescription: 'Alpha purchase',
    },
  })
  assert.equal(postA.status, 201)
  const txA1 = postA.body.transaction
  assert.equal(txA1.user_id, userA.id)

  // Insert transaction B1 for User B
  const postB = await apiRequest('/transactions', {
    method: 'POST',
    token: tokenB,
    body: {
      date: '2026-03-26',
      merchant: 'BetaMerchant_Exclusive',
      amount: 2500,
      type: 'expense',
      category: 'Travel',
      rawDescription: 'Beta travel ticket',
    },
  })
  assert.equal(postB.status, 201)
  const txB1 = postB.body.transaction
  assert.equal(txB1.user_id, userB.id)

  // User A lists transactions -> sees only A's transactions
  const listA = await apiRequest('/transactions', { token: tokenA })
  assert.equal(listA.status, 200)
  assert.ok(listA.body.transactions.some((t) => t.id === txA1.id))
  assert.ok(!listA.body.transactions.some((t) => t.id === txB1.id))

  // User B lists transactions -> sees only B's transactions
  const listB = await apiRequest('/transactions', { token: tokenB })
  assert.equal(listB.status, 200)
  assert.ok(listB.body.transactions.some((t) => t.id === txB1.id))
  assert.ok(!listB.body.transactions.some((t) => t.id === txA1.id))

  // User A cannot retrieve User B's transaction by ID -> 404
  const getBbyA = await apiRequest(`/transactions/${txB1.id}`, { token: tokenA })
  assert.equal(getBbyA.status, 404)

  // User B can retrieve B's transaction by ID -> 200
  const getBbyB = await apiRequest(`/transactions/${txB1.id}`, { token: tokenB })
  assert.equal(getBbyB.status, 200)
  assert.equal(getBbyB.body.transaction.merchant, 'BetaMerchant_Exclusive')

  // User A cannot update User B's transaction -> 404
  const updateBbyA = await apiRequest(`/transactions/${txB1.id}`, {
    method: 'PUT',
    token: tokenA,
    body: {
      date: '2026-03-26',
      merchant: 'Hacked_Merchant',
      amount: 1,
      type: 'expense',
    },
  })
  assert.equal(updateBbyA.status, 404)

  // Verify B1 remained unchanged in database
  const txBCheck = db.prepare('SELECT merchant FROM transactions WHERE id = ?').get(txB1.id)
  assert.equal(txBCheck.merchant, 'BetaMerchant_Exclusive')

  // User A cannot delete User B's transaction -> 404
  const deleteBbyA = await apiRequest(`/transactions/${txB1.id}`, {
    method: 'DELETE',
    token: tokenA,
  })
  assert.equal(deleteBbyA.status, 404)

  // Verify B1 still exists in database
  const txBStillThere = db.prepare('SELECT id FROM transactions WHERE id = ?').get(txB1.id)
  assert.ok(txBStillThere)

  // Client-supplied userId in body is ignored
  const postSpoof = await apiRequest('/transactions', {
    method: 'POST',
    token: tokenA,
    body: {
      userId: userB.id,
      user_id: userB.id,
      date: '2026-03-27',
      merchant: 'SpoofedMerchant',
      amount: 100,
      type: 'expense',
    },
  })
  assert.equal(postSpoof.status, 201)
  assert.equal(postSpoof.body.transaction.user_id, userA.id, 'Transaction must belong to authenticated user, not spoofed body userId')

  // ==================================================
  // C. BUDGETS ISOLATION
  // ==================================================
  console.log('Testing Budgets Isolation...')

  // User A creates budget for 'Groceries' (5000)
  const budgetPostA = await apiRequest('/budgets', {
    method: 'POST',
    token: tokenA,
    body: { category: 'Groceries', monthlyLimit: 5000 },
  })
  assert.equal(budgetPostA.status, 201)
  const budgetA = budgetPostA.body.budget

  // User B creates budget for 'Groceries' (8000) - verifying multi-user unique constraint
  const budgetPostB = await apiRequest('/budgets', {
    method: 'POST',
    token: tokenB,
    body: { category: 'Groceries', monthlyLimit: 8000 },
  })
  assert.equal(budgetPostB.status, 201)
  const budgetB = budgetPostB.body.budget

  // User A sees only A's budgets
  const budgetListA = await apiRequest('/budgets', { token: tokenA })
  assert.equal(budgetListA.status, 200)
  const aGroceries = budgetListA.body.budgets.find((b) => b.id === budgetA.id)
  assert.ok(aGroceries)
  assert.equal(aGroceries.monthlyLimit, 5000)
  assert.ok(!budgetListA.body.budgets.some((b) => b.id === budgetB.id))

  // User B sees only B's budgets
  const budgetListB = await apiRequest('/budgets', { token: tokenB })
  assert.equal(budgetListB.status, 200)
  const bGroceries = budgetListB.body.budgets.find((b) => b.id === budgetB.id)
  assert.ok(bGroceries)
  assert.equal(bGroceries.monthlyLimit, 8000)
  assert.ok(!budgetListB.body.budgets.some((b) => b.id === budgetA.id))

  // User A cannot update User B's budget -> 404
  const updateBudgetBbyA = await apiRequest(`/budgets/${budgetB.id}`, {
    method: 'PUT',
    token: tokenA,
    body: { monthlyLimit: 9999 },
  })
  assert.equal(updateBudgetBbyA.status, 404)

  // User A cannot delete User B's budget -> 404
  const deleteBudgetBbyA = await apiRequest(`/budgets/${budgetB.id}`, {
    method: 'DELETE',
    token: tokenA,
  })
  assert.equal(deleteBudgetBbyA.status, 404)

  // Verify B's budget still exists with original limit
  const checkBudgetB = db.prepare('SELECT monthly_limit FROM budgets WHERE id = ?').get(budgetB.id)
  assert.equal(checkBudgetB.monthly_limit, 8000)

  // ==================================================
  // D. ANALYTICS ISOLATION
  // ==================================================
  console.log('Testing Analytics Isolation...')

  // Seed clear transaction amounts for analytics
  // User A: +5000 income, -1200 expense
  db.prepare(`
    INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, '2026-03-20', 'Salary A', 5000, 'income', 'Salary', 'March Salary')
  `).run(userA.id)

  // User B: +12000 income, -2500 expense
  db.prepare(`
    INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, '2026-03-20', 'Salary B', 12000, 'income', 'Salary', 'March Salary')
  `).run(userB.id)

  const analyticsA = await apiRequest('/analytics/summary', { token: tokenA })
  assert.equal(analyticsA.status, 200)
  assert.equal(analyticsA.body.summary.totalIncome, 5000)
  // User A expenses: 1200 + 100 = 1300
  assert.equal(analyticsA.body.summary.totalExpenses, 1300)

  const analyticsB = await apiRequest('/analytics/summary', { token: tokenB })
  assert.equal(analyticsB.status, 200)
  assert.equal(analyticsB.body.summary.totalIncome, 12000)
  // User B expenses: 2500
  assert.equal(analyticsB.body.summary.totalExpenses, 2500)

  // ==================================================
  // E. RAG RETRIEVAL ISOLATION
  // ==================================================
  console.log('Testing RAG Isolation...')

  // Distinct merchant strings
  const ragA = retrieveTransactions('AlphaMerchant_Exclusive', { userId: userA.id })
  assert.equal(ragA.count, 1)
  assert.equal(ragA.transactions[0].merchant, 'AlphaMerchant_Exclusive')

  const ragAfromB = retrieveTransactions('AlphaMerchant_Exclusive', { userId: userB.id })
  assert.equal(ragAfromB.count, 0)
  assert.deepEqual(ragAfromB.transactions, [])

  const ragB = retrieveTransactions('BetaMerchant_Exclusive', { userId: userB.id })
  assert.equal(ragB.count, 1)
  assert.equal(ragB.transactions[0].merchant, 'BetaMerchant_Exclusive')

  const ragBfromA = retrieveTransactions('BetaMerchant_Exclusive', { userId: userA.id })
  assert.equal(ragBfromA.count, 0)
  assert.deepEqual(ragBfromA.transactions, [])

  // Call without userId -> must fail safely and return 0, no demo-user fallback
  const ragNoUser = retrieveTransactions('AlphaMerchant_Exclusive')
  assert.equal(ragNoUser.count, 0)
  assert.deepEqual(ragNoUser.transactions, [])

  // ==================================================
  // F. CHAT ROUTE ISOLATION
  // ==================================================
  console.log('Testing Chat Route Isolation...')

  // Chat with User A token
  const chatA = await apiRequest('/chat', {
    method: 'POST',
    token: tokenA,
    body: { question: 'How much did I spend at AlphaMerchant_Exclusive?' },
  })
  assert.equal(chatA.status, 200)
  assert.equal(chatA.body.retrievedCount, 1)

  // Chat with User B token for User A's merchant
  const chatB = await apiRequest('/chat', {
    method: 'POST',
    token: tokenB,
    body: { question: 'How much did I spend at AlphaMerchant_Exclusive?' },
  })
  assert.equal(chatB.status, 200)
  assert.equal(chatB.body.retrievedCount, 0, 'User B must not retrieve User A transactions')

  // Chat with User B token spoofing userId in body
  const chatBSpoofed = await apiRequest('/chat', {
    method: 'POST',
    token: tokenB,
    body: {
      userId: userA.id,
      user_id: userA.id,
      question: 'How much did I spend at AlphaMerchant_Exclusive?',
    },
  })
  assert.equal(chatBSpoofed.status, 200)
  assert.equal(chatBSpoofed.body.retrievedCount, 0, 'Client-supplied userId in body must be completely ignored')

  // ==================================================
  // G. UNAUTHENTICATED ROUTE PROTECTION
  // ==================================================
  console.log('Testing Unauthenticated Route Protection (401)...')

  assert.equal((await apiRequest('/transactions')).status, 401)
  assert.equal((await apiRequest('/budgets')).status, 401)
  assert.equal((await apiRequest('/analytics/summary')).status, 401)
  assert.equal((await apiRequest('/analytics/forecast')).status, 401)
  assert.equal((await apiRequest('/chat', { method: 'POST', body: { question: 'Hello' } })).status, 401)

  console.log('All Cross-User Security & Isolation Tests Passed Successfully!')
} finally {
  cleanupTestUsers()
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
}
