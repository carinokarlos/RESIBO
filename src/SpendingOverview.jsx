import { useMemo, useState } from 'react'

const parseLocalDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  return Number.isNaN(date.getTime()) ? null : date
}

const toIsoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12)
const formatDate = (value) => {
  const date = parseLocalDate(value)
  return date ? date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : 'Date unavailable'
}
const formatCurrency = (minor) => `₱${(Math.max(0, Number.isFinite(minor) ? minor : 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatCompactCurrency = (minor) => {
  const value = Math.max(0, Number.isFinite(minor) ? minor : 0) / 100
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toLocaleString('en-PH', { maximumFractionDigits: 1 })}M`
  if (value >= 1_000) return `₱${(value / 1_000).toLocaleString('en-PH', { maximumFractionDigits: 1 })}K`
  return `₱${Math.round(value)}`
}

const niceTickStep = (maximum, intervals = 3) => {
  if (maximum <= 0) return 100
  const raw = maximum / Math.max(1, intervals)
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return Math.max(100, nice * magnitude)
}

const transactionDate = (transaction) => {
  const value = transaction.isoDate || transaction.date
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : ''
}

export function bucketSpending(transactions, cycleStart, cycleEndExclusive, today = toIsoDate(new Date())) {
  const expenses = (Array.isArray(transactions) ? transactions : []).filter((transaction) =>
    transaction && transaction.type === 'expense' && !transaction.isCreditCardPayment && Number.isFinite(Number(transaction.amount)) && Number(transaction.amount) < 0,
  )
  const byDay = new Map()
  for (const transaction of expenses) {
    const date = transactionDate(transaction)
    if (!date) continue
    const amountMinor = Math.round(Math.abs(Number(transaction.amount)) * 100)
    if (!amountMinor) continue
    const row = byDay.get(date) || { date, amountMinor: 0, categories: new Map() }
    row.amountMinor += amountMinor
    const category = String(transaction.category || '').trim() || 'Uncategorized'
    row.categories.set(category, (row.categories.get(category) || 0) + amountMinor)
    byDay.set(date, row)
  }

  const validStart = parseLocalDate(cycleStart)
  const fallbackStart = [...byDay.keys()].sort()[0]
  const start = validStart || parseLocalDate(fallbackStart) || parseLocalDate(today) || new Date()
  const validEnd = parseLocalDate(cycleEndExclusive)
  const todayDate = parseLocalDate(today) || start
  const finalCycleDay = validEnd ? addDays(validEnd, -1) : todayDate
  const end = todayDate < finalCycleDay ? todayDate : finalCycleDay
  const days = []
  if (end >= start) {
    for (let date = start; date <= end; date = addDays(date, 1)) {
      const isoDate = toIsoDate(date)
      const source = byDay.get(isoDate)
      const topCategory = source
        ? [...source.categories.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || 'Uncategorized'
        : ''
      days.push({ key: isoDate, date: isoDate, label: formatDate(isoDate), amountMinor: source?.amountMinor || 0, topCategory, categoryTotals: Object.fromEntries(source?.categories || []) })
    }
  }
  const totalMinor = days.reduce((sum, day) => sum + day.amountMinor, 0)
  const highestDay = totalMinor > 0 ? days.reduce((highest, day) => day.amountMinor > (highest?.amountMinor ?? -1) ? day : highest, null) : null
  const noSpendDays = days.filter((day) => day.amountMinor === 0).length
  const avgPerDayMinor = days.length ? Math.round(totalMinor / days.length) : 0
  return { days, totalMinor, highestDay, noSpendDays, avgPerDayMinor }
}

const bucketByWeek = (days) => {
  const weeks = []
  for (let index = 0; index < days.length; index += 7) {
    const slice = days.slice(index, index + 7)
    if (!slice.length) continue
    const categoryTotals = new Map()
    slice.forEach((day) => Object.entries(day.categoryTotals || {}).forEach(([category, amount]) => categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount)))
    const topCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || ''
    weeks.push({ key: slice[0].date, date: slice[0].date, endDate: slice.at(-1).date, label: slice[0].label, amountMinor: slice.reduce((sum, day) => sum + day.amountMinor, 0), topCategory })
  }
  return weeks
}

const bucketByCategory = (transactions) => {
  const totals = new Map()
  for (const transaction of Array.isArray(transactions) ? transactions : []) {
    if (!transaction || transaction.type !== 'expense' || transaction.isCreditCardPayment || !Number.isFinite(Number(transaction.amount)) || Number(transaction.amount) >= 0) continue
    const category = String(transaction.category || '').trim() || 'Uncategorized'
    const amountMinor = Math.round(Math.abs(Number(transaction.amount)) * 100)
    if (amountMinor) totals.set(category, (totals.get(category) || 0) + amountMinor)
  }
  return [...totals.entries()]
    .map(([category, amountMinor]) => ({ key: category, label: category, category, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor || a.category.localeCompare(b.category))
}

const tickIndicesForDays = (days) => days.flatMap((day, index) => {
  const date = parseLocalDate(day.date)
  return date && (date.getDate() === 1 || date.getDate() % 5 === 0) ? [index] : []
})

export default function SpendingOverview({ transactions, cycleStart, cycleEndExclusive, grouping, groupingControl }) {
  const [activeTooltip, setActiveTooltip] = useState(null)
  const summary = useMemo(() => bucketSpending(transactions, cycleStart, cycleEndExclusive), [transactions, cycleStart, cycleEndExclusive])
  const rows = useMemo(() => grouping === 'category' ? bucketByCategory(transactions) : grouping === 'week' ? bucketByWeek(summary.days) : summary.days, [grouping, summary.days, transactions])
  const maxValue = Math.max(0, ...rows.map((row) => row.amountMinor))
  const step = niceTickStep(maxValue)
  const axisMax = maxValue > 0 ? Math.ceil(maxValue / step) * step : step * 3
  const tickCount = Math.min(4, Math.floor(axisMax / step) + 1)
  const ticks = Array.from({ length: Math.max(2, tickCount) }, (_, index) => index * step)
  const chartHeight = grouping === 'category' ? Math.max(158, rows.length * 28 + 31) : 158
  const plot = { left: 76, right: 982, top: 12, bottom: chartHeight - 31 }
  const plotWidth = plot.right - plot.left
  const plotHeight = plot.bottom - plot.top
  const tickIndices = grouping === 'day' ? tickIndicesForDays(rows) : rows.map((_, index) => index)
  const tooltipRow = activeTooltip ? rows.find((row) => row.key === activeTooltip) : null
  const tooltipDate = tooltipRow?.date ? grouping === 'week' ? `${formatDate(tooltipRow.date)} – ${formatDate(tooltipRow.endDate)}` : formatDate(tooltipRow.date) : ''
  const tooltipX = tooltipRow && rows.length ? grouping === 'category' ? 50 : 76 + (rows.indexOf(tooltipRow) + .5) / rows.length * plotWidth : 500

  const renderVerticalBars = () => {
    const slotWidth = rows.length ? plotWidth / rows.length : plotWidth
    const barWidth = Math.max(2, Math.min(30, slotWidth * .66))
    return rows.map((row, index) => {
      const x = plot.left + index * slotWidth + (slotWidth - barWidth) / 2
      const height = maxValue ? Math.max(row.amountMinor ? 2 : 0, row.amountMinor / axisMax * plotHeight) : 0
      const y = plot.bottom - height
      const topDay = grouping === 'day' && summary.highestDay?.date === row.date && row.amountMinor > 0
      const highlighted = topDay || (grouping === 'week' && row.amountMinor === maxValue && maxValue > 0)
      const showTick = grouping === 'week' || tickIndices.includes(index)
      return <g key={row.key}>
        {showTick && <text className="spending-chart-x-label" x={x + barWidth / 2} y={chartHeight - 7} textAnchor="middle">{row.label}</text>}
        <rect className="spending-chart-hitarea" x={plot.left + index * slotWidth} y={plot.top} width={Math.max(slotWidth, 1)} height={plotHeight} onPointerEnter={() => setActiveTooltip(row.key)} onFocus={() => setActiveTooltip(row.key)} onClick={() => setActiveTooltip(row.key)} role="button" tabIndex="0" aria-label={`${row.label}: ${formatCurrency(row.amountMinor)}${row.amountMinor ? `, ${row.topCategory || 'Uncategorized'}` : ', No spending'}`} />
        <rect className={`spending-bar${highlighted ? ' spending-bar-highest' : ''}${row.amountMinor ? '' : ' spending-bar-zero'}`} x={x} y={row.amountMinor ? y : plot.bottom - 1} width={barWidth} height={row.amountMinor ? height : 1} rx="3" pointerEvents="none" />
      </g>
    })
  }

  const renderCategoryBars = () => {
    const rowHeight = 28
    const categoryLabelWidth = 150
    const barStart = plot.left + categoryLabelWidth
    const categoryPlotWidth = Math.max(1, plot.right - barStart)
    return rows.map((row, index) => {
      const y = plot.top + index * rowHeight
      const width = maxValue ? row.amountMinor / axisMax * categoryPlotWidth : 0
      return <g key={row.key}>
        <text className="spending-chart-category-label" x={plot.left - 8} y={y + 13} textAnchor="end" title={row.category}>{row.category}</text>
        <rect className="spending-chart-hitarea" x={barStart} y={y} width={categoryPlotWidth} height={rowHeight - 4} onPointerEnter={() => setActiveTooltip(row.key)} onFocus={() => setActiveTooltip(row.key)} onClick={() => setActiveTooltip(row.key)} role="button" tabIndex="0" aria-label={`${row.category}: ${formatCurrency(row.amountMinor)}`} />
        <rect className={`spending-bar${index === 0 && maxValue > 0 ? ' spending-bar-highest' : ''}`} x={barStart} y={y + 4} width={Math.max(width, width > 0 ? 2 : 0)} height={rowHeight - 12} rx="3" pointerEvents="none" />
      </g>
    })
  }

  return <article className="panel spending-panel spending-overview-panel">
    <div className="panel-heading">
      <div><div className="eyebrow">SPENDING THIS CYCLE</div><h2>Spending overview</h2></div>
      {groupingControl}
    </div>
    {summary.totalMinor > 0 ? <>
      <div className={`chart-wrap spending-chart-wrap${grouping === 'category' ? ' spending-chart-category-mode' : ''}`} onMouseLeave={() => setActiveTooltip(null)}>
        {grouping !== 'category' && <div className="chart-labels spending-chart-y-labels" style={{ height: chartHeight }} aria-hidden="true">{ticks.map((tick) => <span key={tick} style={{ top: plot.bottom - tick / axisMax * plotHeight }}>{formatCompactCurrency(tick)}</span>)}</div>}
        <div className="spending-chart-scroll" key={grouping}>
          <div className="spending-chart-area" style={{ height: chartHeight }}>
            {ticks.map((tick) => {
              const position = grouping === 'category' ? plot.left + 150 + (plot.right - plot.left - 150) * tick / axisMax : plot.bottom - tick / axisMax * plotHeight
              return <div key={tick} className={`spending-svg-gridline${grouping === 'category' ? ' spending-svg-gridline-vertical' : ''}`} style={grouping === 'category' ? { left: `${position / 10}%`, top: plot.top, bottom: 31 } : { top: position }} />
            })}
            <svg className="spending-bar-chart" viewBox={`0 0 1000 ${chartHeight}`} preserveAspectRatio="none" role="group" aria-label={`Spending by ${grouping} bar chart`}>
              {grouping === 'category' ? renderCategoryBars() : renderVerticalBars()}
              {grouping === 'category' && ticks.map((tick, index) => <text key={`x-${tick}`} className="spending-chart-x-label" x={plot.left + 150 + (plot.right - plot.left - 150) * tick / axisMax} y={chartHeight - 7} textAnchor={index === 0 ? 'start' : index === ticks.length - 1 ? 'end' : 'middle'}>{formatCompactCurrency(tick)}</text>)}
            </svg>
            {tooltipRow && <div className="spending-chart-tooltip" style={{ left: `clamp(100px, ${tooltipX / 10}%, calc(100% - 100px))` }} role="status">
              <strong>{grouping === 'category' ? tooltipRow.category : tooltipDate || 'Date unavailable'}</strong>
              <span>{tooltipRow.amountMinor ? formatCurrency(tooltipRow.amountMinor) : 'No spending'}</span>
              {grouping !== 'category' && <small>{tooltipRow.amountMinor ? tooltipRow.topCategory || 'Uncategorized' : 'No spending'}</small>}
            </div>}
          </div>
        </div>
      </div>
    </> : <div className="spending-chart-empty">No spending this cycle yet</div>}
    <div className="chart-footer spending-chart-footer">
      <div className="spending-chart-stats">
        <span>Avg/day <strong>{formatCurrency(summary.avgPerDayMinor)}</strong></span>
        <span>Highest day <strong>{summary.highestDay ? `${formatCurrency(summary.highestDay.amountMinor)} (${formatDate(summary.highestDay.date)})` : '—'}</strong></span>
        <span>No-spend days <strong>{summary.noSpendDays}</strong></span>
      </div>
      <span className="chart-total">{formatCurrency(summary.totalMinor)} <small>total this cycle</small></span>
    </div>
  </article>
}
