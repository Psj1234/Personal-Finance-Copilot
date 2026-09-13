import db from '../db/database.js'
import { verifyToken } from '../services/authService.js'

export function authenticate(request, response, next) {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return response.status(401).json({ error: 'Authentication required' })
    }

    const token = authHeader.slice(7).trim()
    if (!token) {
      return response.status(401).json({ error: 'Authentication token missing' })
    }

    let payload
    try {
      payload = verifyToken(token)
    } catch {
      return response.status(401).json({ error: 'Invalid or expired token' })
    }

    if (!payload || !payload.userId) {
      return response.status(401).json({ error: 'Invalid token payload' })
    }

    const user = db
      .prepare(`
        SELECT id, name, email, currency, locale, created_at
        FROM users
        WHERE id = ?
      `)
      .get(payload.userId)

    if (!user) {
      return response.status(401).json({ error: 'User no longer exists' })
    }

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      locale: user.locale,
      createdAt: user.created_at,
    }

    next()
  } catch (error) {
    next(error)
  }
}

export default authenticate
