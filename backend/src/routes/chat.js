import express from 'express'
import { retrieveTransactions } from '../services/ragService.js'
import { generateRagAnswer } from '../services/ragAnswerService.js'

function createChatRouter(services = {}) {
  const retrieve = services.retrieveTransactions || retrieveTransactions
  const generateAnswer = services.generateRagAnswer || generateRagAnswer
  const router = express.Router()

  router.post('/', async (request, response, next) => {
    try {
      const question = request.body?.question
      if (typeof question !== 'string' || question.trim() === '') {
        const error = new Error('question must be a non-empty string')
        error.statusCode = 400
        throw error
      }

      const retrievalResult = await retrieve(question, { userId: request.user?.id })
      const answerResult = await generateAnswer(question, retrievalResult)

      if (!answerResult || typeof answerResult.answer !== 'string' || answerResult.errorCode) {
        const error = new Error('Unable to generate a finance answer')
        error.statusCode = 500
        throw error
      }

      response.json({
        answer: answerResult.answer,
        retrievedCount: answerResult.retrievedCount ?? retrievalResult?.transactions?.length ?? 0,
        filters: retrievalResult?.filters || null,
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}

export { createChatRouter }
export default createChatRouter()
