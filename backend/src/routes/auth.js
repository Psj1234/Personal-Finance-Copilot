import express from 'express'
import db from '../db/database.js'
import { createToken, hashPassword, verifyPassword, verifyToken } from '../services/authService.js'

function normalizeEmail(email) {
  if (typeof email !== 'string') return ''
  return email.trim().toLowerCase()
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function createAuthRouter(options = {}) {
  const database = options.db || db
  const router = express.Router()

  router.post('/register', (request, response, next) => {
    try {
      const { name, email, password } = request.body || {}

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        const error = new Error('name is required and must be a non-empty string')
        error.statusCode = 400
        throw error
      }

      const normalizedEmail = normalizeEmail(email)
      if (!isValidEmail(normalizedEmail)) {
        const error = new Error('email must be a valid email address')
        error.statusCode = 400
        throw error
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        const error = new Error('password must be at least 6 characters long')
        error.statusCode = 400
        throw error
      }

      const existingUser = database
        .prepare('SELECT id FROM users WHERE email = ?')
        .get(normalizedEmail)

      if (existingUser) {
        return response.status(409).json({ error: 'Email is already registered' })
      }

      const hashedPassword = hashPassword(password)
      const result = database
        .prepare(`
          INSERT INTO users (name, email, password_hash, currency, locale)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(name.trim(), normalizedEmail, hashedPassword, 'INR', 'en')

      const user = database
        .prepare(`
          SELECT id, name, email, currency, locale, created_at
          FROM users
          WHERE id = ?
        `)
        .get(result.lastInsertRowid)

      const token = createToken({ userId: user.id, email: user.email })

      response.status(201).json({ user, token })
    } catch (error) {
      next(error)
    }
  })

  router.post('/login', (request, response, next) => {
    try {
      const { email, password } = request.body || {}
      const normalizedEmail = normalizeEmail(email)

      if (!normalizedEmail || !password || typeof password !== 'string') {
        const error = new Error('Email and password are required')
        error.statusCode = 400
        throw error
      }

      const user = database
        .prepare(`
          SELECT id, name, email, password_hash, currency, locale, created_at
          FROM users
          WHERE email = ?
        `)
        .get(normalizedEmail)

      if (!user || !verifyPassword(password, user.password_hash)) {
        return response.status(401).json({ error: 'Invalid email or password' })
      }

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        locale: user.locale,
        created_at: user.created_at,
      }
      const token = createToken({ userId: safeUser.id, email: safeUser.email })

      response.json({ user: safeUser, token })
    } catch (error) {
      next(error)
    }
  })

  router.get('/me', (request, response, next) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response.status(401).json({ error: 'Authentication required' })
      }

      const token = authHeader.slice(7).trim()
      let payload
      try {
        payload = verifyToken(token)
      } catch {
        return response.status(401).json({ error: 'Invalid or expired token' })
      }

      const user = database
        .prepare(`
          SELECT id, name, email, currency, locale, created_at
          FROM users
          WHERE id = ?
        `)
        .get(payload.userId)

      if (!user) {
        return response.status(404).json({ error: 'User not found' })
      }

      response.json({ user })
    } catch (error) {
      next(error)
    }
  })

  return router
}

export { createAuthRouter }
export default createAuthRouter()
