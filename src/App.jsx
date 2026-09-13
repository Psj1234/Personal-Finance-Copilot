import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './context/AuthContext.jsx'
import AuthView from './components/AuthView.jsx'
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

function DashboardContent({ user }) {
  const { t } = useTranslation()
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
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
  }, [])

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
            <p className="eyebrow">{t('welcome.eyebrow', { name: user?.name || '' })}</p>
            <h2>{t('welcome.heading')}</h2>
            <p className="welcome-copy">{t('welcome.copy')}</p>
          </div>
          <div className="date-stamp">
            <span className="live-dot" />
            <span>{t('welcome.liveDot')}</span>
          </div>
        </section>

        {error ? (
          <section className="error-banner" role="alert">
            <strong>{t('common.loadErrorTitle')}</strong>
            <span>{error}</span>
            <button type="button" onClick={loadDashboard}>{t('common.tryAgain')}</button>
          </section>
        ) : null}

        {isLoading ? (
          <div className="loading-state" role="status">
            <span className="loading-spinner" />
            {t('common.loadingDashboard')}
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
        <span>{t('common.footerBrand')}</span>
        <span>{t('common.footerTagline')}</span>
      </footer>
    </div>
  )
}

function App() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth()

  if (isAuthLoading) {
    return (
      <div className="app-shell auth-loading-shell">
        <div className="loading-state" role="status">
          <span className="loading-spinner" />
          {t('common.loadingDashboard')}
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <AuthView />
  }

  return <DashboardContent key={user.id} user={user} />
}

export default App
