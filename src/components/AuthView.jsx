import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'

function AuthView() {
  const { t } = useTranslation()
  const { login, register, authError, sessionExpired, clearAuthError, clearSessionExpired } = useAuth()

  const [activeTab, setActiveTab] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setLocalError('')
    clearAuthError()
  }

  const handleFillDemo = () => {
    setActiveTab('login')
    setEmail('aarav@example.com')
    setPassword('password123')
    setLocalError('')
    clearAuthError()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearAuthError()
    clearSessionExpired()

    const trimmedEmail = email.trim()
    const trimmedName = name.trim()

    if (activeTab === 'register' && !trimmedName) {
      setLocalError(t('auth.errNameRequired'))
      return
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLocalError(t('auth.errEmailRequired'))
      return
    }

    if (!password || password.length < 6) {
      setLocalError(t('auth.errPasswordLength'))
      return
    }

    setIsSubmitting(true)
    try {
      if (activeTab === 'login') {
        await login(trimmedEmail, password)
      } else {
        await register(trimmedName, trimmedEmail, password)
      }
    } catch {
      // authError is set in AuthContext
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayError = localError || authError

  return (
    <div className="auth-container">
      <header className="auth-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">PF</div>
          <div>
            <p className="eyebrow">{t('header.brandEyebrow')}</p>
            <h1 className="auth-brand-title">{t('header.brandTitle')}</h1>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="auth-main">
        <div className="auth-card">
          {sessionExpired ? (
            <div className="auth-session-banner" role="alert">
              <span>{t('auth.sessionExpired')}</span>
            </div>
          ) : null}

          <div className="auth-tabs" role="tablist" aria-label={t('auth.loginTab')}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              aria-controls="auth-panel-login"
              id="tab-login"
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => handleTabChange('login')}
            >
              {t('auth.loginTab')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              aria-controls="auth-panel-register"
              id="tab-register"
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => handleTabChange('register')}
            >
              {t('auth.registerTab')}
            </button>
          </div>

          <div
            id={`auth-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="auth-panel"
          >
            <div className="auth-panel-header">
              <h2>{activeTab === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}</h2>
              <p className="auth-subtitle">
                {activeTab === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
              </p>
            </div>

            {displayError ? (
              <div className="auth-error-banner" role="alert">
                <span>{displayError}</span>
              </div>
            ) : null}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {activeTab === 'register' && (
                <div className="form-field">
                  <label htmlFor="auth-name">{t('auth.nameLabel')}</label>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder={t('auth.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <div className="form-field">
                <label htmlFor="auth-email">{t('auth.emailLabel')}</label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-field">
                <label htmlFor="auth-password">{t('auth.passwordLabel')}</label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                  required
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                className="submit-button auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t('auth.submitting')
                  : activeTab === 'login'
                    ? t('auth.loginButton')
                    : t('auth.registerButton')}
              </button>
            </form>

            <div className="auth-demo-hint">
              <span className="demo-hint-label">{t('auth.demoHint')}</span>
              <button
                type="button"
                className="demo-hint-btn"
                onClick={handleFillDemo}
                title="Use demo credentials"
              >
                <code>{t('auth.demoCredentials')}</code>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer auth-footer">
        <span>{t('common.footerBrand')}</span>
        <span>{t('common.footerTagline')}</span>
      </footer>
    </div>
  )
}

export default AuthView
