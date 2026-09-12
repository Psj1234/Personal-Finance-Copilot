import { useState } from 'react'

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  merchant: '',
  amount: '',
  type: 'expense',
  category: '',
  description: '',
}

const categories = ['Food', 'Transport', 'Groceries', 'Shopping', 'Entertainment', 'Bills', 'Healthcare', 'Education', 'Travel', 'Rent', 'Salary', 'Other']

function TransactionForm({ onSubmit, isSubmitting }) {
  const [form, setForm] = useState(initialForm)
  const [feedback, setFeedback] = useState(null)

  function updateField(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
    setFeedback(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)

    try {
      await onSubmit({
        date: form.date,
        merchant: form.merchant,
        amount: Number(form.amount),
        type: form.type,
        ...(form.category ? { category: form.category } : {}),
        raw_description: form.description,
      })
      setForm({ ...initialForm, date: form.date })
      setFeedback({ type: 'success', message: 'Transaction added and dashboard refreshed.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message })
    }
  }

  return (
    <section className="panel form-panel" id="add-transaction">
      <div className="panel-heading form-heading">
        <div>
          <p className="eyebrow">CAPTURE A MOMENT</p>
          <h2>Add transaction</h2>
        </div>
        <span className="form-plus" aria-hidden="true">+</span>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Date
            <input name="date" type="date" value={form.date} onChange={updateField} required />
          </label>
          <label>
            Merchant
            <input name="merchant" type="text" value={form.merchant} onChange={updateField} placeholder="e.g. Swiggy" required />
          </label>
          <label>
            Amount
            <input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={updateField} placeholder="0.00" required />
          </label>
          <label>
            Type
            <select name="type" value={form.type} onChange={updateField}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label>
            Category
            <select name="category" value={form.category} onChange={updateField}>
              <option value="">Auto-detect</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            Description
            <input name="description" type="text" value={form.description} onChange={updateField} placeholder="Optional note" />
          </label>
        </div>
        <div className="form-footer">
          {feedback ? <p className={`form-feedback ${feedback.type}`} role="status">{feedback.message}</p> : <span className="form-hint">Keep your ledger close to reality.</span>}
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save transaction'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default TransactionForm
