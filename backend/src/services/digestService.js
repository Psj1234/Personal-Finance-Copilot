import db from '../db/database.js'

const datePattern = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(date) {
  if (typeof date !== 'string' || !datePattern.test(date)) {
    return false
  }

  const parsedDate = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date
}

function calculateDaysInclusive(startDate, endDate) {
  const startMs = new Date(`${startDate}T00:00:00Z`).getTime()
  const endMs = new Date(`${endDate}T00:00:00Z`).getTime()
  return Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1
}

function roundAmount(value) {
  return Number(Number(value || 0).toFixed(2))
}

export function generateWeeklyDigest(options = {}) {
  const database = options.database || db
  const { startDate, endDate, userId } = options

  if (!startDate || typeof startDate !== 'string' || !isValidDate(startDate)) {
    const error = new Error('startDate must be a valid date in YYYY-MM-DD format')
    error.statusCode = 400
    throw error
  }

  if (!endDate || typeof endDate !== 'string' || !isValidDate(endDate)) {
    const error = new Error('endDate must be a valid date in YYYY-MM-DD format')
    error.statusCode = 400
    throw error
  }

  if (startDate > endDate) {
    const error = new Error('startDate must be earlier than or equal to endDate')
    error.statusCode = 400
    throw error
  }

  const parsedUserId = Number(userId)
  if (!userId || !Number.isInteger(parsedUserId) || parsedUserId < 1) {
    const error = new Error('A valid userId is required')
    error.statusCode = 400
    throw error
  }

  const user = database.prepare('SELECT id, name, currency FROM users WHERE id = ?').get(parsedUserId)

  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }

  const days = calculateDaysInclusive(startDate, endDate)

  const summaryRow = database
    .prepare(`
      SELECT
        ROUND(COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0), 2) AS totalIncome,
        ROUND(COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0), 2) AS totalExpenses,
        COUNT(*) AS transactionCount
      FROM transactions
      WHERE user_id = ? AND date >= ? AND date <= ?
    `)
    .get(user.id, startDate, endDate)

  const totalIncome = roundAmount(summaryRow.totalIncome)
  const totalExpenses = roundAmount(summaryRow.totalExpenses)
  const transactionCount = Number(summaryRow.transactionCount || 0)
  const netSavings = roundAmount(totalIncome - totalExpenses)

  const categoryRows = database
    .prepare(`
      SELECT
        COALESCE(category, 'Other') AS category,
        ROUND(SUM(amount), 2) AS amount
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
      GROUP BY COALESCE(category, 'Other')
      ORDER BY amount DESC, category ASC
    `)
    .all(user.id, startDate, endDate)

  const topCategories = categoryRows.map((row) => {
    const amount = roundAmount(row.amount)
    const percentageOfSpend = totalExpenses > 0
      ? roundAmount((amount / totalExpenses) * 100)
      : 0
    return {
      category: row.category,
      amount,
      percentageOfSpend,
    }
  })

  const largestExpenseRow = database
    .prepare(`
      SELECT
        merchant,
        ROUND(amount, 2) AS amount,
        COALESCE(category, 'Other') AS category,
        date
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
      ORDER BY amount DESC, date DESC, id DESC
      LIMIT 1
    `)
    .get(user.id, startDate, endDate)

  const largestExpense = largestExpenseRow
    ? {
        merchant: largestExpenseRow.merchant,
        amount: roundAmount(largestExpenseRow.amount),
        category: largestExpenseRow.category,
        date: largestExpenseRow.date,
      }
    : null

  const activeMonth = endDate.slice(0, 7)
  const budgets = database
    .prepare(`
      SELECT id, user_id, category, monthly_limit
      FROM budgets
      WHERE user_id = ?
      ORDER BY id ASC
    `)
    .all(user.id)

  const budgetAlerts = []
  for (const b of budgets) {
    const spending = database
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) AS spent
        FROM transactions
        WHERE user_id = ?
          AND category = ?
          AND type = 'expense'
          AND date LIKE ?
      `)
      .get(user.id, b.category, `${activeMonth}%`)

    const monthlyLimit = roundAmount(b.monthly_limit)
    const spent = roundAmount(spending.spent)
    const remaining = roundAmount(monthlyLimit - spent)
    const percentageUsed = monthlyLimit > 0
      ? Math.max(0, roundAmount((spent / monthlyLimit) * 100))
      : 0

    if (percentageUsed >= 80) {
      budgetAlerts.push({
        category: b.category,
        monthlyLimit,
        spent,
        remaining,
        percentageUsed,
        status: percentageUsed >= 100 ? 'exceeded' : 'warning',
        period: activeMonth,
      })
    }
  }

  budgetAlerts.sort((a, b) => b.percentageUsed - a.percentageUsed)

  return {
    period: {
      startDate,
      endDate,
      days,
    },
    user: {
      name: user.name,
      currency: user.currency || 'INR',
    },
    summary: {
      totalIncome,
      totalExpenses,
      netSavings,
      transactionCount,
    },
    largestExpense,
    topCategories,
    budgetAlerts,
  }
}
