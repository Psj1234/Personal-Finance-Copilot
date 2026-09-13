import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import Database from 'better-sqlite3'
import { createAuthRouter } from './auth.js'
import {
  createToken,
  hashPassword,
  verifyPassword,
  verifyToken,
} from '../services/authService.js'

let assertionCount = 0

function testAssert(condition, message) {
  assert.ok(condition, message)
  assertionCount++
}

function testEqual(actual, expected, message) {
  assert.equal(actual, expected, message)
  assertionCount++
}

// 1. Direct Unit Tests for authService
console.log('Running authService unit tests...')

// Password hashing
const rawPassword = 'SecretPassword123!'
const hashedPassword = hashPassword(rawPassword)
testAssert(typeof hashedPassword === 'string', 'Hashed password is a string')
testAssert(hashedPassword !== rawPassword, 'Password is not stored in plaintext')
testAssert(hashedPassword.includes(':'), 'Hashed password contains salt separator')
testAssert(verifyPassword(rawPassword, hashedPassword), 'verifyPassword returns true for correct password')
testAssert(!verifyPassword('WrongPassword', hashedPassword), 'verifyPassword returns false for wrong password')
testAssert(!verifyPassword('', hashedPassword), 'verifyPassword returns false for empty password')
testAssert(!verifyPassword(rawPassword, 'invalid:hash'), 'verifyPassword returns false for corrupted hash')

// Token creation and verification
const samplePayload = { userId: 42, email: 'test@domain.com' }
const token = createToken(samplePayload, 60 * 1000)
testAssert(typeof token === 'string', 'Token is a string')
testEqual(token.split('.').length, 3, 'Token has standard 3-part structure')

const decoded = verifyToken(token)
testEqual(decoded.userId, 42, 'Decoded token contains userId')
testEqual(decoded.email, 'test@domain.com', 'Decoded token contains email')
testAssert(typeof decoded.exp === 'number', 'Decoded token has expiration timestamp')

// Tampered token rejection
const [header, payload, sig] = token.split('.')
const tamperedToken = `${header}.${payload}.${sig.slice(0, -2)}xx`
assert.throws(
  () => verifyToken(tamperedToken),
  (err) => err.statusCode === 401,
  'Tampered token signature is rejected with 401',
)
assertionCount++

// Expired token rejection
const expiredToken = createToken(samplePayload, -1000) // already expired
assert.throws(
  () => verifyToken(expiredToken),
  (err) => err.statusCode === 401 && err.message === 'Token has expired',
  'Expired token is rejected with 401',
)
assertionCount++

// 2. Integration Tests with in-memory SQLite DB
console.log('Running auth route integration tests...')

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(currentDirectory, '../db/schema.sql')
const testDb = new Database(':memory:')
testDb.pragma('foreign_keys = ON')
testDb.exec(fs.readFileSync(schemaPath, 'utf8'))

const app = express()
app.use(express.json())
app.use('/api/auth', createAuthRouter({ db: testDb }))

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
const baseUrl = `http://localhost:${port}/api/auth`

async function post(endpoint, body) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return {
    status: response.status,
    body: await response.json(),
  }
}

async function get(endpoint, tokenHeader = '') {
  const headers = tokenHeader ? { Authorization: `Bearer ${tokenHeader}` } : {}
  const response = await fetch(`${baseUrl}${endpoint}`, { headers })
  return {
    status: response.status,
    body: await response.json(),
  }
}

