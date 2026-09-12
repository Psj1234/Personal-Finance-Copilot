import 'dotenv/config'
import Groq from 'groq-sdk'

const GROQ_MODEL = 'openai/gpt-oss-20b'
const allowedCategories = [
  'Food',
  'Transport',
  'Groceries',
  'Shopping',
  'Entertainment',
  'Bills',
  'Healthcare',
  'Education',
  'Travel',
  'Rent',
  'Salary',
  'Other',
]
const allowedCategorySet = new Set(allowedCategories)

function isAllowedCategory(category) {
  return typeof category === 'string' && allowedCategorySet.has(category)
}

function parseCategory(content) {
  const parsed = JSON.parse(content)
  return isAllowedCategory(parsed?.category) ? parsed.category : 'Other'
}

async function categorizeWithGroq({ merchant, raw_description: rawDescription }) {
  const apiKey = process.env.GROQ_API
  if (!apiKey) {
    throw new Error('GROQ_API is not configured')
  }

  const groq = new Groq({ apiKey, timeout: 10000 })
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You categorize one personal finance transaction. Choose exactly one category from this list: ${allowedCategories.join(', ')}. Return only valid JSON with exactly this shape: {"category":"OneAllowedCategory"}.`,
      },
      {
        role: 'user',
        content: JSON.stringify({ merchant, raw_description: rawDescription || '' }),
      },
    ],
  })
  const content = completion.choices[0]?.message?.content

  if (!content) {
    throw new Error('Groq returned an empty response')
  }

  return parseCategory(content)
}

export { GROQ_MODEL, allowedCategories, categorizeWithGroq, isAllowedCategory }
export default categorizeWithGroq
