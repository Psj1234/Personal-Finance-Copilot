import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher.jsx'

function DashboardHeader() {
  const { t } = useTranslation()

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
          <span className="profile-avatar" aria-hidden="true">AM</span>
          <span>
            <strong>Aarav Mehta</strong>
            <small>{t('header.profileAccount')}</small>
          </span>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader

