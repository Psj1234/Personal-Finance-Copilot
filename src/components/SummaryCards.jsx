import { formatCurrency } from '../services/formatters.js'

const cards = [
  { key: 'totalIncome', label: 'Total income', tone: 'income', prefix: '+' },
  { key: 'totalExpenses', label: 'Total expenses', tone: 'expense', prefix: '-' },
  { key: 'balance', label: 'Current balance', tone: 'balance', prefix: '' },
]

function SummaryCards({ summary, largestCategory }) {
  return (
    <section className="summary-grid" aria-label="Financial summary">
      {cards.map((card) => (
        <article className={`summary-card ${card.tone}`} key={card.key}>
          <div className="summary-card-topline">
            <span>{card.label}</span>
            <span className="card-dot" aria-hidden="true" />
          </div>
          <strong>{card.prefix}{formatCurrency(summary[card.key])}</strong>
          <small>{card.key === 'balance' ? 'After recorded spending' : 'Across all recorded months'}</small>
        </article>
      ))}
      <article className="summary-card category-card">
        <div className="summary-card-topline">
          <span>Largest spending category</span>
          <span className="category-rank">01</span>
        </div>
        <strong>{largestCategory?.category || 'No spending yet'}</strong>
        <small>{largestCategory ? formatCurrency(largestCategory.amount) : 'Add a transaction to see it here'}</small>
      </article>
    </section>
  )
}

export default SummaryCards
