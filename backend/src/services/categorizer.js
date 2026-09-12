import { categorizeWithGroq, isAllowedCategory } from './groqService.js'

const categoryRules = [
  {
    category: 'Salary',
    keywords: ['salary', 'payroll', 'acme technologies'],
  },
  {
    category: 'Food',
    keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'food', 'dominos', 'mcdonald'],
  },
  {
    category: 'Transport',
    keywords: ['uber', 'ola', 'rapido', 'metro', 'bus', 'taxi', 'cab', 'fuel', 'petrol', 'parking'],
  },
  {
    category: 'Groceries',
    keywords: ['bigbasket', 'dmart', 'zepto', 'blinkit', 'grocery', 'groceries', 'supermarket'],
  },
  {
    category: 'Shopping',
    keywords: ['amazon', 'flipkart', 'myntra', 'meesho', 'shopping', 'retail'],
  },
  {
    category: 'Entertainment',
    keywords: ['netflix', 'spotify', 'bookmyshow', 'movie', 'cinema', 'hotstar', 'prime video'],
  },
  {
    category: 'Bills',
    keywords: ['electricity', 'bescom', 'water board', 'internet', 'airtel', 'jio', 'broadband', 'recharge', 'utility'],
  },
  {
    category: 'Healthcare',
    keywords: ['apollo pharmacy', 'pharmacy', 'practo', 'hospital', 'clinic', 'doctor', 'medical'],
  },
  {
    category: 'Education',
    keywords: ['school', 'college', 'course', 'udemy', 'coursera', 'books', 'tuition'],
  },
  {
    category: 'Travel',
    keywords: ['indigo', 'air india', 'flight', 'hotel', 'airbnb', 'makemytrip', 'goibibo', 'travel'],
  },
  {
    category: 'Rent',
    keywords: ['rent', 'landlord', 'housing'],
  },
]

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function categorizeMerchant(merchantName) {
  const normalizedMerchant = normalizeText(merchantName)

  if (!normalizedMerchant) {
    return 'Other'
  }

  const matchingRule = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => normalizedMerchant.includes(normalizeText(keyword))),
  )

  return matchingRule?.category || 'Other'
}

async function categorizeTransaction(transactionOrMerchant, groqCategorizer = categorizeWithGroq) {
  const transaction = typeof transactionOrMerchant === 'string'
    ? { merchant: transactionOrMerchant, raw_description: '' }
    : transactionOrMerchant || {}
  const transactionText = [transaction.merchant, transaction.raw_description]
    .filter(Boolean)
    .join(' ')
  const localCategory = categorizeMerchant(transactionText)

  if (localCategory !== 'Other') {
    return localCategory
  }

  try {
    const category = await groqCategorizer({
      merchant: transaction.merchant || '',
      raw_description: transaction.raw_description || '',
    })
    return isAllowedCategory(category) ? category : 'Other'
  } catch {
    return 'Other'
  }
}

async function resolveCategory(transaction, groqCategorizer = categorizeWithGroq) {
  if (transaction?.category) {
    return transaction.category
  }

  return categorizeTransaction(transaction, groqCategorizer)
}

export { categoryRules, categorizeMerchant, categorizeTransaction, normalizeText, resolveCategory }
export default categorizeTransaction
