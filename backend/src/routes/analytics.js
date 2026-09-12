import express from 'express'
import db from '../db/database.js'

const router = express.Router()
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function getDemoUser() {
  return db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get()
}

function isValidDate(date) {
  if (!datePattern.test(date)) {
    return false
  }

  const parsedDate = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date
}

function getDateRange(request) {
  const { startDate, endDate } = request.query

  for (const [name, value] of Object.entries({ startDate, endDate })) {
    if (value !== undefined && (typeof value !== 'string' || !isValidDate(value))) {
      const error = new Error(`${name} must be a valid date in YYYY-MM-DD format`)
      error.statusCode = 400
      throw error
    }
  }

  if (startDate && endDate && startDate > endDate) {
    const error = new Error('startDate must be earlier than or equal to endDate')
    error.statusCode = 400
    throw error
  }

  return { startDate, endDate }
}

function getDateConditions(userId, startDate, endDate) {
  const conditions = ['user_id = ?']
  const parameters = [userId]

  if (startDate) {
    conditions.push('date >= ?')
    parameters.push(startDate)
  }
  if (endDate) {
    conditions.push('date <= ?')
    parameters.push(endDate)
  }

  return { whereClause: conditions.join(' AND '), parameters }
}

function toNumber(value) {
  return Number(value || 0)
}

router.get('/summary', (request, response, next) => {
  try {
    const { startDate, endDate } = getDateRange(request)
    const demoUser = getDemoUser()

    if (!demoUser) {
      return response.status(404).json({ error: 'Demo user not found' })
    }

    const { whereClause, parameters } = getDateConditions(demoUser.id, startDate, endDate)
    const summary = db
      .prepare(`
        SELECT
          ROUND(COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0), 2) AS totalIncome,
          ROUND(COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0), 2) AS totalExpenses
        FROM transactions
        WHERE ${whereClause}
      `)
      .get(...parameters)
    const categoryBreakdown = db
      .prepare(`
        SELECT
          COALESCE(category, 'Other') AS category,
          ROUND(SUM(amount), 2) AS amount
        FROM transactions
        WHERE ${whereClause} AND type = 'expense'
        GROUP BY COALESCE(category, 'Other')
        ORDER BY amount DESC, category ASC
      `)
      .all(...parameters)
    const monthlyTrend = db
      .prepare(`
        SELECT
          strftime('%Y-%m', date) AS month,
          ROUND(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 2) AS income,
          ROUND(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 2) AS expenses
        FROM transactions
        WHERE ${whereClause}
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month ASC
      `)
      .all(...parameters)
    const recentTransactions = db
      .prepare(`
        SELECT id, date, merchant, amount, type, category, raw_description
        FROM transactions
        WHERE ${whereClause}
        ORDER BY date DESC, id DESC
        LIMIT 5
      `)
      .all(...parameters)

    const totalIncome = toNumber(summary.totalIncome)
    const totalExpenses = toNumber(summary.totalExpenses)

    response.json({
      summary: {
        totalIncome,
        totalExpenses,
        balance: Number((totalIncome - totalExpenses).toFixed(2)),
      },
      categoryBreakdown,
      monthlyTrend,
      recentTransactions,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/forecast', (request, response, next) => {
  try {
    const demoUser = getDemoUser()
    if (!demoUser) {
      return response.status(404).json({ error: 'Demo user not found' })
    }

    const monthlyExpenses = db
      .prepare(`
        SELECT
          strftime('%Y-%m', date) AS month,
          SUM(amount) AS expenses
        FROM transactions
        WHERE user_id = ? AND type = 'expense'
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month DESC
        LIMIT 3
      `)
      .all(demoUser.id)
    const averageMonthlyExpense = monthlyExpenses.length
      ? monthlyExpenses.reduce((total, month) => total + month.expenses, 0) / monthlyExpenses.length
      : 0

    response.json({
      projectionType: 'simple_average',
      description: 'Simple projection based on the average expenses from the last 3 available months. This is not a machine-learning forecast.',
      monthsUsed: monthlyExpenses.map((month) => month.month).sort(),
      projectedNextMonthExpense: Number(averageMonthlyExpense.toFixed(2)),
    })
  } catch (error) {
    next(error)
  }
})

export default router
