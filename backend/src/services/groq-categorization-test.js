import { categorizeTransaction } from './categorizer.js'

const category = await categorizeTransaction({
  merchant: 'Unknown Corner Cafe',
  raw_description: 'A small lunch purchase',
})

console.log(`Groq categorization result: ${category}`)
