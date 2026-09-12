import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RAG_MODEL, generateRagAnswer } from './ragAnswerService.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(currentDirectory, '../../../src')
const retrievedResult = {
  transactions: [
    {
      id: 42,
      user_id: 1,
      date: '2026-03-12',
      merchant: 'Swiggy',
      amount: 540,
      type: 'expense',
      category: 'Food',
      raw_description: 'Dinner order',
    },
  ],
}

let request
const mockClient = {
  chat: {
    completions: {
      create: async (payload) => {
        request = payload
        return { choices: [{ message: { content: 'You spent ₹540 on Swiggy.' } }] }
      },
    },
  },
}

const normalResult = await generateRagAnswer('How much did I spend on food?', retrievedResult, {
  groqClient: mockClient,
})
assert.equal(normalResult.answer, 'You spent ₹540 on Swiggy.')
assert.equal(normalResult.model, RAG_MODEL)
assert.equal(normalResult.retrievedCount, 1)
assert.match(request.messages[1].content, /USER QUESTION:/)
assert.match(request.messages[1].content, /RETRIEVED TRANSACTIONS:/)
assert.match(request.messages[1].content, /Swiggy/)
assert.match(request.messages[1].content, /Dinner order/)
assert.doesNotMatch(request.messages[1].content, /user_id|"id"/)

let emptyCallCount = 0
const emptyResult = await generateRagAnswer('What did I spend?', { transactions: [] }, {
  groqClient: { chat: { completions: { create: async () => { emptyCallCount += 1 } } } },
})
assert.equal(emptyResult.retrievedCount, 0)
assert.equal(emptyCallCount, 0)
assert.match(emptyResult.answer, /could not find relevant transactions/i)

const failedResult = await generateRagAnswer('What did I spend?', retrievedResult, {
  groqClient: {
    chat: { completions: { create: async () => { throw new Error('API unavailable') } } },
  },
})
assert.match(failedResult.answer, /temporarily unavailable/i)
assert.equal(failedResult.retrievedCount, 1)

const malformedResult = await generateRagAnswer('What did I spend?', retrievedResult, {
  groqClient: { chat: { completions: { create: async () => ({ choices: [] }) } } },
})
assert.match(malformedResult.answer, /reliable answer/i)

const originalApiKey = process.env.GROQ_API
delete process.env.GROQ_API
const missingKeyResult = await generateRagAnswer('What did I spend?', retrievedResult)
if (originalApiKey !== undefined) {
  process.env.GROQ_API = originalApiKey
}
assert.match(missingKeyResult.answer, /not configured/i)

function collectFrontendFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory() ? collectFrontendFiles(entryPath) : [entryPath]
  })
}

for (const filePath of collectFrontendFiles(frontendDirectory).filter((filePath) => /\.(js|jsx)$/.test(filePath))) {
  const content = fs.readFileSync(filePath, 'utf8')
  assert.doesNotMatch(content, /groq-sdk|GROQ_API/)
}

console.log('RAG answer service tests passed: 5 assertions')
