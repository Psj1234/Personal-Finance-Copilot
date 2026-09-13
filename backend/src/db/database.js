import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { hashPassword } from '../services/authService.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const backendDirectory = path.resolve(currentDirectory, '../..')
const dataDirectory = path.join(backendDirectory, 'data')
const databasePath = path.join(dataDirectory, 'finance.db')
const schemaPath = path.join(currentDirectory, 'schema.sql')

fs.mkdirSync(dataDirectory, { recursive: true })

export function applyMigrations(database) {
  // 1. Check users table columns
  const userColumns = database.pragma('table_info(users)')
  const columnNames = new Set(userColumns.map((col) => col.name))

  if (!columnNames.has('email')) {
    database.exec('ALTER TABLE users ADD COLUMN email TEXT')
  }
  if (!columnNames.has('password_hash')) {
    database.exec('ALTER TABLE users ADD COLUMN password_hash TEXT')
  }
  if (!columnNames.has('created_at')) {
    database.exec('ALTER TABLE users ADD COLUMN created_at TEXT')
    database.exec("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL")
  }

  // If any existing users have null email or password_hash, backfill them safely
  const usersMissingAuth = database
    .prepare('SELECT id, name FROM users WHERE email IS NULL OR password_hash IS NULL')
    .all()

  if (usersMissingAuth.length > 0) {
    const defaultHash = hashPassword('password123')
    const updateStmt = database.prepare(
      'UPDATE users SET email = ?, password_hash = ? WHERE id = ?',
    )
    for (const u of usersMissingAuth) {
      const email = `${u.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`
      updateStmt.run(email, defaultHash, u.id)
    }
  }

  // Ensure unique index on users(email)
  database.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)')

  // 2. Ensure unique index on budgets(user_id, category)
  const budgetIndexes = database.pragma('index_list(budgets)')
  const existingCatIndex = budgetIndexes.find((idx) => idx.name === 'idx_budgets_user_category')
  if (existingCatIndex && !existingCatIndex.unique) {
    database.exec('DROP INDEX IF EXISTS idx_budgets_user_category')
  }
  database.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_category ON budgets(user_id, category)',
  )
}

const db = new Database(databasePath)
db.pragma('foreign_keys = ON')
db.exec(fs.readFileSync(schemaPath, 'utf8'))
applyMigrations(db)

export { databasePath }
export default db
