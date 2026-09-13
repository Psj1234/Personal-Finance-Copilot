import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function DashboardHeader() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  const userName = user?.name || ''
  const initials = getInitials(userName)

  return (
    <header className="dashboard-header">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">PF</div>
        <div>
          <p className="eyebrow">{t('header.brandEyebrow')}</p>
          <h1>{t('header.brandTitle')}</h1>
        </div>
      </div>

      <nav className="header-nav" aria-label={t('header.mainNav')}>
        <a className="active" href="#overview">{t('header.navOverview')}</a>
        <a href="#transactions">{t('header.navTransactions')}</a>
        <a href="#add-transaction">{t('header.navAddTransaction')}</a>
        <a href="#budgets">{t('header.navBudgets')}</a>
        <a href="#copilot">{t('header.navCopilot')}</a>
      </nav>

      <div className="header-actions">
        <LanguageSwitcher />
        <div className="profile-chip">
          <span className="profile-avatar" aria-hidden="true">{initials}</span>
          <span>
            <strong>{userName}</strong>
            <small>{t('header.profileAccount')}</small>
          </span>
        </div>
        <button
          type="button"
          className="btn-logout"
          onClick={() => logout()}
          aria-label={t('auth.logout')}
        >
          {t('auth.logout')}
        </button>
      </div>
    </header>
  )
}

export default DashboardHeader
