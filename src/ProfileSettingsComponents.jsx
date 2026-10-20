import { useEffect, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as RowChevron, CreditCard, Download, Minus, Monitor, Moon, Sun } from 'lucide-react'

export const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'activity', label: 'Activity' },
  { id: 'automations', label: 'Automations' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'security', label: 'Security' },
]

const validSettingsTab = (tab) => SETTINGS_TABS.some((entry) => entry.id === tab)
const settingsTabFromHash = () => {
  const match = window.location.hash.match(/^#settings\/([^/?#]+)/)
  return match && validSettingsTab(match[1]) ? match[1] : null
}
const settingsHash = (tab) => `#settings/${tab}`
const storeSettingsTab = (tab) => {
  try { window.localStorage.setItem('resibo-settings-tab', tab) } catch { /* Keep the selected tab for this session. */ }
}

export function useSettingsTab({ isDirty, onDiscard, onRouteRestore }) {
  const [tab, setTab] = useState(() => {
    const fromHash = settingsTabFromHash()
    if (fromHash) return fromHash
    if (window.location.hash) return 'profile'
    try {
      const remembered = window.localStorage.getItem('resibo-settings-tab')
      return validSettingsTab(remembered) ? remembered : 'profile'
    } catch { return 'profile' }
  })
  const [pendingTab, setPendingTab] = useState(null)
  const tabRef = useRef(tab)
  const dirtyRef = useRef(isDirty)
  const discardRef = useRef(onDiscard)
  const routeRestoreRef = useRef(onRouteRestore)
  tabRef.current = tab
  dirtyRef.current = isDirty
  discardRef.current = onDiscard
  routeRestoreRef.current = onRouteRestore

  const commitTab = (nextTab, { updateHash = true, replaceHash = false } = {}) => {
    if (!validSettingsTab(nextTab)) nextTab = 'profile'
    tabRef.current = nextTab
    setTab(nextTab)
    storeSettingsTab(nextTab)
    if (updateHash && window.location.hash !== settingsHash(nextTab)) {
      const nextUrl = `${window.location.pathname}${window.location.search}${settingsHash(nextTab)}`
      window.history[replaceHash ? 'replaceState' : 'pushState'](null, '', nextUrl)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const requestTab = (nextTab) => {
    if (!validSettingsTab(nextTab) || nextTab === tabRef.current) return
    if (dirtyRef.current) setPendingTab({ target: nextTab, fromHistory: false })
    else commitTab(nextTab)
  }

  useEffect(() => {
    const syncFromLocation = () => {
      const incoming = settingsTabFromHash() || 'profile'
      if (incoming !== tabRef.current && dirtyRef.current) {
        setPendingTab({ target: incoming, fromHistory: true })
        const restoreUrl = `${window.location.pathname}${window.location.search}${settingsHash(tabRef.current)}`
        window.history.replaceState(null, '', restoreUrl)
        return
      }
      if (incoming !== tabRef.current) commitTab(incoming, { updateHash: false })
      if (window.location.hash.startsWith('#settings/')) routeRestoreRef.current?.()
    }
    window.addEventListener('hashchange', syncFromLocation)
    window.addEventListener('popstate', syncFromLocation)
    return () => {
      window.removeEventListener('hashchange', syncFromLocation)
      window.removeEventListener('popstate', syncFromLocation)
    }
  }, [])

  const stayOnTab = () => setPendingTab(null)
  const discardAndSwitch = () => {
    if (!pendingTab) return
    discardRef.current?.()
    const target = pendingTab.target
    setPendingTab(null)
    commitTab(target)
  }

  return { tab, requestTab, pendingTab, stayOnTab, discardAndSwitch, syncTabHash: () => commitTab(tabRef.current, { replaceHash: Boolean(window.location.hash) }) }
}

export function SettingsTabs({ activeTab, onSelect, activityCount, automationCount }) {
  const tabRefs = useRef([])
  const tabs = SETTINGS_TABS.map((entry) => ({
    ...entry,
    count: entry.id === 'activity' ? activityCount : entry.id === 'automations' ? automationCount : null,
  }))
  const focusTab = (index) => {
    const nextIndex = (index + tabs.length) % tabs.length
    tabRefs.current[nextIndex]?.focus()
    onSelect(tabs[nextIndex].id)
    tabRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  useEffect(() => {
    const index = tabs.findIndex((entry) => entry.id === activeTab)
    tabRefs.current[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeTab])
  return <div className="settings-tabs" role="tablist" aria-label="Profile and settings sections">
    {tabs.map((entry, index) => <button type="button" role="tab" key={entry.id} id={`settings-tab-${entry.id}`} aria-selected={activeTab === entry.id} aria-controls={`settings-panel-${entry.id}`} tabIndex={activeTab === entry.id ? 0 : -1} ref={(node) => { tabRefs.current[index] = node }} onClick={() => onSelect(entry.id)} onKeyDown={(event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); focusTab(index + 1) }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); focusTab(index - 1) }
      else if (event.key === 'Home') { event.preventDefault(); focusTab(0) }
      else if (event.key === 'End') { event.preventDefault(); focusTab(tabs.length - 1) }
    }}>
      <span>{entry.label}</span>{entry.count != null && <small>{entry.count}</small>}
    </button>)}
  </div>
}

export function SettingsTabGuardDialog({ onStay, onDiscard }) {
  return <div className="modal-backdrop settings-tab-guard-backdrop"><section className="add-modal settings-tab-guard" role="alertdialog" aria-modal="true" aria-labelledby="settings-tab-guard-title" aria-describedby="settings-tab-guard-description">
    <h2 id="settings-tab-guard-title">Discard changes?</h2><p id="settings-tab-guard-description">Your profile has unsaved changes. Stay here to keep editing, or discard them and switch tabs.</p>
    <div><button type="button" className="secondary-button" onClick={onStay}>Stay</button><button type="button" className="primary-button" onClick={onDiscard}>Discard</button></div>
  </section></div>
}

const safeValue = (value) => value == null || (typeof value === 'number' && !Number.isFinite(value)) || value === '' ? '—' : value

export function AccountSummaryCard({ loading, createdAt, paymentMethods, transactions, activeSchedules, spend, breakdown, transactionsDetail, onProfile, onPaymentMethods, onTransactions, onSchedules }) {
  const rows = [
    ...(createdAt ? [['Member since', createdAt]] : []),
    ['Payment methods', paymentMethods, breakdown],
    ['Transactions', transactions, transactionsDetail],
    ['Automatic schedules', activeSchedules == null ? '—' : `${activeSchedules} active`],
    ['Current cycle spend', spend],
  ]
  const actions = { 'Member since': onProfile, 'Payment methods': onPaymentMethods, Transactions: onTransactions, 'Automatic schedules': onSchedules, 'Current cycle spend': onTransactions }
  return <section className="panel account-summary-card"><div className="eyebrow">YOUR ACCOUNT</div><h2>Account summary</h2>{loading ? <div className="account-summary-rows" aria-label="Loading account summary">{rows.map(([label]) => <div className="account-summary-skeleton" key={label}><i/><i/></div>)}</div> : <div className="account-summary-rows">{rows.map(([label, value, detail]) => { const action = actions[label]; const Row = action ? 'button' : 'div'; return <Row key={label} type={action ? 'button' : undefined} className={`account-summary-row${action ? ' is-clickable' : ''}`} onClick={action}><span>{label}{detail && <small>{detail}</small>}</span><strong>{safeValue(value)}</strong></Row> })}</div>}</section>
}

const localIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const parseLocalIso = (value) => {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
const formatLongDate = (value) => parseLocalIso(value)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) || ''
const formatDateRange = (start, end) => {
  const startDate = parseLocalIso(start)
  const endDate = parseLocalIso(end)
  if (!startDate || !endDate) return ''
  const startLabel = startDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', ...(startDate.getFullYear() !== endDate.getFullYear() ? { year: 'numeric' } : {}) })
  return `${startLabel} – ${formatLongDate(end)}`
}

export function ActivityDateRangePicker({ preset, startDate, endDate, onPresetChange, onCustomRangeChange }) {
  const [open, setOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => startDate ? parseLocalIso(startDate) : new Date())
  const presets = [
    ['all_time', 'All time'], ['this_month', 'This month'], ['last_month', 'Last month'],
    ['last_30_days', 'Last 30 days'], ['custom', 'Custom range'],
  ]
  const today = new Date()
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let displayRange = null
  if (preset === 'this_month') displayRange = [new Date(today.getFullYear(), today.getMonth(), 1), currentDate]
  if (preset === 'last_month') displayRange = [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)]
  if (preset === 'last_30_days') { const start = new Date(currentDate); start.setDate(start.getDate() - 29); displayRange = [start, currentDate] }
  const label = preset === 'all_time' ? 'All time'
    : preset === 'custom' ? startDate && endDate ? formatDateRange(startDate, endDate) : 'Choose date range'
      : displayRange ? formatDateRange(localIso(displayRange[0]), localIso(displayRange[1])) : presets.find(([key]) => key === preset)?.[1] || 'This month'
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(gridStart); day.setDate(gridStart.getDate() + index); return day })
  const selectDay = (date) => {
    const selected = localIso(date)
    if (!startDate || endDate || selected < startDate) onCustomRangeChange(selected, '')
    else onCustomRangeChange(startDate, selected)
  }
  return <div className="activity-date-range">
    <button type="button" className="activity-date-range-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}><CalendarDays size={14}/><span>{label}</span><ChevronRight size={13}/></button>
    {open && <div className="activity-date-range-popover"><div className="activity-date-presets">{presets.map(([key, title]) => <button type="button" key={key} className={preset === key ? 'selected' : ''} onClick={() => { onPresetChange(key); if (key === 'custom') setCalendarMonth(startDate ? parseLocalIso(startDate) : new Date()); else setOpen(false) }}>{title}</button>)}</div>{preset === 'custom' && <div className="activity-calendar"><div className="activity-calendar-heading"><button type="button" aria-label="Previous month" onClick={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft size={15}/></button><strong>{calendarMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Next month" onClick={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight size={15}/></button></div><div className="activity-calendar-grid">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span className="weekday" key={`${day}-${index}`}>{day}</span>)}{days.map((day) => { const value = localIso(day); const selected = value === startDate || value === endDate; const inRange = startDate && endDate && value >= startDate && value <= endDate; return <button type="button" key={value} className={`${day.getMonth() !== calendarMonth.getMonth() ? 'outside ' : ''}${selected ? 'selected ' : ''}${inRange ? 'in-range' : ''}`} aria-pressed={selected} onClick={() => selectDay(day)}>{day.getDate()}</button> })}</div><small>{startDate ? `Start: ${formatLongDate(startDate)}` : 'Choose a start date'}{endDate ? ` · End: ${formatLongDate(endDate)}` : startDate ? ' · Choose an end date' : ''}</small></div>}</div>}
  </div>
}

const safeCardLabel = (value) => {
  const label = String(value ?? '').trim()
  return !label || /^(payment method|unknown|undefined|null|nan)$/i.test(label) ? '' : label
}

const cardIdentity = (bank, label, lastFour) => {
  const identity = safeCardLabel(bank) || safeCardLabel(label)
  const digits = String(lastFour ?? '').replace(/\D/g, '').slice(-4)
  if (!identity) return digits ? `••${digits}` : ''
  return `${identity}${digits ? ` ••${digits}` : ''}`
}

const methodAccountLabel = (method) => {
  if (!method) return ''
  if (method.groupId === 'cash') return 'Cash'
  if (method.groupId === 'ewallet') return safeCardLabel(method.customLabel) || safeCardLabel(method.issuer) || safeCardLabel(method.name)
  const bank = safeCardLabel(method.issuer) || safeCardLabel(method.name)
  if (!bank) return ''
  const lastFour = safeCardLabel(method.lastFour)
  const holder = safeCardLabel(method.cardholderName)
  const type = method.groupId === 'debit' ? ' · Debit' : method.groupId === 'credit' ? ' · Credit' : ''
  return `${bank}${lastFour ? ` (${lastFour})` : ''}${holder ? ` - (${holder})` : ''}${type}`
}

export function buildActivityRowPresentation({ entry, snapshot, paymentMethods = [] }) {
  const payment = snapshot?.event_type === 'credit_card_payment'
  const balance = snapshot?.event_type === 'payment_method_balance'
  const amount = Number(snapshot?.amount_minor ?? (balance ? snapshot?.balance_minor : undefined))
  const signedAmount = Number.isFinite(amount)
    ? balance ? 0 : payment ? -Math.abs(amount) : snapshot?.type === 'income' ? Math.abs(amount) : snapshot?.type === 'expense' ? -Math.abs(amount) : amount
    : null
  const direction = signedAmount > 0 ? 'inflow' : signedAmount < 0 ? 'outflow' : 'neutral'
  const targetName = safeCardLabel(snapshot?.credit_card_name) || cardIdentity(snapshot?.credit_card_bank, snapshot?.credit_card_label, snapshot?.credit_card_last_four)
  const sourceName = safeCardLabel(snapshot?.source_name) || safeCardLabel(snapshot?.source_account_full_name) || cardIdentity(snapshot?.source_bank, snapshot?.source_card_label, snapshot?.source_last_four)
  const note = safeCardLabel(String(snapshot?.note ?? '').trim().replace(/\s+·\s+Automatic$/i, ''))
  const rawPaymentMethod = safeCardLabel(snapshot?.payment_method)
  const linkedMethod = paymentMethods.find((method) => String(method.userMethodId ?? method.id) === String(snapshot?.payment_method_id ?? ''))
  const accountLabel = safeCardLabel(snapshot?.account_full_name) || safeCardLabel(snapshot?.account_label) || methodAccountLabel(linkedMethod) || (snapshot?.account_type === 'cash' || /^cash$/i.test(rawPaymentMethod) ? 'Cash' : /^(debit|credit) card$/i.test(rawPaymentMethod) ? '' : rawPaymentMethod)
  const rawTitle = payment ? targetName ? `Payment to ${targetName}` : 'Card payment' : balance ? safeCardLabel(snapshot?.name) || 'Payment method balance' : safeCardLabel(snapshot?.name) || note || safeCardLabel(snapshot?.category) || `${snapshot?.type === 'income' ? 'Income' : 'Expense'} transaction`
  const title = String(rawTitle || 'Transaction').replace(/^./u, (character) => character.toLocaleUpperCase())
  const categoryValue = safeCardLabel(snapshot?.category)
  const category = !payment && categoryValue && categoryValue.trim().toLocaleLowerCase() !== title.trim().toLocaleLowerCase() ? categoryValue : ''
  const explicitDescription = String(snapshot?.description ?? '').trim()
  const description = safeCardLabel(explicitDescription) && explicitDescription.toLocaleLowerCase() !== title.toLocaleLowerCase()
    ? explicitDescription
    : !payment && !balance && note && note.toLocaleLowerCase() !== title.toLocaleLowerCase() ? note : ''
  const paymentMethod = !payment && !balance ? accountLabel : ''
  const transactionDate = safeCardLabel(snapshot?.date)
  const subline = payment ? [sourceName && `${sourceName} → ${targetName}`, transactionDate].filter(Boolean).join(' · ') : [category || description, paymentMethod, transactionDate].filter(Boolean).join(' · ')
  const actionLabel = ({ create: 'Created', update: 'Updated', delete: 'Deleted' })[entry?.action] || 'Updated'
  return {
    title,
    category,
    description,
    paymentMethod,
    accountLabel: payment ? sourceName || targetName : paymentMethod,
    detailLine: subline,
    subline,
    direction,
    payment,
    balance,
    typeLabel: payment ? 'Card payment' : balance ? 'Balance' : snapshot?.type || entry?.transaction_type || 'Activity',
    actionLabel,
    automatic: entry?.source === 'automatic',
    tooltip: payment ? [title, subline].filter(Boolean).join(' · ') : entry?.transaction_id ? `Transaction ${entry.transaction_id}` : '',
  }
}

export function ProfileForm({ children, onSubmit, dirty, busy, onDiscard, saved }) {
  return <form className="panel profile-editor" onSubmit={onSubmit}>{children}<div className="profile-save-actions"><button className="primary-button save-button" type="submit" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save changes'}</button>{dirty && <button className="text-button" type="button" onClick={onDiscard}>Discard</button>}{saved && !dirty && <span className="profile-saved-label" role="status">Profile saved.</span>}</div></form>
}

const validText = (value) => {
  const text = String(value ?? '').trim()
  return !text || /^(undefined|null|nan)$/i.test(text) ? '' : text
}

const formatAuditCurrency = (minor) => {
  const amount = Number(minor)
  return Number.isFinite(amount) ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount / 100) : '—'
}

const formatAuditValue = (value, field) => {
  if (value === null || value === undefined || value === '') return '—'
  if (field === 'amount_minor' || field === 'balance_minor' || field === 'credit_limit_minor') return formatAuditCurrency(value)
  if (field === 'date' || field === 'transaction_date') {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-PH', { dateStyle: 'medium' }) : validText(value) || '—'
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return validText(value) || '—'
}

const auditFieldLabels = { type: 'Type', amount_minor: 'Amount', date: 'Date', transaction_date: 'Date', category: 'Category', category_id: 'Category', note: 'Notes', payment_method: 'Account', account_label: 'Account' }

export function formatChangeSummary(before, after) {
  if (!before || !after) return []
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((field) => !['id', 'event_type', 'currency_code', 'payment_method_id', 'category_id'].includes(field) && JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null))
  return fields.map((field) => ({ field, label: auditFieldLabels[field] || field.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()), from: formatAuditValue(before[field], field), to: formatAuditValue(after[field], field) }))
}

export function buildRowTitle(entry, snapshot) { return buildActivityRowPresentation({ entry, snapshot }).title }
export function buildRowSubline(entry, snapshot) { return buildActivityRowPresentation({ entry, snapshot }).subline }

export function groupByDay(entries, allEntries = entries) {
  const dayKey = (entry) => {
    const date = new Date(entry?.occurred_at)
    return Number.isFinite(date.getTime()) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : 'unknown-date'
  }
  const totals = new Map()
  for (const entry of allEntries || []) {
    const key = dayKey(entry)
    const record = totals.get(key) || { income: 0, expense: 0 }
    const snapshot = entry.action === 'delete' ? entry.before_data : entry.after_data || entry.before_data
    const amount = Number(snapshot?.amount_minor)
    if (Number.isFinite(amount) && snapshot?.type === 'income') record.income += amount
    if (Number.isFinite(amount) && (snapshot?.type === 'expense' || snapshot?.event_type === 'credit_card_payment')) record.expense += amount
    totals.set(key, record)
  }
  const groups = new Map()
  for (const entry of entries || []) {
    const key = dayKey(entry)
    if (!groups.has(key)) groups.set(key, { key, date: key === 'unknown-date' ? null : new Date(`${key}T12:00:00`), entries: [], totals: totals.get(key) || { income: 0, expense: 0 } })
    groups.get(key).entries.push(entry)
  }
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key)).map((group) => ({ ...group, label: !group.date ? 'Date unavailable' : group.key === todayKey ? `Today · ${group.date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}` : group.key === yesterdayKey ? `Yesterday · ${group.date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}` : group.date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }))
}

