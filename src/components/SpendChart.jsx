import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '../services/formatters.js'

function SpendChart({ data }) {
  const { t } = useTranslation()

  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{t('chart.eyebrow')}</p>
          <h2>{t('chart.heading')}</h2>
        </div>
        <span className="panel-note">{t('chart.note')}</span>
      </div>
      {data.length === 0 ? (
        <div className="empty-state chart-empty">{t('chart.empty')}</div>
      ) : (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 14, right: 8, left: -18, bottom: 0 }} barGap={7}>
              <CartesianGrid stroke="#e5e9e3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#758078', fontSize: 12 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#758078', fontSize: 12 }}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip
                cursor={{ fill: '#f3f6f1' }}
                formatter={(value, name) => [formatCurrency(value), name === 'income' ? t('chart.income') : t('chart.expenses')]}
                contentStyle={{ border: '1px solid #dfe7dc', borderRadius: 10, boxShadow: '0 8px 24px rgba(37, 55, 42, .12)' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#637067', paddingTop: 8 }}
                formatter={(value) => (value === 'income' ? t('chart.income') : t('chart.expenses'))}
              />
              <Bar dataKey="income" name="income" fill="#2f806c" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="expenses" name="expenses" fill="#e28a5c" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default SpendChart
