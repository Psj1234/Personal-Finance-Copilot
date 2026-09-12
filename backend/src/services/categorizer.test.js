import assert from 'node:assert/strict'
import { categorizeMerchant, categorizeTransaction, resolveCategory } from './categorizer.js'

const localOnlyFallback = async () => {
  throw new Error('Groq should not be called for a known merchant')
}

assert.equal(categorizeMerchant('Swiggy dinner'), 'Food')
assert.equal(
  await categorizeTransaction({ merchant: 'Swiggy', raw_description: 'Dinner' }, localOnlyFallback),
  'Food',
)

let receivedTransaction
const groqStub = async (transaction) => {
  receivedTransaction = transaction
  return 'Travel'
}
assert.equal(
  await categorizeTransaction({ merchant: 'Neighborhood Market', raw_description: 'Weekend purchase' }, groqStub),
  'Travel',
)
assert.deepEqual(receivedTransaction, {
  merchant: 'Neighborhood Market',
  raw_description: 'Weekend purchase',
})

assert.equal(
  await categorizeTransaction({ merchant: 'Unknown Merchant' }, async () => 'Not a valid category'),
  'Other',
)
assert.equal(
  await categorizeTransaction({ merchant: 'Unknown Merchant' }, async () => {
    throw new Error('Groq unavailable')
  }),
  'Other',
)
assert.equal(
  await resolveCategory({ merchant: 'Swiggy', category: 'Other' }, localOnlyFallback),
  'Other',
)

console.log('Categorizer fallback tests passed: 5 assertions')