export function ActionPill({ action }) {
  const label = ({ create: 'Created', update: 'Updated', delete: 'Deleted' })[action] || 'Updated'
  return <span className={`activity-action-pill activity-action-${action || 'update'}`}>{label}</span>
}

export function ActivityDayHeader({ group, currency }) {
  return <div className="activity-day-header"><strong>{group.label}</strong><span><b>In {currency(group.totals.income)}</b><b>Out {currency(group.totals.expense)}</b></span></div>
}

function ActivityDetails({ entry, snapshot, before, after, changes, actorName, occurredAtFull, row }) {
  const details = [
    ['Reference ID', entry.transaction_id ? `#${entry.transaction_id}` : `#${entry.id}`],
    ['Full timestamp', occurredAtFull],
    ['Performed by', validText(entry.actor_name || entry.actor) || actorName || 'You'],
    ['Account', row.accountLabel || '—'],
    ['Category', validText(snapshot?.category) || '—'],
    ['Notes', validText(snapshot?.note) || '—'],
  ]
  const deletedValues = entry.action === 'delete' ? Object.entries(before || {}).filter(([field]) => !['id', 'event_type', 'category_id', 'payment_method_id', 'source_method_id', 'credit_card_method_id'].includes(field)) : []
  return <div className="activity-detail-panel">
    <dl className="activity-detail-grid">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {entry.action === 'update' && changes.length > 0 && <div className="activity-change-table-wrap"><table className="activity-change-table"><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>{changes.map((change) => <tr key={change.field}><th>{change.label}</th><td>{change.from}</td><td>{change.to}</td></tr>)}</tbody></table></div>}
    {entry.action === 'delete' && <div className="activity-deleted-values"><strong>Last known values</strong>{deletedValues.map(([field, value]) => <span key={field}><b>{auditFieldLabels[field] || field.replaceAll('_', ' ')}</b>{formatAuditValue(value, field)}</span>)}</div>}
  </div>
}

