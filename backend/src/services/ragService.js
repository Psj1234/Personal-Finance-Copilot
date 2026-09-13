import db from '../db/database.js'

const defaultLimit = 50
const maxLimit = 50
const monthNames = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]
const categoryNames = [
  'food',
  'transport',
  'groceries',
  'shopping',
  'entertainment',
  'bills',
  'healthcare',
  'education',
  'travel',
  'rent',
  'salary',
  'other',
]
const ignoredKeywords = new Set([
  'a',
  'all',
  'amount',
  'an',
  'and',
  'any',
  'at',
  'did',
  'do',
  'expense',
  'expenses',
  'for',
  'from',
  'how',
  'in',
  'income',
  'is',
  'last',
  'me',
  'merchant',
  'month',
  'much',
  'my',
  'of',
  'on',
  'show',
  'spend',
  'spending',
  'spent',
  'the',
  'this',
  'today',
  'transaction',
  'transactions',
  'was',
  'what',
  'were',
  'with',
  'year',
])

function normalizeQuestion(question) {
  return String(question || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function getMonthRange(year, monthIndex) {
  const monthStart = new Date(Date.UTC(year, monthIndex, 1))
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0))
  return { startDate: formatDate(monthStart), endDate: formatDate(monthEnd) }
}

function getDateFilters(normalizedQuestion, currentDate) {
  const today = new Date(`${currentDate}T00:00:00Z`)
  if (Number.isNaN(today.getTime())) {
    throw new Error('currentDate must be a valid date in YYYY-MM-DD format')
  }

  const currentYear = today.getUTCFullYear()
  const currentMonth = today.getUTCMonth()
  if (normalizedQuestion.includes('today')) {
    return { dateLabel: 'today', startDate: currentDate, endDate: currentDate }
  }
  if (normalizedQuestion.includes('this month')) {
    return { dateLabel: 'this month', ...getMonthRange(currentYear, currentMonth), endDate: currentDate }
  }
  if (normalizedQuestion.includes('last month')) {
    return { dateLabel: 'last month', ...getMonthRange(currentYear, currentMonth - 1) }
  }
  if (normalizedQuestion.includes('this year')) {
    return { dateLabel: 'this year', startDate: `${currentYear}-01-01`, endDate: currentDate }
  }

  const monthIndex = monthNames.findIndex((month) => normalizedQuestion.includes(month))
  if (monthIndex >= 0) {
    const yearMatch = normalizedQuestion.match(/\b(20\d{2})\b/)
    if (yearMatch) {
      return { dateLabel: monthNames[monthIndex], ...getMonthRange(Number(yearMatch[1]), monthIndex) }
    }

    return { dateLabel: monthNames[monthIndex], monthNumber: String(monthIndex + 1).padStart(2, '0') }
  }

  return {}
}

function getCategory(normalizedQuestion) {
  return categoryNames.find((category) => normalizedQuestion.includes(category))
}

function getKeywordTerms(normalizedQuestion, category) {
  const dateWords = new Set([
    ...monthNames,
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
    'today',
  ])

  return normalizedQuestion
    .split(' ')
    .filter((word) => word.length > 1)
    .filter((word) => !ignoredKeywords.has(word))
    .filter((word) => !dateWords.has(word))
    .filter((word) => !category || word !== category)
    .filter((word) => !/^20\d{2}$/.test(word))
}

function parseLimit(limit) {
  if (limit === undefined) {
    return defaultLimit
  }

  const parsedLimit = Number(limit)
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    throw new Error('limit must be a positive integer')
  }

  return Math.min(parsedLimit, maxLimit)
}

function retrieveTransactions(question, options = {}) {
  const opts = typeof options === 'number' ? { userId: options } : (options || {})
  const normalizedQuestion = normalizeQuestion(question)
  const limit = parseLimit(opts.limit)
  const currentDate = opts.currentDate || formatDate(new Date())
  const dateFilters = getDateFilters(normalizedQuestion, currentDate)
  const category = getCategory(normalizedQuestion)
  const keywordTerms = getKeywordTerms(normalizedQuestion, category)

  const rawUserId = opts.userId
  const parsedUserId = Number(rawUserId)

  if (!rawUserId || !Number.isInteger(parsedUserId) || parsedUserId < 1) {
    return {
      question: String(question || ''),
      filters: {
        category: category ? capitalize(category) : null,
        date: dateFilters.dateLabel || null,
        startDate: dateFilters.startDate || null,
        endDate: dateFilters.endDate || null,
        keywords: keywordTerms,
        limit,
      },
      transactions: [],
      count: 0,
    }
  }

  const conditions = ['user_id = ?']
  const parameters = [parsedUserId]
  if (category) {
    conditions.push('LOWER(category) = ?')
    parameters.push(category)
  }
  if (dateFilters.startDate) {
    conditions.push('date >= ?')
    parameters.push(dateFilters.startDate)
  }
  if (dateFilters.endDate) {
    conditions.push('date <= ?')
    parameters.push(dateFilters.endDate)
  }
  if (dateFilters.monthNumber) {
    conditions.push("strftime('%m', date) = ?")
    parameters.push(dateFilters.monthNumber)
  }
  for (const keyword of keywordTerms) {
    conditions.push('(LOWER(merchant) LIKE ? OR LOWER(COALESCE(raw_description, \'\')) LIKE ?)')
    parameters.push(`%${keyword}%`, `%${keyword}%`)
  }

  const whereClause = conditions.join(' AND ')
  const transactions = db
    .prepare(`
      SELECT id, user_id, date, merchant, amount, type, category, raw_description
      FROM transactions
      WHERE ${whereClause}
      ORDER BY date DESC, id DESC
      LIMIT ?
    `)
    .all(...parameters, limit)

  return {
    question: String(question || ''),
    filters: {
      category: category ? capitalize(category) : null,
      date: dateFilters.dateLabel || null,
      startDate: dateFilters.startDate || null,
      endDate: dateFilters.endDate || null,
      keywords: keywordTerms,
      limit,
    },
    transactions,
    count: transactions.length,
  }
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export { normalizeQuestion, retrieveTransactions }
export default retrieveTransactions
