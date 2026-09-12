import express from 'express'
import db from '../db/database.js'
import { allowedCategories } from '../services/groqService.js'

const allowedCategorySet = new Set(allowedCategories)
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function roundAmount(value) {
  return Number(Number(value || 0).toFixed(2))
}

function getDemoUser(database) {
  return database.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get()
}

function getCurrentMonth(currentDate) {
  const date = typeof currentDate === 'function' ? currentDate() : currentDate
  const normalizedDate = date instanceof Date ? date.toISOString().slice(0, 10) : date

  if (typeof normalizedDate !== 'string' || !datePattern.test(normalizedDate)) {
    throw new Error('Current date must use YYYY-MM-DD format')
  }

  return normalizedDate.slice(0, 7)
}

function parseBudgetId(value) {
  if (!/^\d+$/.test(value)) {
    const error = new Error('Budget id must be a positive integer')
    error.statusCode = 400
    throw error
  }

  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) {
    const error = new Error('Budget id must be a positive integer')
    error.statusCode = 400
    throw error
  }

  return id
}

function parseMonthlyLimit(value) {
  if (value === undefined || value === null || value === '') {
    const error = new Error('monthlyLimit is required')
    error.statusCode = 400
    throw error
  }

  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') {
    const error = new Error('monthlyLimit must be numeric')
    error.statusCode = 400
    throw error
  }

  const monthlyLimit = Number(value)
  if (!Number.isFinite(monthlyLimit)) {
    const error = new Error('monthlyLimit must be finite')
    error.statusCode = 400
    throw error
  }
  if (monthlyLimit <= 0) {
    const error = new Error('monthlyLimit must be greater than 0')
    error.statusCode = 400
    throw error
  }

  return monthlyLimit
}

function parseCategory(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    const error = new Error('category is required')
    error.statusCode = 400
    throw error
  }

  const category = value.trim()
  if (!allowedCategorySet.has(category)) {
    const error = new Error('category must be one of the allowed finance categories')
    error.statusCode = 400
    throw error
  }

  return category
}

function getBudget(database, userId, budgetId) {
  return database
    .prepare('SELECT id, user_id, category, monthly_limit FROM budgets WHERE id = ? AND user_id = ?')
    .get(budgetId, userId)
}

function calculateBudget(database, budget, currentMonth) {
  const spending = database
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) AS spent
      FROM transactions
      WHERE user_id = ?
        AND category = ?
        AND type = 'expense'
        AND date LIKE ?
    `)
    .get(budget.user_id, budget.category, `${currentMonth}%`)
  const monthlyLimit = roundAmount(budget.monthly_limit)
  const spent = roundAmount(spending.spent)

  return {
    id: budget.id,
    category: budget.category,
    monthlyLimit,
    spent,
    remaining: roundAmount(monthlyLimit - spent),
    percentageUsed: Math.max(0, roundAmount((spent / monthlyLimit) * 100)),
  }
}

function createBudgetsRouter(options = {}) {
  const database = options.db || db
  const currentDate = options.currentDate || (() => new Date())
  const router = express.Router()

  function getBudgetWithSpending(budget) {
    return calculateBudget(database, budget, getCurrentMonth(currentDate))
  }

  router.get('/', (request, response, next) => {
    try {
      const demoUser = getDemoUser(database)
      if (!demoUser) {
        return response.status(404).json({ error: 'Demo user not found' })
      }

      const budgets = database
        .prepare(`
          SELECT id, user_id, category, monthly_limit
          FROM budgets
          WHERE user_id = ?
          ORDER BY id ASC
        `)
        .all(demoUser.id)
        .map(getBudgetWithSpending)

      response.json({ budgets })
    } catch (error) {
      next(error)
    }
  })

  router.post('/', (request, response, next) => {
    try {
      const demoUser = getDemoUser(database)
      if (!demoUser) {
        return response.status(404).json({ error: 'Demo user not found' })
      }

      const category = parseCategory(request.body?.category)
      const monthlyLimit = parseMonthlyLimit(request.body?.monthlyLimit)
      const existingBudget = database
        .prepare('SELECT id FROM budgets WHERE user_id = ? AND category = ?')
        .get(demoUser.id, category)

      if (existingBudget) {
        return response.status(409).json({ error: 'A budget for this category already exists' })
      }

      const result = database
        .prepare('INSERT INTO budgets (user_id, category, monthly_limit) VALUES (?, ?, ?)')
        .run(demoUser.id, category, monthlyLimit)
      const createdBudget = getBudget(database, demoUser.id, result.lastInsertRowid)

      response.status(201).json({ budget: getBudgetWithSpending(createdBudget) })
    } catch (error) {
      next(error)
    }
  })

  router.put('/:id', (request, response, next) => {
    try {
      const demoUser = getDemoUser(database)
      if (!demoUser) {
        return response.status(404).json({ error: 'Demo user not found' })
      }

      const budgetId = parseBudgetId(request.params.id)
      const monthlyLimit = parseMonthlyLimit(request.body?.monthlyLimit)
      const existingBudget = getBudget(database, demoUser.id, budgetId)
      if (!existingBudget) {
        return response.status(404).json({ error: 'Budget not found' })
      }

      database
        .prepare('UPDATE budgets SET monthly_limit = ? WHERE id = ? AND user_id = ?')
        .run(monthlyLimit, budgetId, demoUser.id)
      const updatedBudget = getBudget(database, demoUser.id, budgetId)

      response.json({ budget: getBudgetWithSpending(updatedBudget) })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:id', (request, response, next) => {
    try {
      const demoUser = getDemoUser(database)
      if (!demoUser) {
        return response.status(404).json({ error: 'Demo user not found' })
      }

      const budgetId = parseBudgetId(request.params.id)
      const result = database
        .prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?')
        .run(budgetId, demoUser.id)
      if (result.changes === 0) {
        return response.status(404).json({ error: 'Budget not found' })
      }

      response.status(204).send()
    } catch (error) {
      next(error)
    }
  })

  return router
}

export { createBudgetsRouter, getCurrentMonth }
export default createBudgetsRouter()
