import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import db from './database.js'
import { hashPassword } from '../services/authService.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.resolve(currentDirectory, '../../../data/mock_transactions.csv')
const demoUserName = 'Aarav Mehta'
const demoUserEmail = 'aarav@example.com'
const demoUserPassword = 'password123'

function parseCsv(csv) {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/)
  const headers = headerLine.split(',')

  return lines.filter(Boolean).map((line) => {
    const values = line.split(',')
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]))
  })
}

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'))
const seed = db.transaction(() => {
  const existingUser = db
    .prepare('SELECT id FROM users WHERE name = ? OR email = ?')
    .get(demoUserName, demoUserEmail)

  if (existingUser) {
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(existingUser.id)
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(existingUser.id)
    db.prepare('DELETE FROM users WHERE id = ?').run(existingUser.id)
  }

  const userResult = db
    .prepare(
      'INSERT INTO users (name, email, password_hash, currency, locale) VALUES (?, ?, ?, ?, ?)',
    )
    .run(demoUserName, demoUserEmail, hashPassword(demoUserPassword), 'INR', 'en')
  const userId = userResult.lastInsertRowid

  const insertTransaction = db.prepare(`
    INSERT INTO transactions
      (user_id, date, merchant, amount, type, category, raw_description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  for (const row of rows) {
    insertTransaction.run(
      userId,
      row.date,
      row.merchant,
      Number(row.amount),
      row.type,
      row.category,
      row.raw_description,
    )
  }

  const budgets = [
    ['Food', 12000],
    ['Transport', 7000],
    ['Shopping', 15000],
    ['Bills', 7000],
    ['Entertainment', 4000],
    ['Travel', 12000],
    ['Healthcare', 5000],
    ['Other', 5000],
  ]
  const insertBudget = db.prepare(
    'INSERT INTO budgets (user_id, category, monthly_limit) VALUES (?, ?, ?)',
  )

  for (const [category, monthlyLimit] of budgets) {
    insertBudget.run(userId, category, monthlyLimit)
  }

  return { userId, transactionCount: rows.length, budgetCount: budgets.length }
})

const summary = seed()
const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
const transactionCount = db
  .prepare('SELECT COUNT(*) AS count FROM transactions WHERE user_id = ?')
  .get(summary.userId).count
const budgetCount = db
  .prepare('SELECT COUNT(*) AS count FROM budgets WHERE user_id = ?')
  .get(summary.userId).count

console.log('Database seed complete')
console.log(`Demo user: ${demoUserName} (id ${summary.userId})`)
console.log(`Users: ${userCount}`)
console.log(`Transactions: ${transactionCount}`)
console.log(`Budgets: ${budgetCount}`)

db.close()
