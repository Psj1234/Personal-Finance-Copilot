import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import analyticsRouter from './routes/analytics.js'
import authRouter from './routes/auth.js'
import budgetsRouter from './routes/budgets.js'
import chatRouter from './routes/chat.js'
import digestRouter from './routes/digest.js'
import transactionsRouter from './routes/transactions.js'
import { authenticate } from './middleware/auth.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(currentDirectory, '../../dist')
const indexPath = path.join(distPath, 'index.html')

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api/analytics', authenticate, analyticsRouter)
app.use('/api/auth', authRouter)
app.use('/api/budgets', authenticate, budgetsRouter)
app.use('/api/chat', authenticate, chatRouter)
app.use('/api/digest', authenticate, digestRouter)
app.use('/api/transactions', authenticate, transactionsRouter)

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'finance-copilot-api',
  })
})

// Serve production frontend bundle when dist exists
if (fs.existsSync(indexPath)) {
  app.use(express.static(distPath))
  app.use((request, response, next) => {
    if (request.method === 'GET' && !request.path.startsWith('/api')) {
      return response.sendFile(indexPath)
    }
    next()
  })
}

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
