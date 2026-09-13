import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
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
      setFeedback({ type: 'success', key: 'transactionForm.success' })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message })
    }
  }

  return (
    <section className="panel form-panel" id="add-transaction">
      <div className="panel-heading form-heading">
        <div>
          <p className="eyebrow">{t('transactionForm.eyebrow')}</p>
          <h2>{t('transactionForm.heading')}</h2>
        </div>
        <span className="form-plus" aria-hidden="true">+</span>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            {t('transactionForm.dateLabel')}
            <input name="date" type="date" value={form.date} onChange={updateField} required />
          </label>
          <label>
            {t('transactionForm.merchantLabel')}
            <input name="merchant" type="text" value={form.merchant} onChange={updateField} placeholder={t('transactionForm.merchantPlaceholder')} required />
          </label>
          <label>
            {t('transactionForm.amountLabel')}
            <input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={updateField} placeholder="0.00" required />
          </label>
          <label>
            {t('transactionForm.typeLabel')}
            <select name="type" value={form.type} onChange={updateField}>
              <option value="expense">{t('transactionForm.typeExpense')}</option>
              <option value="income">{t('transactionForm.typeIncome')}</option>
            </select>
          </label>
          <label>
            {t('transactionForm.categoryLabel')}
            <select name="category" value={form.category} onChange={updateField}>
              <option value="">{t('transactionForm.categoryAutoDetect')}</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            {t('transactionForm.descriptionLabel')}
            <input name="description" type="text" value={form.description} onChange={updateField} placeholder={t('transactionForm.descriptionPlaceholder')} />
          </label>
        </div>
        <div className="form-footer">
          {feedback ? (
            <p className={`form-feedback ${feedback.type}`} role="status">
              {feedback.key ? t(feedback.key) : feedback.message}
            </p>
          ) : (
            <span className="form-hint">{t('transactionForm.hint')}</span>
          )}
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('transactionForm.saving') : t('transactionForm.saveButton')}
          </button>
        </div>
      </form>
    </section>
  )
}

export default TransactionForm
