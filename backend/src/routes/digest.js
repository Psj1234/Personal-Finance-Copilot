import express from 'express'
import { generateWeeklyDigest } from '../services/digestService.js'

export function createDigestRouter(options = {}) {
  const router = express.Router()
  const digestGenerator = options.generateWeeklyDigest || generateWeeklyDigest

  router.get('/weekly', (request, response, next) => {
    try {
      const { startDate, endDate } = request.query

      if (!startDate) {
        const error = new Error('startDate is required and must use YYYY-MM-DD format')
        error.statusCode = 400
        throw error
      }

      if (!endDate) {
        const error = new Error('endDate is required and must use YYYY-MM-DD format')
        error.statusCode = 400
        throw error
      }

      const digest = digestGenerator({
        startDate,
        endDate,
        userId: options.userId,
        database: options.database,
      })

      response.json(digest)
    } catch (error) {
      next(error)
    }
  })

  return router
}

const defaultRouter = createDigestRouter()
export default defaultRouter
