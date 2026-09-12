import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const backendDirectory = path.resolve(currentDirectory, '../..')
const dataDirectory = path.join(backendDirectory, 'data')
const databasePath = path.join(dataDirectory, 'finance.db')
const schemaPath = path.join(currentDirectory, 'schema.sql')

fs.mkdirSync(dataDirectory, { recursive: true })

const db = new Database(databasePath)
db.pragma('foreign_keys = ON')
db.exec(fs.readFileSync(schemaPath, 'utf8'))

export { databasePath }
export default db
