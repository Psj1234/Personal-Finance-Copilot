import { useEffect, useState } from 'react'
import { createBudget, deleteBudget, getBudgets, updateBudget } from '../services/api.js'
import { formatCurrency } from '../services/formatters.js'

const categories = ['Food', 'Transport', 'Groceries', 'Shopping', 'Entertainment', 'Bills', 'Healthcare', 'Education', 'Travel', 'Rent', 'Salary', 'Other']
const initialForm = { category: '', monthlyLimit: '' }

function progressState(percentage) {
  if (percentage >= 100) return 'exceeded'
  if (percentage >= 80) return 'warning'
  return 'healthy'
}

function friendlyError(error, fallback) {
  if (error.status === 409) return 'A budget for that category already exists.'
  return error.message || fallback
}

function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [editingLimit, setEditingLimit] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function loadBudgets() {
    setIsLoading(true)
    setError('')
    try {
      const result = await getBudgets()
      setBudgets(result.budgets || [])
    } catch {
      setError('Budgets are unavailable right now. Please try again.')
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
        if (isCurrent) setError('Budgets are unavailable right now. Please try again.')
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
      setFeedback({ type: 'error', message: 'Choose a category first.' })
      return
    }
    if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
      setFeedback({ type: 'error', message: 'Monthly limit must be greater than zero.' })
      return
    }

    setIsMutating(true)
    setFeedback(null)
    try {
      await createBudget({ category: form.category, monthlyLimit })
      setForm(initialForm)
      setIsFormOpen(false)
      setFeedback({ type: 'success', message: 'Budget added.' })
      await loadBudgets()
    } catch (createError) {
      setFeedback({ type: 'error', message: friendlyError(createError, 'Could not add that budget.') })
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
      setFeedback({ type: 'error', message: 'Monthly limit must be greater than zero.' })
      return
    }

    setIsMutating(true)
    setFeedback(null)
    try {
      await updateBudget(budgetId, { monthlyLimit })
      setEditingId(null)
      setFeedback({ type: 'success', message: 'Budget updated.' })
      await loadBudgets()
    } catch (updateError) {
      setFeedback({ type: 'error', message: friendlyError(updateError, 'Could not update that budget.') })
    } finally {
      setIsMutating(false)
    }
  }

  async function handleDelete(budget) {
    if (!window.confirm(`Delete the ${budget.category} budget?`)) return

    setIsMutating(true)
    setFeedback(null)
    try {
      await deleteBudget(budget.id)
      setFeedback({ type: 'success', message: 'Budget deleted.' })
      await loadBudgets()
    } catch (deleteError) {
      setFeedback({ type: 'error', message: friendlyError(deleteError, 'Could not delete that budget.') })
    } finally {
      setIsMutating(false)
    }
  }

  const availableCategories = categories.filter((category) => !budgets.some((budget) => budget.category === category))

  return (
    <section className="panel budgets-panel" id="budgets" aria-labelledby="budgets-title">
      <div className="panel-heading budgets-heading">
        <div>
          <p className="eyebrow">SPEND WITH INTENTION</p>
          <h2 id="budgets-title">Budgets</h2>
        </div>
        <button className="add-budget-button" type="button" onClick={() => { setIsFormOpen((open) => !open); setFeedback(null) }}>
          <span aria-hidden="true">+</span> Add Budget
        </button>
      </div>

      {feedback ? <p className={`budget-feedback ${feedback.type}`} role="status">{feedback.message}</p> : null}

      {isFormOpen ? (
        <form className="budget-form" onSubmit={handleCreate}>
          <label>
            Category
            <select name="category" value={form.category} onChange={updateForm} required>
              <option value="">Choose category</option>
              {availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            Monthly limit
            <input name="monthlyLimit" type="number" min="0.01" step="0.01" value={form.monthlyLimit} onChange={updateForm} placeholder="e.g. 10000" required />
          </label>
          <button className="submit-button" type="submit" disabled={isMutating || availableCategories.length === 0}>
            {isMutating ? 'Saving...' : 'Save budget'}
          </button>
        </form>
      ) : null}

      {isLoading ? (
        <div className="budget-loading" role="status"><span className="loading-spinner" /> Loading budgets...</div>
      ) : error ? (
        <div className="budget-error" role="alert"><span>{error}</span><button type="button" onClick={loadBudgets}>Try again</button></div>
      ) : budgets.length === 0 ? (
        <div className="empty-state budget-empty">No budgets yet. Add one to give your spending a clear boundary.</div>
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
                        <button type="button" onClick={() => handleUpdate(budget.id)} disabled={isMutating}>Save</button>
                        <button type="button" onClick={() => setEditingId(null)} disabled={isMutating}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEditing(budget)}>Edit</button>
                        <button type="button" onClick={() => handleDelete(budget)} disabled={isMutating}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="budget-amounts">
                  <div><span>Spent</span><strong>{formatCurrency(budget.spent)}</strong></div>
                  <div className="budget-limit-value">
                    <span>Monthly limit</span>
                    {isEditing ? <input aria-label={`${budget.category} monthly limit`} type="number" min="0.01" step="0.01" value={editingLimit} onChange={(event) => setEditingLimit(event.target.value)} /> : <strong>{formatCurrency(budget.monthlyLimit)}</strong>}
                  </div>
                </div>
                <div className="budget-progress-track" aria-label={`${budget.percentageUsed}% used`}><span style={{ width: `${visualPercentage}%` }} /></div>
                <div className="budget-card-footer"><span className="budget-remaining">{budget.remaining < 0 ? `${formatCurrency(Math.abs(budget.remaining))} over` : `${formatCurrency(budget.remaining)} left`}</span><strong>{budget.percentageUsed.toFixed(2)}%</strong></div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default Budgets
