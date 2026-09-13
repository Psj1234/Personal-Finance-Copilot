import express from 'express'
import db from '../db/database.js'
import { resolveCategory } from '../services/categorizer.js'

const router = express.Router()
const defaultPage = 1
const defaultLimit = 20
const maxLimit = 100
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/
const transactionTypes = new Set(['income', 'expense'])


function isValidDate(date) {
  if (!datePattern.test(date)) {
    return false
  }

  const parsedDate = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date
}

function parsePositiveInteger(value, fallback, fieldName) {
  if (value === undefined) {
    return fallback
  }

  const parsedValue = Number(value)
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    const error = new Error(`${fieldName} must be a positive integer`)
    error.statusCode = 400
    throw error
  }

  return parsedValue
}

function validateTransactionInput(body) {
  const requiredFields = ['date', 'merchant', 'amount', 'type']
  const missingFields = requiredFields.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === '',
  )

  if (missingFields.length > 0) {
    const error = new Error(`Missing required fields: ${missingFields.join(', ')}`)
    error.statusCode = 400
    throw error
  }

  if (typeof body.date !== 'string' || !isValidDate(body.date)) {
    const error = new Error('date must be a valid date in YYYY-MM-DD format')
    error.statusCode = 400
    throw error
  }

  if (typeof body.merchant !== 'string' || body.merchant.trim().length === 0) {
    const error = new Error('merchant must be a non-empty string')
    error.statusCode = 400
    throw error
  }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error('amount must be a positive number')
    error.statusCode = 400
    throw error
  }

  if (typeof body.type !== 'string' || !transactionTypes.has(body.type)) {
    const error = new Error('type must be either income or expense')
    error.statusCode = 400
    throw error
  }

  if (body.category !== undefined && body.category !== null && typeof body.category !== 'string') {
    const error = new Error('category must be a string when supplied')
    error.statusCode = 400
    throw error
  }

  if (
    body.raw_description !== undefined &&
    body.raw_description !== null &&
    typeof body.raw_description !== 'string'
  ) {
    const error = new Error('raw_description must be a string when supplied')
    error.statusCode = 400
    throw error
  }

  return {
    date: body.date,
    merchant: body.merchant.trim(),
    amount,
    type: body.type,
    category: body.category?.trim() || null,
    rawDescription: body.raw_description?.trim() || null,
  }
}

router.get('/', (request, response, next) => {
  try {
    const { month, category, type } = request.query
    const page = parsePositiveInteger(request.query.page, defaultPage, 'page')
    const limit = Math.min(parsePositiveInteger(request.query.limit, defaultLimit, 'limit'), maxLimit)

    if (month !== undefined && (typeof month !== 'string' || !monthPattern.test(month))) {
      const error = new Error('month must use YYYY-MM format')
      error.statusCode = 400
      throw error
    }

    if (type !== undefined && (typeof type !== 'string' || !transactionTypes.has(type))) {
      const error = new Error('type must be either income or expense')
      error.statusCode = 400
      throw error
    }

    if (category !== undefined && (typeof category !== 'string' || category.trim() === '')) {
      const error = new Error('category must be a non-empty string')
      error.statusCode = 400
      throw error
    }

    const conditions = ['user_id = ?']
    const parameters = [request.user.id]

    if (month) {
      conditions.push('date LIKE ?')
      parameters.push(`${month}%`)
    }
    if (category) {
      conditions.push('category = ?')
      parameters.push(category.trim())
    }
    if (type) {
      conditions.push('type = ?')
      parameters.push(type)
    }

    const whereClause = conditions.join(' AND ')
    const total = db
      .prepare(`SELECT COUNT(*) AS count FROM transactions WHERE ${whereClause}`)
      .get(...parameters).count
    const offset = (page - 1) * limit
    const transactions = db
      .prepare(`
        SELECT id, user_id, date, merchant, amount, type, category, raw_description
        FROM transactions
        WHERE ${whereClause}
        ORDER BY date DESC, id DESC
        LIMIT ? OFFSET ?
      `)
      .all(...parameters, limit, offset)

    response.json({
      transactions,
      pagination: { page, limit, total },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', (request, response, next) => {
  try {
    const id = Number(request.params.id)
    if (!Number.isInteger(id) || id < 1) {
      return response.status(404).json({ error: 'Transaction not found' })
    }

    const transaction = db
      .prepare(`
        SELECT id, user_id, date, merchant, amount, type, category, raw_description
        FROM transactions
        WHERE id = ? AND user_id = ?
      `)
      .get(id, request.user.id)

    if (!transaction) {
      return response.status(404).json({ error: 'Transaction not found' })
    }

    response.json({ transaction })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (request, response, next) => {
  try {
    const transaction = validateTransactionInput(request.body)
    const category = await resolveCategory(transaction)
    const result = db
      .prepare(`
        INSERT INTO transactions
          (user_id, date, merchant, amount, type, category, raw_description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        request.user.id,
        transaction.date,
        transaction.merchant,
        transaction.amount,
        transaction.type,
        category,
        transaction.rawDescription,
      )
    const createdTransaction = db
      .prepare(`
        SELECT id, user_id, date, merchant, amount, type, category, raw_description
        FROM transactions
        WHERE id = ? AND user_id = ?
      `)
      .get(result.lastInsertRowid, request.user.id)

    response.status(201).json({ transaction: createdTransaction })
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (request, response, next) => {
  try {
    const id = Number(request.params.id)
    if (!Number.isInteger(id) || id < 1) {
      return response.status(404).json({ error: 'Transaction not found' })
    }

    const existing = db
      .prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?')
      .get(id, request.user.id)

    if (!existing) {
      return response.status(404).json({ error: 'Transaction not found' })
    }

    const transaction = validateTransactionInput(request.body)
    const category = await resolveCategory(transaction)

    db.prepare(`
      UPDATE transactions
      SET date = ?, merchant = ?, amount = ?, type = ?, category = ?, raw_description = ?
      WHERE id = ? AND user_id = ?
    `).run(
      transaction.date,
      transaction.merchant,
      transaction.amount,
      transaction.type,
      category,
      transaction.rawDescription,
      id,
      request.user.id,
    )

    const updatedTransaction = db
      .prepare(`
        SELECT id, user_id, date, merchant, amount, type, category, raw_description
        FROM transactions
        WHERE id = ? AND user_id = ?
      `)
      .get(id, request.user.id)

    response.json({ transaction: updatedTransaction })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', (request, response, next) => {
  try {
    const id = Number(request.params.id)
    if (!Number.isInteger(id) || id < 1) {
      return response.status(404).json({ error: 'Transaction not found' })
    }

    const result = db
      .prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
      .run(id, request.user.id)

    if (result.changes === 0) {
      return response.status(404).json({ error: 'Transaction not found' })
    }

    response.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router
