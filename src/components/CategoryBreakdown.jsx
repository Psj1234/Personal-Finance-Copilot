import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '../services/formatters.js'

const colors = ['#2f806c', '#e28a5c', '#d7ad5d', '#6c8f9e', '#a36b8c', '#839d63', '#bf785d', '#58756e', '#b8a078']

function CategoryBreakdown({ data }) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)

  return (
    <section className="panel category-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">WHERE IT GOES</p>
          <h2>Spending by category</h2>
        </div>
        <span className="panel-note">{formatCurrency(total)} total</span>
      </div>
      {data.length === 0 ? (
        <div className="empty-state chart-empty">No categories to display yet.</div>
      ) : (
        <div className="category-content">
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="amount" nameKey="category" innerRadius="62%" outerRadius="84%" paddingAngle={3} stroke="none">
                  {data.map((item, index) => <Cell key={item.category} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ border: '1px solid #dfe7dc', borderRadius: 10, boxShadow: '0 8px 24px rgba(37, 55, 42, .12)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-total">
              <strong>{formatCurrency(total)}</strong>
              <span>spent</span>
            </div>
          </div>
          <div className="category-legend">
            {data.slice(0, 6).map((item, index) => (
              <div className="legend-row" key={item.category}>
                <span className="legend-label"><i style={{ backgroundColor: colors[index % colors.length] }} />{item.category}</span>
                <strong>{formatCurrency(item.amount)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default CategoryBreakdown
