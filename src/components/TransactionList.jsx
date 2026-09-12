import { formatCurrency } from '../services/formatters.js'

function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function TransactionList({ transactions }) {
  return (
    <section className="panel transactions-panel" id="transactions">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ACTIVITY</p>
          <h2>Recent transactions</h2>
        </div>
        <span className="panel-note">Latest 5</span>
      </div>
      {transactions.length === 0 ? (
        <div className="empty-state">No transactions yet. Add your first one to start building your picture.</div>
      ) : (
        <div className="transaction-list">
          {transactions.map((transaction) => (
            <div className="transaction-row" key={transaction.id}>
              <div className={`transaction-icon ${transaction.type}`} aria-hidden="true">
                {transaction.type === 'income' ? '↑' : '↓'}
              </div>
              <div className="transaction-main">
                <strong>{transaction.merchant}</strong>
                <span>{transaction.category || 'Other'} · {formatDate(transaction.date)}</span>
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
