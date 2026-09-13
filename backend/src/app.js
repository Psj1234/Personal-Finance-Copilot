import cors from 'cors'
import express from 'express'
import analyticsRouter from './routes/analytics.js'
import authRouter from './routes/auth.js'
import budgetsRouter from './routes/budgets.js'
import chatRouter from './routes/chat.js'
import digestRouter from './routes/digest.js'
import transactionsRouter from './routes/transactions.js'
import { authenticate } from './middleware/auth.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api/analytics', authenticate, analyticsRouter)
app.use('/api/auth', authRouter)
app.use('/api/budgets', authenticate, budgetsRouter)
app.use('/api/chat', authenticate, chatRouter)
app.use('/api/digest', digestRouter)
app.use('/api/transactions', authenticate, transactionsRouter)

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'finance-copilot-api',
  })
})

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found' })
})

app.use((error, _request, response, next) => {
  if (response.headersSent) {
    return next(error)
  }

  const statusCode = error.statusCode || 500
  const message = statusCode === 500 ? 'Internal server error' : error.message
  response.status(statusCode).json({ error: message })
})

export default app
