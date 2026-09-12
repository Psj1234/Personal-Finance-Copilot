import assert from 'node:assert/strict'
import express from 'express'
import { createChatRouter } from './chat.js'

let retrievedQuestion
let generatedQuestion
let generatedRetrieval
let retrievalFailure = false
let generationFailure = false
const retrievalResult = {
  filters: { category: 'Food', date: 'last month', keywords: [] },
  transactions: [{ date: '2026-03-12', merchant: 'Swiggy', amount: 540, category: 'Food' }],
}

const app = express()
app.use(express.json())
app.use('/api/chat', createChatRouter({
  retrieveTransactions: async (question) => {
    retrievedQuestion = question
    if (retrievalFailure) {
      throw new Error('database details must stay private')
    }
    return retrievalResult
  },
  generateRagAnswer: async (question, result) => {
    generatedQuestion = question
    generatedRetrieval = result
    if (generationFailure) {
      throw new Error('provider details must stay private')
    }
    return { answer: 'You spent ₹540 on food.', retrievedCount: 1, model: 'test-model' }
  },
}))
app.use((error, _request, response, next) => {
  if (response.headersSent) {
    return next(error)
  }
  response.status(error.statusCode || 500).json({ error: error.statusCode === 400 ? error.message : 'Internal server error' })
})

const server = await new Promise((resolve) => {
  const instance = app.listen(0, () => resolve(instance))
})
const address = server.address()
const url = `http://localhost:${address.port}/api/chat`

async function post(body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

try {
  const valid = await post({ question: 'How much did I spend on food last month?' })
  assert.equal(valid.status, 200)
  assert.equal(valid.body.answer, 'You spent ₹540 on food.')
  assert.equal(valid.body.retrievedCount, 1)
  assert.equal(retrievedQuestion, 'How much did I spend on food last month?')
  assert.equal(generatedQuestion, retrievedQuestion)
  assert.equal(generatedRetrieval, retrievalResult)
  assert.deepEqual(valid.body.filters, retrievalResult.filters)
  assert.doesNotMatch(JSON.stringify(valid.body), /GROQ_API|gsk_|database details|provider details/)

  assert.equal((await post({})).status, 400)
  assert.equal((await post({ question: '   ' })).status, 400)

  retrievalFailure = true
  const failedRetrieval = await post({ question: 'Show my spending' })
  assert.equal(failedRetrieval.status, 500)
  assert.doesNotMatch(JSON.stringify(failedRetrieval.body), /database details|GROQ_API|gsk_/)
  retrievalFailure = false

  generationFailure = true
  const failedGeneration = await post({ question: 'Show my spending' })
  assert.equal(failedGeneration.status, 500)
  assert.doesNotMatch(JSON.stringify(failedGeneration.body), /provider details|GROQ_API|gsk_/)
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

console.log('Chat route tests passed: 8 assertions')