try {
  // 1. Validation error on missing fields in registration
  const missingName = await post('/register', { email: 'user@test.com', password: 'password123' })
  testEqual(missingName.status, 400, 'Registration rejects missing name with 400')

  const invalidEmail = await post('/register', { name: 'Alice', email: 'not-an-email', password: 'password123' })
  testEqual(invalidEmail.status, 400, 'Registration rejects invalid email with 400')

  const shortPassword = await post('/register', { name: 'Alice', email: 'alice@test.com', password: '123' })
  testEqual(shortPassword.status, 400, 'Registration rejects short password with 400')

  // 2. Successful registration
  const regSuccess = await post('/register', {
    name: 'Alice Johnson',
    email: 'Alice.Johnson@Test.COM',
    password: 'SecurePassword123!',
  })
  testEqual(regSuccess.status, 201, 'Successful registration returns 201')
  testEqual(regSuccess.body.user.name, 'Alice Johnson', 'Returns registered name')
  testEqual(regSuccess.body.user.email, 'alice.johnson@test.com', 'Returns normalized lowercase email')
  testEqual(regSuccess.body.user.password_hash, undefined, 'Registration response NEVER exposes password_hash')
  testAssert(typeof regSuccess.body.token === 'string', 'Registration returns JWT auth token')

  // 3. Verify password is stored hashed, never plaintext in DB
  const dbUser = testDb.prepare('SELECT * FROM users WHERE email = ?').get('alice.johnson@test.com')
  testAssert(dbUser !== undefined, 'User row exists in database')
  testAssert(dbUser.password_hash !== 'SecurePassword123!', 'Database never stores plaintext password')
  testAssert(verifyPassword('SecurePassword123!', dbUser.password_hash), 'Stored hash verifies with password')

  // 4. Duplicate email rejection (case-insensitive)
  const regDuplicate = await post('/register', {
    name: 'Another Alice',
    email: 'alice.johnson@test.com',
    password: 'DifferentPassword123',
  })
  testEqual(regDuplicate.status, 409, 'Rejects duplicate email with 409 Conflict')
  testEqual(regDuplicate.body.error, 'Email is already registered', 'Provides clear conflict error message')

  // 5. Login validation errors
  const missingLoginFields = await post('/login', {})
  testEqual(missingLoginFields.status, 400, 'Login rejects empty body with 400')

  // 6. Unknown email rejection
  const loginUnknown = await post('/login', {
    email: 'nonexistent@test.com',
    password: 'password123',
  })
  testEqual(loginUnknown.status, 401, 'Login rejects unknown email with 401')
  testEqual(loginUnknown.body.error, 'Invalid email or password', 'Provides generic credential error')

  // 7. Incorrect password rejection
  const loginWrongPass = await post('/login', {
    email: 'alice.johnson@test.com',
    password: 'WrongPassword999',
  })
  testEqual(loginWrongPass.status, 401, 'Login rejects wrong password with 401')

  // 8. Successful login
  const loginSuccess = await post('/login', {
    email: 'ALICE.JOHNSON@TEST.COM', // test case-insensitivity
    password: 'SecurePassword123!',
  })
  testEqual(loginSuccess.status, 200, 'Successful login returns 200')
  testEqual(loginSuccess.body.user.name, 'Alice Johnson', 'Returns user name')
  testEqual(loginSuccess.body.user.password_hash, undefined, 'Login response NEVER exposes password_hash')
  testAssert(typeof loginSuccess.body.token === 'string', 'Login returns valid token')

  // 9. GET /me tests
  // Missing auth header
  const meNoHeader = await get('/me')
  testEqual(meNoHeader.status, 401, '/me returns 401 without auth header')

  // Invalid token
  const meBadToken = await get('/me', 'invalid.jwt.token')
  testEqual(meBadToken.status, 401, '/me returns 401 for invalid token')

  // Expired token
  const expiredAuthToken = createToken({ userId: dbUser.id, email: dbUser.email }, -5000)
  const meExpired = await get('/me', expiredAuthToken)
  testEqual(meExpired.status, 401, '/me returns 401 for expired token')

  // Valid token
  const meSuccess = await get('/me', loginSuccess.body.token)
  testEqual(meSuccess.status, 200, '/me returns 200 for valid token')
  testEqual(meSuccess.body.user.id, dbUser.id, '/me returns matching user id')
  testEqual(meSuccess.body.user.email, 'alice.johnson@test.com', '/me returns matching user email')
  testEqual(meSuccess.body.user.password_hash, undefined, '/me NEVER exposes password_hash')

  console.log(`\x1b[32mAll auth tests passed successfully: ${assertionCount} assertions\x1b[0m`)
} finally {
  server.close()
  testDb.close()
}