export function ActivityRow({ entry, actorName, paymentMethods, expanded, onToggle }) {
  const before = entry.before_data || null
  const after = entry.after_data || null
  const snapshot = entry.action === 'delete' ? before : after || before
  const row = buildActivityRowPresentation({ entry, snapshot, paymentMethods })
  const changes = formatChangeSummary(before, after)
  const balance = snapshot?.event_type === 'payment_method_balance'
  const amount = Number(snapshot?.amount_minor ?? (balance ? snapshot?.balance_minor : undefined))
  const signedAmount = Number.isFinite(amount) ? balance ? 0 : row.direction === 'inflow' ? Math.abs(amount) : row.direction === 'outflow' ? -Math.abs(amount) : 0 : null
  const occurredDate = new Date(entry.occurred_at)
  const validDate = Number.isFinite(occurredDate.getTime())
  const time = validDate ? occurredDate.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '—'
  const fullTimestamp = validDate ? occurredDate.toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'medium' }) : '—'
  const ActivityIcon = row.payment ? CreditCard : row.direction === 'inflow' ? ArrowDownLeft : row.direction === 'outflow' ? ArrowUpRight : Minus
  const createDetail = row.payment ? row.detailLine : snapshot?.type === 'expense' ? [row.description, row.paymentMethod, validText(snapshot?.date)].filter(Boolean).join(' · ') : row.detailLine
  const summary = entry.action === 'update' && changes.length ? `${changes[0].label} ${changes[0].from} → ${changes[0].to}${changes.length > 1 ? ` · +${changes.length - 1} more` : ''}` : entry.action === 'delete' ? `Removed ${row.typeLabel.toLowerCase()} · ${row.title}` : createDetail || row.category || '—'
  const focused = row.payment && String(entry.focusId || '') === String(snapshot?.id || '')
  return <div className={`activity-row-wrap${expanded ? ' is-expanded' : ''}${entry.action === 'delete' ? ' is-deleted' : ''}${focused ? ' audit-history-target' : ''}`} data-payment-audit-id={row.payment ? snapshot?.id : undefined}>
    <button type="button" className="activity-row" aria-expanded={expanded} aria-label={`${row.actionLabel} ${row.typeLabel}: ${row.title}. ${expanded ? 'Collapse' : 'Expand'} details`} onClick={onToggle}>
      <span className={`audit-history-icon audit-direction-${row.direction}`}><ActivityIcon size={16}/></span>
      <span className="activity-row-main"><span className="activity-row-kicker"><ActionPill action={entry.action}/><span className="activity-row-type">{row.typeLabel}</span></span><strong title={row.title}>{row.title}</strong><small title={summary}>{entry.action === 'create' && !row.payment && snapshot?.type === 'expense' && row.category && <i className="activity-category-chip" title={row.category}>{row.category}</i>}{summary}</small></span>
      <span className="activity-row-meta"><time dateTime={entry.occurred_at} title={fullTimestamp}>{time}</time><strong className={`activity-row-amount ${signedAmount > 0 ? 'is-income' : signedAmount < 0 ? 'is-expense' : ''}`}>{signedAmount === null ? '—' : `${!balance && signedAmount > 0 ? '+' : !balance && signedAmount < 0 ? '−' : ''}${formatAuditCurrency(Math.abs(signedAmount))}`}</strong></span>
      <ChevronDown className="activity-row-chevron" size={15} aria-hidden="true"/>
    </button>
    {expanded && <ActivityDetails entry={entry} snapshot={snapshot} before={before} after={after} changes={changes} actorName={actorName} occurredAtFull={fullTimestamp} row={row}/>}
  </div>
}

