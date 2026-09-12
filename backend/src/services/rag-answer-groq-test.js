import { generateRagAnswer } from './ragAnswerService.js'

const result = await generateRagAnswer('How much did I spend on food?', {
  transactions: [
    {
      date: '2026-03-12',
      merchant: 'Swiggy',
      amount: 540,
      type: 'expense',
      category: 'Food',
      raw_description: 'Dinner order',
    },
  ],
})

console.log(result.answer)
