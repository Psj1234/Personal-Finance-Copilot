import assert from 'node:assert/strict'
import db from '../db/database.js'
import { generateWeeklyDigest } from './digestService.js'

let assertionCount = 0
function testAssert(condition, message) {
  assert.ok(condition, message)
  assertionCount++
}
function testEqual(actual, expected, message) {
  assert.equal(actual, expected, message)
  assertionCount++
}
function testDeepEqual(actual, expected, message) {
  assert.deepEqual(actual, expected, message)
  assertionCount++
}

try {
  // 1. Valid date range (March 25, 2026 - March 31, 2026: 7 days)
  const digest = generateWeeklyDigest({
    startDate: '2026-03-25',
    endDate: '2026-03-31',
    userId: 1,
  })

  testEqual(digest.period.startDate, '2026-03-25', 'Period start date matches')
  testEqual(digest.period.endDate, '2026-03-31', 'Period end date matches')
  testEqual(digest.period.days, 7, 'Inclusive period days count is 7')
  testEqual(digest.user.name, 'Aarav Mehta', 'Demo user name matches')
  testEqual(digest.user.currency, 'INR', 'Currency matches INR')

  // 2. Summary totals
  testEqual(digest.summary.totalIncome, 0, 'Total income is 0')
  testEqual(digest.summary.totalExpenses, 7510, 'Total expenses sum is 7510')
  testEqual(digest.summary.netSavings, -7510, 'Net savings is -7510')
  testEqual(digest.summary.transactionCount, 7, 'Transaction count is 7')

  // 3. Category aggregation & percentages
  testAssert(digest.topCategories.length > 0, 'Top categories populated')
  const topCategory = digest.topCategories[0]
  testEqual(topCategory.category, 'Other', 'Top category is Other')
  testEqual(topCategory.amount, 3850, 'Other category amount is 3850 (2600 + 1250)')
  testEqual(topCategory.percentageOfSpend, 51.26, 'Other category percentage is 51.26%')

  const totalPercentages = digest.topCategories.reduce((sum, item) => sum + item.percentageOfSpend, 0)
  testAssert(Math.abs(totalPercentages - 100) < 0.2, 'Category percentages sum to ~100%')

  // 4. Largest expense
  testAssert(digest.largestExpense !== null, 'Largest expense exists')
  testEqual(digest.largestExpense.merchant, 'Cash Withdrawal', 'Largest expense merchant is Cash Withdrawal')
  testEqual(digest.largestExpense.amount, 2600, 'Largest expense amount is 2600')
  testEqual(digest.largestExpense.category, 'Other', 'Largest expense category is Other')
  testEqual(digest.largestExpense.date, '2026-03-30', 'Largest expense date is 2026-03-30')

  // 5. Budget alerts for March 2026
  testAssert(Array.isArray(digest.budgetAlerts), 'Budget alerts is an array')
  const travelAlert = digest.budgetAlerts.find((b) => b.category === 'Travel')
  testAssert(travelAlert !== undefined, 'Travel budget alert exists')
  testEqual(travelAlert.status, 'exceeded', 'Travel budget exceeded 100%')
  testEqual(travelAlert.monthlyLimit, 12000, 'Travel budget limit is 12000')
  testEqual(travelAlert.spent, 14060, 'Travel budget spent is 14060')
  testEqual(travelAlert.period, '2026-03', 'Budget period explicitly marked 2026-03')

  const foodAlert = digest.budgetAlerts.find((b) => b.category === 'Food')
  testAssert(foodAlert !== undefined, 'Food budget alert exists')
  testEqual(foodAlert.status, 'warning', 'Food budget is in warning state (>=80% and <100%)')
  testEqual(foodAlert.monthlyLimit, 12000, 'Food budget limit is 12000')
  testEqual(foodAlert.spent, 10155, 'Food budget spent is 10155')
  testEqual(foodAlert.percentageUsed, 84.63, 'Food budget percentage is 84.63%')

  // 6. Inclusive date boundaries (single day test)
  const singleDayDigest = generateWeeklyDigest({
    startDate: '2026-03-31',
    endDate: '2026-03-31',
    userId: 1,
  })
  testEqual(singleDayDigest.period.days, 1, 'Single day date range is 1 day')
  testEqual(singleDayDigest.summary.transactionCount, 1, '1 transaction on 2026-03-31')
  testEqual(singleDayDigest.summary.totalExpenses, 1250, 'Expenses on 2026-03-31 is 1250')
  testEqual(singleDayDigest.largestExpense.merchant, 'Local Repair Shop', 'Largest expense on 2026-03-31 is Local Repair Shop')

  // 7. Income + Expense mixed period (March 1, 2026 - March 5, 2026)
  const incomeDigest = generateWeeklyDigest({
    startDate: '2026-03-01',
    endDate: '2026-03-05',
    userId: 1,
  })
  testEqual(incomeDigest.summary.totalIncome, 132000, 'Salary income recorded is 132000')
  testEqual(incomeDigest.summary.totalExpenses, 31687, 'Expenses total 31687')
  testEqual(incomeDigest.summary.netSavings, 100313, 'Net savings is 132000 - 31687 = 100313')
  testEqual(incomeDigest.summary.transactionCount, 5, '5 transactions in early March')

  // 8. Zero-expense period (future week with no activity)
  const emptyDigest = generateWeeklyDigest({
    startDate: '2026-04-01',
    endDate: '2026-04-07',
    userId: 1,
  })
  testEqual(emptyDigest.summary.totalIncome, 0, 'Zero income in empty week')
  testEqual(emptyDigest.summary.totalExpenses, 0, 'Zero expenses in empty week')
  testEqual(emptyDigest.summary.netSavings, 0, 'Zero net savings in empty week')
  testEqual(emptyDigest.summary.transactionCount, 0, 'Zero transactions in empty week')
  testDeepEqual(emptyDigest.topCategories, [], 'Empty categories array')
  testEqual(emptyDigest.largestExpense, null, 'Largest expense is null for zero-expense week')
  testDeepEqual(emptyDigest.budgetAlerts, [], 'Zero budget alerts for empty month')

  // 9. Validation error: missing startDate
  assert.throws(
    () => generateWeeklyDigest({ endDate: '2026-03-31', userId: 1 }),
    (err) => err.statusCode === 400 && err.message.includes('startDate must be a valid date'),
    'Throws 400 on missing startDate',
  )
  assertionCount++

  // 10. Validation error: invalid format
  assert.throws(
    () => generateWeeklyDigest({ startDate: '25-03-2026', endDate: '2026-03-31', userId: 1 }),
    (err) => err.statusCode === 400 && err.message.includes('YYYY-MM-DD format'),
    'Throws 400 on invalid format',
  )
  assertionCount++

  // 11. Validation error: non-existent calendar date
  assert.throws(
    () => generateWeeklyDigest({ startDate: '2026-02-31', endDate: '2026-03-31', userId: 1 }),
    (err) => err.statusCode === 400 && err.message.includes('YYYY-MM-DD format'),
    'Throws 400 on non-existent calendar date',
  )
  assertionCount++

  // 12. Validation error: startDate after endDate
  assert.throws(
    () => generateWeeklyDigest({ startDate: '2026-03-31', endDate: '2026-03-25', userId: 1 }),
    (err) => err.statusCode === 400 && err.message.includes('startDate must be earlier than or equal to endDate'),
    'Throws 400 when startDate is after endDate',
  )
  assertionCount++

  // 13. Validation error: non-existent user
  assert.throws(
    () => generateWeeklyDigest({ startDate: '2026-03-25', endDate: '2026-03-31', userId: 999999 }),
    (err) => err.statusCode === 404 && err.message.includes('User not found'),
    'Throws 404 on invalid user id',
  )
  assertionCount++

  // 14. Validation error: missing/invalid userId (fails safely, no demo fallback)
  assert.throws(
    () => generateWeeklyDigest({ startDate: '2026-03-25', endDate: '2026-03-31' }),
    (err) => err.statusCode === 400 && err.message.includes('A valid userId is required'),
    'Throws 400 when userId is omitted, refusing demo user fallback',
  )
  assertionCount++

  assert.throws(
    () => generateWeeklyDigest({ startDate: '2026-03-25', endDate: '2026-03-31', userId: 'invalid' }),
    (err) => err.statusCode === 400 && err.message.includes('A valid userId is required'),
    'Throws 400 on non-numeric userId',
  )
  assertionCount++

  // 15. Multi-User Isolation in Digest Service
  // Clean up any old test users
  const oldUsers = db.prepare("SELECT id FROM users WHERE email IN ('digest_user_a@test.com', 'digest_user_b@test.com')").all()
  for (const u of oldUsers) {
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(u.id)
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(u.id)
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id)
  }

  const userARes = db.prepare(`
    INSERT INTO users (name, email, password_hash, currency, locale)
    VALUES ('Digest User A', 'digest_user_a@test.com', 'hashA', 'INR', 'en')
  `).run()
  const userAId = userARes.lastInsertRowid

  const userBRes = db.prepare(`
    INSERT INTO users (name, email, password_hash, currency, locale)
    VALUES ('Digest User B', 'digest_user_b@test.com', 'hashB', 'INR', 'en')
  `).run()
  const userBId = userBRes.lastInsertRowid

  // User A transactions (2026-05-01 to 2026-05-07)
  // Income: 20000, Expenses: 3500 (Rent: 3000, Food: 500)
  db.prepare(`
    INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, '2026-05-01', 'Salary Alpha', 20000, 'income', 'Salary', 'Income A')
  `).run(userAId)
  db.prepare(`
    INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, '2026-05-02', 'Landlord A', 3000, 'expense', 'Rent', 'Rent A')
  `).run(userAId)
  db.prepare(`
    INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, '2026-05-03', 'Cafe Alpha', 500, 'expense', 'Food', 'Food A')
  `).run(userAId)

  // User A Budget: Rent (monthly limit 3500) -> spent 3000 -> 85.71% (warning alert)
  db.prepare(`
    INSERT INTO budgets (user_id, category, monthly_limit)
    VALUES (?, 'Rent', 3500)
  `).run(userAId)

  // User B transactions (2026-05-01 to 2026-05-07)
  // Income: 45000, Expenses: 8200 (Shopping: 8000, Transport: 200)
  db.prepare(`
    INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, '2026-05-01', 'Salary Beta', 45000, 'income', 'Salary', 'Income B')
  `).run(userBId)
  db.prepare(`
    INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, '2026-05-02', 'Mall Beta', 8000, 'expense', 'Shopping', 'Shopping B')
  `).run(userBId)
  db.prepare(`
    INSERT INTO transactions (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, '2026-05-03', 'Metro Beta', 200, 'expense', 'Transport', 'Transport B')
  `).run(userBId)

  // User B Budget: Shopping (monthly limit 7000) -> spent 8000 -> 114.29% (exceeded alert)
  db.prepare(`
    INSERT INTO budgets (user_id, category, monthly_limit)
    VALUES (?, 'Shopping', 7000)
  `).run(userBId)

  // Generate digest for User A
  const digestA = generateWeeklyDigest({
    startDate: '2026-05-01',
    endDate: '2026-05-07',
    userId: userAId,
  })

  testEqual(digestA.user.name, 'Digest User A', 'User A name matches')
  testEqual(digestA.summary.totalIncome, 20000, 'User A income is 20000')
  testEqual(digestA.summary.totalExpenses, 3500, 'User A expenses is 3500')
  testEqual(digestA.summary.netSavings, 16500, 'User A net savings is 16500')
  testEqual(digestA.summary.transactionCount, 3, 'User A has 3 transactions')
  testEqual(digestA.largestExpense.merchant, 'Landlord A', 'User A largest expense is Landlord A')
  testEqual(digestA.largestExpense.amount, 3000, 'User A largest expense amount is 3000')
  testEqual(digestA.topCategories.length, 2, 'User A has 2 expense categories')
  testAssert(!digestA.topCategories.some((c) => c.category === 'Shopping'), 'User A has no Shopping category')
  testEqual(digestA.budgetAlerts.length, 1, 'User A has 1 budget alert')
  testEqual(digestA.budgetAlerts[0].category, 'Rent', 'User A alert is Rent')
  testEqual(digestA.budgetAlerts[0].status, 'warning', 'User A alert status is warning')

  // Generate digest for User B
  const digestB = generateWeeklyDigest({
    startDate: '2026-05-01',
    endDate: '2026-05-07',
    userId: userBId,
  })

  testEqual(digestB.user.name, 'Digest User B', 'User B name matches')
  testEqual(digestB.summary.totalIncome, 45000, 'User B income is 45000')
  testEqual(digestB.summary.totalExpenses, 8200, 'User B expenses is 8200')
  testEqual(digestB.summary.netSavings, 36800, 'User B net savings is 36800')
  testEqual(digestB.summary.transactionCount, 3, 'User B has 3 transactions')
  testEqual(digestB.largestExpense.merchant, 'Mall Beta', 'User B largest expense is Mall Beta')
  testEqual(digestB.largestExpense.amount, 8000, 'User B largest expense amount is 8000')
  testEqual(digestB.topCategories.length, 2, 'User B has 2 expense categories')
  testAssert(!digestB.topCategories.some((c) => c.category === 'Rent'), 'User B has no Rent category')
  testEqual(digestB.budgetAlerts.length, 1, 'User B has 1 budget alert')
  testEqual(digestB.budgetAlerts[0].category, 'Shopping', 'User B alert is Shopping')
  testEqual(digestB.budgetAlerts[0].status, 'exceeded', 'User B alert status is exceeded')

  // Clean up test users
  const cleanupUsers = [userAId, userBId]
  for (const id of cleanupUsers) {
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(id)
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(id)
    db.prepare('DELETE FROM users WHERE id = ?').run(id)
  }

  console.log(`Weekly digest service tests passed: ${assertionCount} assertions`)
} finally {
  db.close()
}
