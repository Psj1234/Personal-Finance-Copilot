import db from './database.js'
import { categorizeTransaction } from '../services/categorizer.js'

const missingTransactions = db
  .prepare(`
    SELECT id, merchant, raw_description
    FROM transactions
    WHERE category IS NULL OR TRIM(category) = ''
  `)
  .all()

const updateCategory = db.prepare('UPDATE transactions SET category = ? WHERE id = ?')
const backfill = db.transaction((categorizedTransactions) => {
  for (const transaction of categorizedTransactions) {
    updateCategory.run(transaction.category, transaction.id)
  }
})

const categorizedTransactions = await Promise.all(
  missingTransactions.map(async (transaction) => ({
    ...transaction,
    category: await categorizeTransaction(transaction),
  })),
)
backfill(categorizedTransactions)

console.log(`Categorized ${missingTransactions.length} existing transaction(s) without changing manual categories.`)
db.close()
