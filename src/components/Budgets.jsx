import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createBudget, deleteBudget, getBudgets, updateBudget } from '../services/api.js'
import { formatCurrency } from '../services/formatters.js'

const categories = ['Food', 'Transport', 'Groceries', 'Shopping', 'Entertainment', 'Bills', 'Healthcare', 'Education', 'Travel', 'Rent', 'Salary', 'Other']
const initialForm = { category: '', monthlyLimit: '' }

function progressState(percentage) {
  if (percentage >= 100) return 'exceeded'
  if (percentage >= 80) return 'warning'
  return 'healthy'
}

function Budgets() {
  const { t } = useTranslation()
  const [budgets, setBudgets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [editingLimit, setEditingLimit] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [feedback, setFeedback] = useState(null)

  function friendlyError(apiError, fallbackKey) {
    if (apiError.status === 409) return { key: 'budgets.errBudgetConflict' }
    return { message: apiError.message || t(fallbackKey) }
  }

  async function loadBudgets() {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getBudgets()
      setBudgets(result.budgets || [])
    } catch {
      setError({ key: 'budgets.error' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCurrent = true

    getBudgets()
      .then((result) => {
        if (isCurrent) setBudgets(result.budgets || [])
      })
      .catch(() => {
        if (isCurrent) setError({ key: 'budgets.error' })
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => { isCurrent = false }
  }, [])

  function updateForm(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
    setFeedback(null)
  }

  async function handleCreate(event) {
    event.preventDefault()
    const monthlyLimit = Number(form.monthlyLimit)
    if (!form.category) {
      setFeedback({ type: 'error', key: 'budgets.errChooseCategory' })
      return
    }
    if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
      setFeedback({ type: 'error', key: 'budgets.errLimitPositive' })
      return
    }

    setIsMutating(true)
    setFeedback(null)
    try {
      await createBudget({ category: form.category, monthlyLimit })
      setForm(initialForm)
      setIsFormOpen(false)
      setFeedback({ type: 'success', key: 'budgets.successAdded' })
      await loadBudgets()
    } catch (createError) {
      const err = friendlyError(createError, 'budgets.errGenericAdd')
      setFeedback({ type: 'error', ...err })
    } finally {
      setIsMutating(false)
    }
  }

  function startEditing(budget) {
    setEditingId(budget.id)
    setEditingLimit(String(budget.monthlyLimit))
    setFeedback(null)
  }

  async function handleUpdate(budgetId) {
    const monthlyLimit = Number(editingLimit)
    if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
      setFeedback({ type: 'error', key: 'budgets.errLimitPositive' })
      return
    }

    setIsMutating(true)
    setFeedback(null)
    try {
      await updateBudget(budgetId, { monthlyLimit })
      setEditingId(null)
      setFeedback({ type: 'success', key: 'budgets.successUpdated' })
      await loadBudgets()
    } catch (updateError) {
      const err = friendlyError(updateError, 'budgets.errGenericUpdate')
      setFeedback({ type: 'error', ...err })
    } finally {
      setIsMutating(false)
    }
  }

  async function handleDelete(budget) {
    if (!window.confirm(t('budgets.confirmDelete', { category: budget.category }))) return

    setIsMutating(true)
    setFeedback(null)
    try {
      await deleteBudget(budget.id)
      setFeedback({ type: 'success', key: 'budgets.successDeleted' })
      await loadBudgets()
    } catch (deleteError) {
      const err = friendlyError(deleteError, 'budgets.errGenericDelete')
      setFeedback({ type: 'error', ...err })
    } finally {
      setIsMutating(false)
    }
  }

  const availableCategories = categories.filter((category) => !budgets.some((budget) => budget.category === category))

  return (
    <section className="panel budgets-panel" id="budgets" aria-labelledby="budgets-title">
      <div className="panel-heading budgets-heading">
        <div>
          <p className="eyebrow">{t('budgets.eyebrow')}</p>
          <h2 id="budgets-title">{t('budgets.heading')}</h2>
        </div>
        <button className="add-budget-button" type="button" onClick={() => { setIsFormOpen((open) => !open); setFeedback(null) }}>
          <span aria-hidden="true">+</span> {t('budgets.addBudget')}
        </button>
      </div>

      {feedback ? (
        <p className={`budget-feedback ${feedback.type}`} role="status">
          {feedback.key ? t(feedback.key) : feedback.message}
        </p>
      ) : null}

      {isFormOpen ? (
        <form className="budget-form" onSubmit={handleCreate}>
          <label>
            {t('transactionForm.categoryLabel')}
            <select name="category" value={form.category} onChange={updateForm} required>
              <option value="">{t('budgets.chooseCategory')}</option>
              {availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            {t('budgets.monthlyLimitLabel')}
            <input name="monthlyLimit" type="number" min="0.01" step="0.01" value={form.monthlyLimit} onChange={updateForm} placeholder={t('budgets.monthlyLimitPlaceholder')} required />
          </label>
          <button className="submit-button" type="submit" disabled={isMutating || availableCategories.length === 0}>
            {isMutating ? t('budgets.saving') : t('budgets.saveButton')}
          </button>
        </form>
      ) : null}

      {isLoading ? (
        <div className="budget-loading" role="status"><span className="loading-spinner" /> {t('budgets.loading')}</div>
      ) : error ? (
        <div className="budget-error" role="alert">
          <span>{error.key ? t(error.key) : error.message}</span>
          <button type="button" onClick={loadBudgets}>{t('common.tryAgain')}</button>
        </div>
      ) : budgets.length === 0 ? (
        <div className="empty-state budget-empty">{t('budgets.empty')}</div>
      ) : (
        <div className="budget-grid">
          {budgets.map((budget) => {
            const state = progressState(budget.percentageUsed)
            const visualPercentage = Math.min(100, Math.max(0, budget.percentageUsed))
            const isEditing = editingId === budget.id
            return (
              <article className={`budget-card ${state}`} key={budget.id}>
                <div className="budget-card-header">
                  <div className="budget-category"><span className="budget-category-dot" /> <h3>{budget.category}</h3></div>
                  <div className="budget-actions">
                    {isEditing ? (
                      <>
                        <button type="button" onClick={() => handleUpdate(budget.id)} disabled={isMutating}>{t('budgets.save')}</button>
                        <button type="button" onClick={() => setEditingId(null)} disabled={isMutating}>{t('budgets.cancel')}</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEditing(budget)}>{t('budgets.edit')}</button>
                        <button type="button" onClick={() => handleDelete(budget)} disabled={isMutating}>{t('budgets.delete')}</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="budget-amounts">
                  <div><span>{t('budgets.spent')}</span><strong>{formatCurrency(budget.spent)}</strong></div>
                  <div className="budget-limit-value">
                    <span>{t('budgets.limit')}</span>
                    {isEditing ? (
                      <input
                        aria-label={`${budget.category} ${t('budgets.limit')}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editingLimit}
                        onChange={(event) => setEditingLimit(event.target.value)}
                      />
                    ) : (
                      <strong>{formatCurrency(budget.monthlyLimit)}</strong>
                    )}
                  </div>
                </div>
                <div className="budget-progress-track" aria-label={t('budgets.pctUsed', { percent: budget.percentageUsed.toFixed(0) })}>
                  <span style={{ width: `${visualPercentage}%` }} />
                </div>
                <div className="budget-card-footer">
                  <span className="budget-remaining">
                    {budget.remaining < 0
                      ? t('budgets.over', { amount: formatCurrency(Math.abs(budget.remaining)) })
                      : t('budgets.left', { amount: formatCurrency(budget.remaining) })}
                  </span>
                  <strong>{budget.percentageUsed.toFixed(2)}%</strong>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default Budgets
