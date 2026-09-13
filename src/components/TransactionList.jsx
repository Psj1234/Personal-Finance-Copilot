import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../services/formatters.js'

function formatDate(date, lang = 'en') {
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN'
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function TransactionList({ transactions }) {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.resolvedLanguage || i18n.language || 'en'

  return (
    <section className="panel transactions-panel" id="transactions">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{t('transactions.eyebrow')}</p>
          <h2>{t('transactions.heading')}</h2>
        </div>
        <span className="panel-note">{t('transactions.note')}</span>
      </div>
      {transactions.length === 0 ? (
        <div className="empty-state">{t('transactions.empty')}</div>
      ) : (
        <div className="transaction-list">
          {transactions.map((transaction) => (
            <div className="transaction-row" key={transaction.id}>
              <div className={`transaction-icon ${transaction.type}`} aria-hidden="true">
                {transaction.type === 'income' ? '↑' : '↓'}
              </div>
              <div className="transaction-main">
                <strong>{transaction.merchant}</strong>
                <span>{transaction.category || t('transactions.otherCategory')} · {formatDate(transaction.date, currentLang)}</span>
              </div>
              <strong className={`transaction-amount ${transaction.type}`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default TransactionList
