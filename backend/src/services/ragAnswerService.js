import 'dotenv/config'
import Groq from 'groq-sdk'

const RAG_MODEL = 'openai/gpt-oss-20b'
const answerSystemPrompt = `You are a concise personal finance assistant.
The retrieved transactions are the only source of financial facts. Do not invent transactions, amounts, dates, merchants, categories, or balances.
If the retrieved data is insufficient to answer confidently, say so clearly.
Perform simple arithmetic when needed. Keep your answer concise and understandable.
Represent currency as INR or ₹ where appropriate.`

function selectTransactionFields(transaction) {
  return {
    date: transaction.date,
    merchant: transaction.merchant,
    amount: transaction.amount,
    type: transaction.type,
    category: transaction.category,
    raw_description: transaction.raw_description,
  }
}

function getRetrievedTransactions(retrievalResult) {
  return Array.isArray(retrievalResult?.transactions)
    ? retrievalResult.transactions.map(selectTransactionFields)
    : []
}

function createPrompt(question, transactions) {
  return `USER QUESTION:\n${String(question || '')}\n\nRETRIEVED TRANSACTIONS:\n${JSON.stringify(transactions, null, 2)}`
}

function fallbackResult(message, retrievedCount, errorCode) {
  const result = {
    answer: message,
    model: RAG_MODEL,
    retrievedCount,
  }

  if (errorCode) {
    result.errorCode = errorCode
  }

  return result
}

async function generateRagAnswer(question, retrievalResult, options = {}) {
  const transactions = getRetrievedTransactions(retrievalResult)
  const retrievedCount = transactions.length

  if (retrievedCount === 0) {
    return fallbackResult(
      'I could not find relevant transactions to answer that question.',
      retrievedCount,
    )
  }

  const client = options.groqClient || (() => {
    if (!process.env.GROQ_API) {
      return null
    }

    return new Groq({ apiKey: process.env.GROQ_API, timeout: 10000 })
  })()

  if (!client) {
    return fallbackResult(
      'I could not generate a reliable answer because the finance assistant is not configured.',
      retrievedCount,
      'generation_unavailable',
    )
  }

  try {
    const completion = await client.chat.completions.create({
      model: RAG_MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: answerSystemPrompt },
        { role: 'user', content: createPrompt(question, transactions) },
      ],
    })
    const answer = completion?.choices?.[0]?.message?.content

    if (typeof answer !== 'string' || answer.trim() === '') {
      return fallbackResult(
        'I could not generate a reliable answer from the retrieved transactions.',
        retrievedCount,
        'generation_failed',
      )
    }

    return {
      answer: answer.trim(),
      model: RAG_MODEL,
      retrievedCount,
    }
  } catch {
    return fallbackResult(
      'I could not generate a reliable answer because the finance assistant is temporarily unavailable.',
      retrievedCount,
      'generation_failed',
    )
  }
}

export { RAG_MODEL, createPrompt, generateRagAnswer, getRetrievedTransactions }
export default generateRagAnswer
