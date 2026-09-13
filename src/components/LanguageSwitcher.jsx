import { useTranslation } from 'react-i18next'

function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const currentLang = i18n.resolvedLanguage || i18n.language || 'en'

  function handleSwitch(lang) {
    if (lang !== currentLang) {
      i18n.changeLanguage(lang)
    }
  }

  return (
    <div className="language-switcher" role="group" aria-label={t('header.switchLanguage')}>
      <button
        type="button"
        className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
        onClick={() => handleSwitch('en')}
        aria-pressed={currentLang === 'en'}
      >
        {t('header.langEn')}
      </button>
      <button
        type="button"
        className={`lang-btn ${currentLang === 'hi' ? 'active' : ''}`}
        onClick={() => handleSwitch('hi')}
        aria-pressed={currentLang === 'hi'}
      >
        {t('header.langHi')}
      </button>
    </div>
  )
}

export default LanguageSwitcher