export function ActivityList({ entries = [], allEntries = entries, loading, emptyAction, currency, actorName, paymentMethods = [], page, pageCount, pageStart, pageEnd, total, onPageChange, expandedRows, onToggleRow }) {
  const groups = groupByDay(entries, allEntries)
  const pagination = total > 0 && <div className="activity-pagination"><span>Showing {pageStart}–{pageEnd} of {total}</span><div><button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page >= pageCount}>Next</button></div></div>
  return <>
    {pagination}
    {loading ? <div className="activity-skeleton-list" aria-label="Loading activity">{Array.from({ length: 5 }, (_, index) => <div className="activity-skeleton-row" key={index}><i/><span/><b/></div>)}</div> : entries.length ? <div className="activity-groups">{groups.map((group) => <section className="activity-day-group" key={group.key}><ActivityDayHeader group={group} currency={currency}/>{group.entries.map((entry) => <ActivityRow key={entry.id} entry={entry} actorName={actorName} paymentMethods={paymentMethods} expanded={Boolean(expandedRows?.[entry.id])} onToggle={() => onToggleRow(entry.id)}/>)}</section>)}</div> : <div className="audit-history-empty"><strong>No activity for these filters</strong><button type="button" className="text-button" onClick={emptyAction}>Clear filters</button></div>}
    {pagination}
  </>
}

