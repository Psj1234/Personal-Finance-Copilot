import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import hi from './locales/hi.json'

export const STORAGE_KEY = 'finance_copilot_lang'

const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
const initialLanguage = savedLanguage === 'hi' || savedLanguage === 'en' ? savedLanguage : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

i18n.on('languageChanged', (lng) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lng)
      document.documentElement.lang = lng
    }
  } catch {
    // Ignore storage quota or access errors in restricted modes
  }
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage
}

export default i18n
