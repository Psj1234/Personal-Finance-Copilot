import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../services/formatters.js'

const cards = [
  { key: 'totalIncome', tone: 'income', prefix: '+' },
  { key: 'totalExpenses', tone: 'expense', prefix: '-' },
  { key: 'balance', tone: 'balance', prefix: '' },
]

function SummaryCards({ summary, largestCategory }) {
  const { t } = useTranslation()

  return (
    <section className="summary-grid" aria-label={t('summary.financialSummary', 'Financial summary')}>
      {cards.map((card) => (
        <article className={`summary-card ${card.tone}`} key={card.key}>
          <div className="summary-card-topline">
            <span>{t(`summary.${card.key}`)}</span>
            <span className="card-dot" aria-hidden="true" />
          </div>
          <strong>{card.prefix}{formatCurrency(summary[card.key])}</strong>
          <small>{card.key === 'balance' ? t('summary.afterSpending') : t('summary.acrossMonths')}</small>
        </article>
      ))}
      <article className="summary-card category-card">
        <div className="summary-card-topline">
          <span>{t('summary.largestCategory')}</span>
          <span className="category-rank">01</span>
        </div>
        <strong>{largestCategory?.category || t('summary.noSpendingYet')}</strong>
        <small>{largestCategory ? formatCurrency(largestCategory.amount) : t('summary.addTransactionHint')}</small>
      </article>
    </section>
  )
}

export default SummaryCards
