import { useEffect, useState } from 'react'
import CategoryBreakdown from './components/CategoryBreakdown.jsx'
import Budgets from './components/Budgets.jsx'
import DashboardHeader from './components/DashboardHeader.jsx'
import FinanceCopilot from './components/FinanceCopilot.jsx'
import SpendChart from './components/SpendChart.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import TransactionForm from './components/TransactionForm.jsx'
import TransactionList from './components/TransactionList.jsx'
import { createTransaction, getAnalyticsSummary } from './services/api.js'
import './App.css'

const emptyDashboard = {
  summary: { totalIncome: 0, totalExpenses: 0, balance: 0 },
  categoryBreakdown: [],
  monthlyTrend: [],
  recentTransactions: [],
}

function App() {
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function loadDashboard() {
    setIsLoading(true)
    setError('')
    try {
      const data = await getAnalyticsSummary()
      setDashboard(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCurrent = true

    getAnalyticsSummary()
      .then((data) => {
        if (isCurrent) {
          setDashboard(data)
        }
      })
      .catch((loadError) => {
        if (isCurrent) {
          setError(loadError.message)
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  async function handleCreateTransaction(transaction) {
    setIsSubmitting(true)
    try {
      await createTransaction(transaction)
      await loadDashboard()
    } finally {
      setIsSubmitting(false)
    }
  }

  const largestCategory = dashboard.categoryBreakdown[0]

  return (
    <div className="app-shell">
      <DashboardHeader />
      <main>
        <section className="welcome-band" id="overview">
          <div>
            <p className="eyebrow">GOOD MORNING, AARAV</p>
            <h2>Your money, made clearer.</h2>
            <p className="welcome-copy">A calm view of what came in, what went out, and where it went.</p>
          </div>
          <div className="date-stamp">
            <span className="live-dot" />
            <span>Live from your ledger</span>
          </div>
        </section>

        {error ? (
          <section className="error-banner" role="alert">
            <strong>Couldn&apos;t load your dashboard.</strong>
            <span>{error}</span>
            <button type="button" onClick={loadDashboard}>Try again</button>
          </section>
        ) : null}

        {isLoading ? (
          <div className="loading-state" role="status">
            <span className="loading-spinner" />
            Loading your financial picture...
          </div>
        ) : (
          <>
            <SummaryCards summary={dashboard.summary} largestCategory={largestCategory} />
            <div className="dashboard-grid">
              <SpendChart data={dashboard.monthlyTrend} />
              <CategoryBreakdown data={dashboard.categoryBreakdown} />
            </div>
            <div className="lower-grid">
              <TransactionList transactions={dashboard.recentTransactions} />
              <TransactionForm onSubmit={handleCreateTransaction} isSubmitting={isSubmitting} />
            </div>
            <Budgets />
            <FinanceCopilot />
          </>
        )}
      </main>
      <footer className="app-footer">
        <span>Personal Finance Copilot</span>
        <span>Built for a clearer next decision.</span>
      </footer>
    </div>
  )
}

export default App
