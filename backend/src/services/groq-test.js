import 'dotenv/config'
import Groq from 'groq-sdk'

const apiKey = process.env.GROQ_API

if (!apiKey) {
  console.error('GROQ_API is not configured in backend/.env')
  process.exitCode = 1
} else {
  const groq = new Groq({ apiKey })

  try {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'user',
          content: 'Reply with exactly: Groq connection successful',
        },
      ],
      temperature: 0,
    })

    console.log(completion.choices[0]?.message?.content || 'Groq returned an empty response')
  } catch (error) {
    console.error(`Groq request failed: ${error.message}`)
    process.exitCode = 1
  }
}