export function ScheduleList({ children }) { return <div className="income-schedule-list">{children}</div> }

export function SettingsCard({ eyebrow, title, helper, children, className = '' }) {
  return <section className={`panel settings-card ${className}`.trim()}>
    <header className="settings-card-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{helper && <p>{helper}</p>}</header>
    {children}
  </section>
}

export function SettingsButton({ children, variant = 'default', onClick, icon, type = 'button' }) {
  return <button type={type} className={`settings-button${variant === 'danger' ? ' settings-button-danger' : ''}`} onClick={onClick}>{icon}{children}</button>
}

export function SettingsRow({ title, helper, right, onClick }) {
  const content = <><span className="settings-row-copy"><strong>{title}</strong><small>{helper}</small></span><span className="settings-row-right">{right}</span></>
  return onClick
    ? <button type="button" className="settings-row settings-row-clickable" onClick={onClick}>{content}<RowChevron className="settings-row-chevron" size={15} aria-hidden="true"/></button>
    : <div className="settings-row">{content}</div>
}

const appearanceOptions = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

export function AppearanceControl({ theme, onChange }) {
  const optionRefs = useRef([])
  const selectOption = (index) => {
    const option = appearanceOptions[index]
    if (!option) return
    onChange(option.value)
    optionRefs.current[index]?.focus()
  }
  const handleKeyDown = (event, index) => {
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0
    if (!direction) return
    event.preventDefault()
    selectOption((index + direction + appearanceOptions.length) % appearanceOptions.length)
  }
  return <SettingsCard eyebrow="PREFERENCES" title="Appearance" helper="Choose how Resibo looks on this device.">
    <div className="theme-segmented" role="radiogroup" aria-label="Appearance theme">
      {appearanceOptions.map(({ value, label, Icon }, index) => <button type="button" role="radio" key={value} ref={(element) => { optionRefs.current[index] = element }} className={theme === value ? 'selected' : ''} aria-checked={theme === value} tabIndex={theme === value ? 0 : -1} onKeyDown={(event) => handleKeyDown(event, index)} onClick={() => onChange(value)}><Icon size={14} aria-hidden="true"/><span>{label}</span></button>)}
    </div>
  </SettingsCard>
}

