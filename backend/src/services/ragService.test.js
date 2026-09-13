import assert from 'node:assert/strict'
import db from '../db/database.js'
import { retrieveTransactions } from './ragService.js'

const transactionCountBefore = db.prepare('SELECT COUNT(*) AS count FROM transactions').get().count

const foodResults = retrieveTransactions('How much did I spend on food?', { userId: 1 })
assert.ok(foodResults.transactions.length > 0)
assert.ok(foodResults.transactions.every((transaction) => transaction.category === 'Food'))

const swiggyResults = retrieveTransactions('Show my Swiggy spending', { userId: 1 })
assert.ok(swiggyResults.transactions.length > 0)
assert.ok(swiggyResults.transactions.every((transaction) => transaction.merchant.toLowerCase().includes('swiggy')))

const marchResults = retrieveTransactions('What did I spend in March?', { userId: 1 })
assert.ok(marchResults.transactions.length > 0)
assert.ok(marchResults.transactions.every((transaction) => transaction.date.startsWith('2026-03')))

const combinedResults = retrieveTransactions('How much did I spend on food in March?', { userId: 1 })
assert.ok(combinedResults.transactions.length > 0)
assert.ok(combinedResults.transactions.every((transaction) => transaction.category === 'Food' && transaction.date.startsWith('2026-03')))

const limitedResults = retrieveTransactions('Show my spending', { userId: 1, limit: 3 })
assert.equal(limitedResults.transactions.length, 3)

const noResults = retrieveTransactions('Show transactions from an imaginary merchant', { userId: 1 })
assert.equal(noResults.count, 0)
assert.deepEqual(noResults.transactions, [])

const unauthenticatedResults = retrieveTransactions('How much did I spend on food?')
assert.equal(unauthenticatedResults.count, 0)
assert.deepEqual(unauthenticatedResults.transactions, [])

const transactionCountAfter = db.prepare('SELECT COUNT(*) AS count FROM transactions').get().count
assert.equal(transactionCountAfter, transactionCountBefore)

db.close()
console.log('RAG retrieval tests passed: 8 assertions')