export function TutorialSettings({ tutorial }) {
  return <SettingsCard eyebrow="HELP" title="App tutorial" helper="Review the walkthrough for transactions, budgets, payment methods, and more." className="settings-help-card">
    <SettingsButton onClick={tutorial}>View tutorial</SettingsButton>
  </SettingsCard>
}

export function AccountSecurity({ signOut, exportData, unavailable, openDelete }) {
  return <>
    <SettingsCard eyebrow="ACCOUNT" title="Security" className="settings-account-card">
      <div className="settings-row-list">
        <SettingsRow title="Change password" helper="Update the password used to sign in." onClick={unavailable}/>
        <SettingsRow title="Active sessions" helper="Review and revoke signed-in devices." onClick={unavailable}/>
        <SettingsRow title="Export my data" helper="Download a copy of your Resibo data." right={<SettingsButton onClick={exportData} icon={<Download size={14} aria-hidden="true"/>}>Export</SettingsButton>}/>
        <SettingsRow title="Sign out" helper="End this session on this device." right={<SettingsButton onClick={signOut}>Sign out</SettingsButton>}/>
      </div>
    </SettingsCard>
    <section className="panel settings-card settings-danger-card">
      <header className="settings-card-heading"><span className="eyebrow">DANGER ZONE</span><h2>Danger zone</h2><p>Permanently delete your account and personal data.</p></header>
      <SettingsButton variant="danger" onClick={openDelete}>Delete account</SettingsButton>
    </section>
  </>
}

export function DeleteAccountDialog({ email, onClose, onConfirm }) {
  const [confirmation, setConfirmation] = useState('')
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="add-modal delete-account-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title"><div className="eyebrow">DANGER ZONE</div><h2 id="delete-account-title">Delete your account?</h2><p>This action is not available yet. Type your account email to confirm your request.</p><label className="field-label">Account email<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><div className="payment-edit-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="button" className="danger-outline-button" disabled={confirmation.trim().toLowerCase() !== (email || '').toLowerCase()} onClick={onConfirm}>Confirm</button></div></section></div>
}
