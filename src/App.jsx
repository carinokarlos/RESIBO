import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import PaymentInfoCard from './PaymentInfoCard'
import SpendingOverview from './SpendingOverview'
import { AuthLayout, AuthSecureFooter, PasswordField, passwordsMatch, validateEmail, validatePassword } from './AuthComponents'
import { AccountSummaryCard, AccountSecurity, ActivityDateRangePicker, ActivityList, AppearanceControl, buildActivityRowPresentation, DeleteAccountDialog, ProfileForm, ScheduleList, SettingsTabs, SettingsTabGuardDialog, TutorialSettings, useSettingsTab } from './ProfileSettingsComponents'
import {
  ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleHelp, Coffee, CreditCard, Download, Eye, EyeOff, History, Minus, Pencil,
  LayoutDashboard, LockKeyhole, LogOut, Plus, Search, Settings2, ShoppingBag, UserRound,
  SlidersHorizontal, Sparkles, Sun, Moon, Trash2, Utensils, Wallet, X, MoreHorizontal,
} from 'lucide-react'
import resiboLogo from '../logo1.png'
import bankCardCatalog from './data/banks_and_cards.json'

const cardThemes = {
  bdo: ['#00296b', '#1f6fe0', 'sweep'], bpi: ['#7f1020', '#e5505c', 'rings'], metrobank: ['#0a2358', '#3470d4', 'grid'],
  securitybank: ['#064e3b', '#34d399', 'waves'], unionbank: ['#c2410c', '#ffa94d', 'diag'], rcbc: ['#10286b', '#5a86e8', 'dots'],
  chinabank: ['#8a0f26', '#f2506a', 'rings'], eastwest: ['#3b1380', '#a98bfa', 'sweep'], pnb: ['#0a3f93', '#4cc0f5', 'waves'],
  landbank: ['#0b5a31', '#93cf4c', 'diag'], psbank: ['#12347a', '#5b8fe6', 'dots'], maybank: ['#e6b800', '#ffe46b', 'rings', '#1b1b1b'],
  hsbc: ['#b8000f', '#ff6770', 'sweep'], aub: ['#00457f', '#3fa3ee', 'grid'], gcash: ['#0a4fd1', '#3fb0ff', 'waves'],
  maya: ['#06231b', '#14c28e', 'rings'], gotyme: ['#007f91', '#6fe9f2', 'dots'], seabank: ['#e8540d', '#ffa05a', 'diag'],
  cimb: ['#650a19', '#d92b44', 'grid'], tonik: ['#5b21b6', '#c68cff', 'waves'], uno: ['#0c0c0e', '#4a4a52', 'grid'],
  maribank: ['#4c1d95', '#f08af0', 'sweep'], atome: ['#0b0b0c', '#2b2b2e', 'diag'], cash: ['#0a4430', '#33a06e', 'guilloche'],
}
const cardThemeAliases = { 'bpi-debit': 'bpi', 'bpi-credit': 'bpi', 'rcbc-debit': 'rcbc', 'rcbc-credit': 'rcbc' }
const cardThemeNetworks = { bdo: 'Mastercard', bpi: 'Mastercard', metrobank: 'Mastercard', securitybank: 'Mastercard', unionbank: 'Visa', rcbc: 'Mastercard', chinabank: 'Mastercard', eastwest: 'Mastercard', pnb: 'Mastercard', landbank: 'Mastercard', psbank: 'Mastercard', maybank: 'Visa', hsbc: 'Mastercard', aub: 'Mastercard', gcash: 'Mastercard', maya: 'Mastercard', gotyme: 'Visa', seabank: 'Mastercard', cimb: 'Mastercard', tonik: 'Visa', uno: 'Mastercard', maribank: 'Visa', atome: 'Visa' }
const cardPatternBackgrounds = {
  rings: 'repeating-radial-gradient(circle at 90% 6%, rgba(255,255,255,.13) 0 1px, transparent 1px 22px)',
  waves: 'repeating-radial-gradient(ellipse 120% 90% at 0% 105%, rgba(255,255,255,.12) 0 1px, transparent 1px 18px)',
  diag: 'repeating-linear-gradient(115deg, rgba(255,255,255,.09) 0 1px, transparent 1px 15px)',
  dots: 'radial-gradient(rgba(255,255,255,.2) 1px, transparent 1.6px) 0 0 / 13px 13px',
  grid: 'linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px) 0 0 / 18px 18px, linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px) 0 0 / 18px 18px',
  guilloche: 'repeating-radial-gradient(circle at 78% 42%, rgba(255,255,255,.17) 0 .6px, transparent .6px 5px), repeating-radial-gradient(circle at 12% 115%, rgba(0,40,20,.22) 0 .6px, transparent .6px 6px), repeating-linear-gradient(60deg, rgba(255,255,255,.05) 0 1px, transparent 1px 7px)',
  sweep: 'conic-gradient(from 205deg at 100% 0%, transparent 0deg, rgba(255,255,255,.18) 38deg, transparent 80deg), repeating-linear-gradient(115deg, rgba(255,255,255,.05) 0 1px, transparent 1px 13px)',
}
const cardVisualStyle = (design = {}) => {
  const themeKey = String(design.theme_key || design.theme || design.issuer || '').toLowerCase()
  const canonicalTheme = cardThemeAliases[themeKey] || themeKey.replace(/[^a-z0-9]/g, '')
  const [color1, color2, pattern, ink] = cardThemes[canonicalTheme] || ['#2f3541', '#8b95a7', 'diag']
  return {
    '--wallet-c1': color1, '--wallet-c2': color2, '--card-color': color1, '--card-accent': color2,
    '--card-ink': ink || design.foreground_color || '#fff', '--card-pattern-bg': cardPatternBackgrounds[pattern],
  }
}
const cardNetwork = (design = {}) => {
  if (design.network) return design.network
  const name = `${design.display_name || design.name || ''} ${design.issuer || ''}`
  if (/visa/i.test(name)) return 'Visa'
  if (/mastercard|master\b|world|edge|wave|hexagon/i.test(name)) return 'Mastercard'
  if (/amex|american express/i.test(name)) return 'Amex'
  const key = String(design.theme_key || design.theme || design.issuer || '').toLowerCase()
  const theme = cardThemeAliases[key] || key.replace(/[^a-z0-9]/g, '')
  return cardThemeNetworks[theme] || ''
}
const cardNetworkLabel = (network = '') => network === 'Mastercard' ? 'mastercard' : network === 'Amex' ? 'AMERICAN EXPRESS' : network.toUpperCase()
const cardTierLabel = (design = {}) => `${design.display_name || design.name || ''}`.match(/infinite|world|signature|privilege|premier|titanium|platinum|gold|travel|cashback|rewards/i)?.[0]?.toUpperCase() || ''
const cardTypeLabel = (design = {}) => [design.product_type || (design.category === 'credit_card' ? 'Credit' : design.category === 'debit_card' ? 'Debit' : design.category === 'ewallet' ? 'E-wallet' : 'Cash'), cardTierLabel(design)].filter(Boolean).join(' · ')
const CREDIT_CARD_PAYMENT_CATEGORY = '__credit_card_payment__'
const paymentMethodDisplayName = (method) => {
  if (method.groupId === 'cash') return method.name
  const bankName = method.issuer || method.name
  const lastFour = method.lastFour ? ` (${method.lastFour})` : ''
  const cardholder = method.cardholderName ? ` - (${method.cardholderName})` : ''
  const cardType = method.groupId === 'credit' ? ' · Credit' : method.groupId === 'debit' ? ' · Debit' : ''
  return `${bankName}${lastFour}${cardholder}${cardType}`
}
const paymentMethodSpendableMinor = (method) => method?.groupId === 'credit'
  ? Math.max(0, (method.creditLimitMinor || 0) - (method.debtMinor || 0))
  : Math.max(0, method?.balanceMinor || 0)
const availablePaymentMethodsFirst = (methods) => [...methods].sort((first, second) => Number(paymentMethodSpendableMinor(second) > 0) - Number(paymentMethodSpendableMinor(first) > 0))

function SchedulePaymentSource({ value, methods, label, transactionType, onChange }) {
  const [open, setOpen] = useState(false)
  const listboxId = `schedule-payment-source-${useId().replaceAll(':', '')}`
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const eligibleMethods = transactionType === 'income' ? methods.filter((method) => method.groupId !== 'credit') : methods
  const options = [{ userMethodId: '', name: 'Cash', theme: 'cash', issuer: 'Cash', symbol: '₱' }, ...eligibleMethods]
  const selected = options.find((option) => String(option.userMethodId) === String(value)) || (value ? { name: 'Choose a payment method' } : options[0])

  useEffect(() => {
    if (!open) return undefined
    const currentOption = rootRef.current?.querySelector('[role="option"][aria-selected="true"]')
    currentOption?.focus()
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])

  function choose(option) {
    onChange(String(option.userMethodId || ''))
    setOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  function moveOptionFocus(event) {
    const optionNodes = [...(rootRef.current?.querySelectorAll('[role="option"]') || [])]
    const index = optionNodes.indexOf(document.activeElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const nextIndex = (index + (event.key === 'ArrowDown' ? 1 : -1) + optionNodes.length) % optionNodes.length
      optionNodes[nextIndex]?.focus()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const option = options.find((entry) => String(entry.userMethodId) === optionNodes[index]?.dataset.value)
      if (option) choose(option)
    }
  }

  return <div className="schedule-payment-source field-label" ref={rootRef}>
    <span>{label}</span>
    <button ref={triggerRef} type="button" className="schedule-payment-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-controls={listboxId} aria-haspopup="listbox" title={selected.name} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
      if (!open && ['ArrowDown', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        setOpen(true)
      }
    }}>
      <span className="schedule-payment-value" title={paymentMethodDisplayName(selected)}>{paymentMethodDisplayName(selected)}</span><ChevronDown size={15} aria-hidden="true"/>
    </button>
    {open && <div id={listboxId} className="schedule-payment-options" role="listbox" aria-label={label} onKeyDown={moveOptionFocus}>
      {options.map((option) => <div key={String(option.userMethodId || 'cash')} className="schedule-payment-option" role="option" aria-selected={String(option.userMethodId) === String(value)} tabIndex={0} data-value={String(option.userMethodId || '')} title={paymentMethodDisplayName(option)} onClick={() => choose(option)}>
        <span className="schedule-payment-value" title={paymentMethodDisplayName(option)}>{paymentMethodDisplayName(option)}</span>
      </div>)}
    </div>}
  </div>
}

function IncomeDestinationGroup({ group, page, currency, searchActive, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(group.items.length / 3))
  const currentPage = Math.min(page, pageCount)
  const visibleItems = group.items.slice((currentPage - 1) * 3, currentPage * 3)
  return <section className="dashboard-detail-group" key={group.key}>
    <div className="dashboard-detail-group-heading"><span><strong>{group.name}</strong><small>{group.method ? group.method.kind : 'Payment method not linked'}</small></span><span className="dashboard-detail-total"><strong>{currency(group.totalMinor)}</strong><small>{searchActive ? 'Matching income' : 'Received this cycle'}</small></span></div>
    <div className="dashboard-detail-balance">{group.method?.groupId === 'credit' ? <>Current debt <strong>{currency(group.method.debtMinor)}</strong></> : group.method ? <>Current balance <strong>{currency(group.method.balanceMinor)}</strong></> : <>Current balance <strong>Unavailable</strong></>}</div>
    <div className="dashboard-detail-transactions">{visibleItems.map((item) => <div className="dashboard-detail-transaction" key={item.id}><span><strong>{item.name}</strong><small>{item.category} · {item.date}{item.time ? ` · ${item.time}` : ''}</small></span><strong>+{currency(Math.round(Math.abs(item.amount) * 100))}</strong></div>)}</div>
    {pageCount > 1 && <div className="dashboard-debt-pagination income-group-pagination"><span>Showing {(currentPage - 1) * 3 + 1}–{Math.min(currentPage * 3, group.items.length)} of {group.items.length}</span><div><button type="button" className="secondary-button" onClick={() => onPageChange(group.key, Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" className="secondary-button" onClick={() => onPageChange(group.key, Math.min(pageCount, currentPage + 1))} disabled={currentPage >= pageCount}>Next</button></div></div>}
  </section>
}

function IncomeSourcesPanel({ allSourceCount, groups, filteredGroups, currency, search, currentPage, pageCount, transactionPages, onSearchChange, onPageChange, onTransactionPageChange }) {
  return <>
    <div className="dashboard-debt-toolbar income-search-toolbar"><label className="dashboard-debt-search"><Search size={15} aria-hidden="true"/><input type="search" aria-label="Search income sources and transactions" placeholder="Search income sources or transactions" value={search} onChange={(event) => onSearchChange(event.target.value)}/></label><span>{filteredGroups.length} {search.trim() ? 'matches' : 'sources'}</span></div>
    {!allSourceCount ? <div className="dashboard-detail-empty">No income recorded in this budget cycle yet.</div> : !filteredGroups.length ? <div className="dashboard-detail-empty">No income matches your search.</div> : <>
      <div className="dashboard-detail-groups">{groups.map((group) => <IncomeDestinationGroup key={group.key} group={group} currency={currency} searchActive={Boolean(search.trim())} page={transactionPages[group.key] || 1} onPageChange={onTransactionPageChange}/>)}</div>
      <div className="dashboard-debt-pagination"><span>Showing {(currentPage - 1) * 2 + 1}–{Math.min(currentPage * 2, filteredGroups.length)} of {filteredGroups.length}</span><div><button type="button" className="secondary-button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" className="secondary-button" onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))} disabled={currentPage >= pageCount}>Next</button></div></div>
    </>}
  </>
}

function fitCardholderName(element) {
  if (!element) return
  let size = 3.5
  element.style.fontSize = `${size}cqw`
  while (element.scrollWidth > element.clientWidth + 1 && size > 2.8) {
    size -= 0.15
    element.style.fontSize = `${size}cqw`
  }
}
const catalogProductOrder = new Map(Object.values(bankCardCatalog.banks).flatMap((bank) => Object.values(bank.cards).flat()).map((name, index) => [name, index]))
const referenceProductNames = new Set(catalogProductOrder.keys())

const paymentGroups = [
  { id: 'ewallet', title: 'E-wallets', icon: Wallet, cards: [] },
  { id: 'debit', title: 'Debit cards', icon: CreditCard, cards: [] },
  { id: 'credit', title: 'Credit cards', icon: CreditCard, cards: [] },
  { id: 'cash', title: 'Cash', icon: Wallet, cards: [] },
]

const nav = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Transactions', icon: ArrowUpRight },
  { label: 'Budgets', icon: Wallet },
]

const peso = (amount) => `₱${Math.abs(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dayOptionLabel = (day) => `${day}${day % 100 >= 11 && day % 100 <= 13 ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th'}${day >= 29 ? ' / month-end' : ''}`
function MenuSelect({ value, options, onChange, ariaLabel, className = '' }) {
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const listId = `menu-select-${useId().replaceAll(':', '')}`
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState(null)
  const selected = options.find((option) => String(option.value) === String(value)) || options[0]

  useEffect(() => {
    if (!open) return undefined
    const positionMenu = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = window.innerHeight
      const width = Math.min(Math.max(rect.width, 220), 340, viewportWidth - 32)
      const estimatedHeight = Math.min(280, viewportHeight * 0.55, Math.max(54, options.length * 52 + 14))
      const left = Math.max(16, Math.min(rect.left, viewportWidth - width - 16))
      const below = viewportHeight - rect.bottom - 10
      const top = below >= Math.min(estimatedHeight, 150) || rect.top < estimatedHeight + 20
        ? Math.max(8, Math.min(rect.bottom + 7, viewportHeight - estimatedHeight - 8))
        : Math.max(8, rect.top - estimatedHeight - 7)
      setMenuPosition({ top, left, width })
    }
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    const closeEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.requestAnimationFrame(positionMenu)
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open, options.length])

  function openMenu() {
    setOpen(true)
    window.requestAnimationFrame(() => {
      const selectedOption = menuRef.current?.querySelector('[role="option"][aria-selected="true"]:not(:disabled)')
      ;(selectedOption || menuRef.current?.querySelector('[role="option"]:not(:disabled)'))?.focus()
    })
  }

  function moveOption(event) {
    const optionNodes = [...(menuRef.current?.querySelectorAll('[role="option"]:not(:disabled)') || [])]
    const index = optionNodes.indexOf(document.activeElement)
    let nextIndex = null
    if (event.key === 'Tab') { setOpen(false); return }
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % optionNodes.length
    if (event.key === 'ArrowUp') nextIndex = (index - 1 + optionNodes.length) % optionNodes.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = optionNodes.length - 1
    if (nextIndex !== null && optionNodes.length) {
      event.preventDefault()
      optionNodes[nextIndex]?.focus()
    }
  }

  return <div className={`menu-select ${className}`} ref={rootRef}>
    <button ref={triggerRef} type="button" className="menu-select-trigger" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" onClick={() => open ? setOpen(false) : openMenu()} onKeyDown={(event) => {
      if (!open && ['ArrowDown', 'Enter', ' '].includes(event.key)) { event.preventDefault(); openMenu() }
    }}>
      <span className="menu-select-value">{selected?.label || 'Choose an option'}</span><ChevronDown size={15} aria-hidden="true"/>
    </button>
    {open && createPortal(<div ref={menuRef} id={listId} className={`menu-select-options${menuPosition ? '' : ' menu-select-unpositioned'}`} style={menuPosition || undefined} role="listbox" aria-label={ariaLabel} onKeyDown={moveOption}>
      {options.map((option) => <button key={String(option.value)} type="button" role="option" disabled={option.disabled} aria-selected={String(option.value) === String(value)} className="menu-select-option" onClick={() => { onChange(String(option.value)); setOpen(false); window.requestAnimationFrame(() => triggerRef.current?.focus()) }}>
        <span className="menu-select-option-copy"><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
        {String(option.value) === String(value) && <span className="menu-select-selected-mark" aria-hidden="true"/>}
      </button>)}
    </div>, document.body)}
  </div>
}
const localIsoDate = (date = new Date()) => {
  const value = date instanceof Date ? date : new Date(date)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
const currentMonthAnchor = () => { const date = new Date(); date.setDate(15); return localIsoDate(date) }
const detectTimeZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila' } catch { return 'Asia/Manila' }
}
const cardBrandMark = (issuer = '') => {
  const key = issuer.toLowerCase().replace(/[^a-z0-9]/g, '')
  const marks = { bdo: 'BDO', bpi: 'BPI', metrobank: 'MB', securitybank: 'SB', unionbank: 'UB', rcbc: 'RCBC', chinabank: 'CB', eastwest: 'EW', pnb: 'PNB', landbank: 'LBP', psbank: 'PSB', maybank: 'MY', hsbc: 'HSBC', aub: 'AUB', gcash: 'G', maya: 'MAYA', gotyme: 'GT', seabank: 'SEA', cimb: 'CIMB', tonik: 'TK', uno: 'UNO', maribank: 'MARI', atome: 'ATOME' }
  return marks[key] || issuer.slice(0, 3).toUpperCase()
}
const cardFinish = (card) => {
  if (card.groupId === 'cash' || card.category === 'cash') return 'cash'
  const name = card.name?.toLowerCase() || ''
  if (/\b(infinite|world|signature|privilege|premier|titanium|platinum|black|elite|private|travel)\b/.test(name)) return 'premium'
  if (/\bgold\b/.test(name)) return 'gold'
  if (['gcash', 'maya'].includes(card.theme || card.theme_key)) return 'glass'
  return 'standard'
}
const monthOptions = Array.from({ length: 18 }, (_, index) => {
  const date = new Date()
  date.setDate(15)
  date.setMonth(date.getMonth() - 12 + index)
  return { value: localIsoDate(date), label: date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) }
})
function BudgetCyclePicker({ value, options, onChange }) {
  const rootRef = useRef(null)
  const closeTimerRef = useRef(null)
  const [state, setState] = useState('closed')
  const [viewYear, setViewYear] = useState(() => new Date(`${value}T12:00:00`).getFullYear())
  const [direction, setDirection] = useState('')
  const availableMonths = new Set(options.map((option) => option.value.slice(0, 7)))
  const selectedMonth = value.slice(0, 7)
  const years = options.map((option) => Number(option.value.slice(0, 4)))
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const currentMonth = localIsoDate(new Date()).slice(0, 7)
  const currentOption = options.find((option) => option.value.slice(0, 7) === currentMonth)
  const open = state !== 'closed'

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) closePicker()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closePicker()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), [])

  function closePicker() {
    window.clearTimeout(closeTimerRef.current)
    setState('closing')
    closeTimerRef.current = window.setTimeout(() => setState('closed'), 160)
  }

  function togglePicker() {
    if (state === 'open') {
      closePicker()
      return
    }
    window.clearTimeout(closeTimerRef.current)
    setViewYear(Number(value.slice(0, 4)))
    setDirection('')
    setState('open')
  }

  function shiftYear(amount) {
    setDirection(amount > 0 ? 'next' : 'prev')
    setViewYear((year) => year + amount)
  }

  return <div className="cycle-picker cycle-dropdown" ref={rootRef} data-state={state}>
    <span className="cycle-picker-caption">BUDGET CYCLE</span>
    <button type="button" className="date-select date-select-control cycle-select cycle-trigger" aria-label="Choose budget cycle" aria-haspopup="dialog" aria-expanded={open} onClick={togglePicker}>
      <CalendarDays size={15}/><span className="cycle-trigger-value">{options.find((option) => option.value === value)?.label || 'Choose month'}</span><ChevronDown className="cycle-trigger-chevron" size={15}/>
    </button>
    {open && <div className={`cycle-popover ${state}`} role="dialog" aria-label="Choose budget cycle month">
      <div className="cycle-popover-head">
        <div className={`cycle-year-wrap ${direction}`}><span className="cycle-popover-caption">SELECT A MONTH</span><strong className="cycle-year">{viewYear}</strong></div>
        <div className="cycle-year-nav">
          <button type="button" aria-label="Previous year" disabled={viewYear <= minYear} onClick={() => shiftYear(-1)}><ChevronLeft size={17}/></button>
          <button type="button" aria-label="Next year" disabled={viewYear >= maxYear} onClick={() => shiftYear(1)}><ChevronRight size={17}/></button>
        </div>
      </div>
      <div className={`cycle-month-grid ${direction} stagger`} key={viewYear}>
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const monthKey = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`
          const monthDate = new Date(viewYear, monthIndex, 15)
          const option = options.find((entry) => entry.value.slice(0, 7) === monthKey)
          const isSelected = selectedMonth === monthKey
          return <button type="button" className={`cycle-month-option ${isSelected ? 'selected' : ''} ${currentMonth === monthKey ? 'current' : ''}`} key={monthKey} style={{ '--month-index': monthIndex }} disabled={!availableMonths.has(monthKey)} aria-pressed={isSelected} onClick={() => { if (option) onChange(option.value); closePicker() }}>{monthDate.toLocaleDateString('en-PH', { month: 'short' })}</button>
        })}
      </div>
      <div className="cycle-popover-foot"><span>{options[0]?.label} – {options.at(-1)?.label}</span><button type="button" disabled={!currentOption} onClick={() => { if (currentOption) onChange(currentOption.value); closePicker() }}>This month</button></div>
    </div>}
  </div>
}
const avatarPalettes = [
  { id: 'blue', background: '#3b82f6', foreground: '#fff' },
  { id: 'green', background: '#38816a', foreground: '#fff' },
  { id: 'violet', background: '#7866b2', foreground: '#fff' },
  { id: 'amber', background: '#b77a36', foreground: '#fff' },
  { id: 'rose', background: '#b45f77', foreground: '#fff' },
  { id: 'teal', background: '#187c83', foreground: '#fff' },
  { id: 'coral', background: '#c66c56', foreground: '#fff' },
  { id: 'slate', background: '#64748b', foreground: '#fff' },
]
const tutorialSteps = [
  { eyebrow: 'YOUR OVERVIEW', title: 'Welcome to Resibo', body: 'Your dashboard brings your budget cycle, balance, income, spending, and recent activity together.', tip: 'Open Budget cycle and choose a month from the rounded menu to review a different period.' },
  { eyebrow: 'RECORD YOUR MONEY', title: 'Add and manage transactions', body: 'Choose Add transaction, select income or expense, then enter the amount and date. Choose a category and Paid with method from the matching dropdown menus. Use the three-dot menu beside a transaction to edit or delete it.', tip: 'Income and expenses use different colors, and saved transactions update your totals and chart.' },
  { eyebrow: 'PLAN AHEAD', title: 'Set category budgets', body: 'Open Budgets to set spending limits for categories such as food, bills, or transport. Choose a category from the same dropdown menu used elsewhere in the app.', tip: 'Your dashboard shows progress, and budget alerts appear as you approach a limit.' },
  { eyebrow: 'PAYMENT METHODS', title: 'Set up your wallet', body: 'Cash is ready by default. In Payment methods on the dashboard, add the e-wallets and cards you use. You can enter a card number and use its eye button to hide or reveal it.', tip: 'A payment method helps you see where your money is held and how you paid.' },
  { eyebrow: 'AUTOMATE REGULAR ACTIVITY', title: 'Schedule recurring transactions', body: 'In Profile & settings, add recurring income or expenses such as paychecks or rent. Use the dropdown menus to choose the transaction type, frequency, dates, and category.', tip: 'Resibo records scheduled transactions while it is open and catches up on missed dates the next time you open it.' },
  { eyebrow: 'SEE THE DETAILS', title: 'Review your activity', body: 'The spending chart and transaction list reflect the selected budget cycle. Open Transactions to search and filter the full list using the matching activity, transaction type, and category menus.', tip: 'Each month keeps its own income and expense history.' },
  { eyebrow: 'YOUR CHANGE HISTORY', title: 'Check income & expense history', body: 'Profile & settings includes a history of transactions you created, edited, or deleted. Use the Activity, Transaction type, and date range controls to narrow the list.', tip: 'Use the pagination to browse up to 5 entries at a time.' },
  { eyebrow: 'MAKE IT YOURS', title: 'Adjust your preferences', body: 'Open Profile & settings to update your profile, recurring schedules, and preferences. Use the theme button to switch between light and dark.', tip: 'You can replay this walkthrough anytime from the dashboard footer.' },
]
const SCHEDULE_PAGE_SIZE = 5
const TRANSACTION_PAGE_SIZE = 5
const ACTIVITY_PAGE_SIZE = 5
const ACTIVITY_FETCH_SIZE = 10

function formatScheduleNextRun(schedule) {
  if (!schedule.enabled) return 'Paused'
  const value = schedule.nextRun || schedule.next_run
  if (value) {
    const parsed = new Date(`${value}T12:00:00`)
    if (Number.isFinite(parsed.getTime())) return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  let todayParts
  try {
    todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: schedule.timeZone || 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  } catch {
    todayParts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  }
  const part = (name) => Number(todayParts.find((entry) => entry.type === name)?.value)
  const today = new Date(part('year'), part('month') - 1, part('day'))
  const days = schedule.frequency === 'monthly'
    ? [Number(schedule.monthlyDay)]
    : [Number(schedule.firstPaydayDay), Number(schedule.secondPaydayDay)]
  for (let offset = 0; offset < 24; offset += 1) {
    const month = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const candidates = days.filter((day) => Number.isFinite(day) && day > 0).map((day) => new Date(month.getFullYear(), month.getMonth(), Math.min(day, lastDay))).filter((date) => date > today).sort((a, b) => a - b)
    if (candidates.length) return candidates[0].toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return '—'
}

function toLocalIsoDate(value) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getActivityDateRange(preset, customStart, customEnd, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (preset === 'all_time') return { startDate: '', endDate: '' }
  if (preset === 'custom') return { startDate: customStart || '', endDate: customEnd || '' }
  if (preset === 'last_month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return { startDate: toLocalIsoDate(start), endDate: toLocalIsoDate(new Date(today.getFullYear(), today.getMonth(), 0)) }
  }
  if (preset === 'last_30_days') {
    const start = new Date(today)
    start.setDate(today.getDate() - 29)
    return { startDate: toLocalIsoDate(start), endDate: toLocalIsoDate(today) }
  }
  return { startDate: toLocalIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: toLocalIsoDate(today) }
}

function App() {
  const [theme, setTheme] = useState(() => {
    try { return window.localStorage.getItem('resibo-theme') === 'light' ? 'light' : 'dark' } catch { return 'dark' }
  })
  const [themePreference, setThemePreference] = useState(() => {
    try { return window.localStorage.getItem('resibo-theme-preference') || window.localStorage.getItem('resibo-theme') || 'dark' } catch { return 'dark' }
  })
  const [authView, setAuthView] = useState('checking')
  const [authMode, setAuthMode] = useState('login')
  const [showDeveloperCredit, setShowDeveloperCredit] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [showGettingStarted, setShowGettingStarted] = useState(false)
  const [paymentSetupSkipped, setPaymentSetupSkipped] = useState(false)
  const [dismissedHelpTips, setDismissedHelpTips] = useState({})
  const [authUser, setAuthUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authFieldErrors, setAuthFieldErrors] = useState({})
  const [authSubmitAttempted, setAuthSubmitAttempted] = useState(false)
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [showMiddleName, setShowMiddleName] = useState(false)
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false)
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [csrfToken, setCsrfToken] = useState('')
  const [authFirstName, setAuthFirstName] = useState('')
  const [authMiddleName, setAuthMiddleName] = useState('')
  const [authLastName, setAuthLastName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [profileFirstName, setProfileFirstName] = useState('')
  const [profileMiddleName, setProfileMiddleName] = useState('')
  const [profileLastName, setProfileLastName] = useState('')
  const [profileTimeZone, setProfileTimeZone] = useState(detectTimeZone())
  const [profileError, setProfileError] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [signOutBusy, setSignOutBusy] = useState(false)
  const [incomeSchedules, setIncomeSchedules] = useState([])
  const [incomeScheduleModalKey, setIncomeScheduleModalKey] = useState('')
  const [incomeScheduleContextMenu, setIncomeScheduleContextMenu] = useState(null)
  const [incomeScheduleToDelete, setIncomeScheduleToDelete] = useState(null)
  const [incomeScheduleDeleteError, setIncomeScheduleDeleteError] = useState('')
  const [incomeScheduleDeleteBusy, setIncomeScheduleDeleteBusy] = useState(false)
  const [incomeScheduleTypeFilter, setIncomeScheduleTypeFilter] = useState('all')
  const [incomeScheduleSearch, setIncomeScheduleSearch] = useState('')
  const [incomeSchedulePage, setIncomeSchedulePage] = useState(1)
  const [incomeSchedulesLoading, setIncomeSchedulesLoading] = useState(false)
  const [incomeSchedulesError, setIncomeSchedulesError] = useState('')
  const [auditEntries, setAuditEntries] = useState([])
  const [expandedAuditRows, setExpandedAuditRows] = useState({})
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [auditTypeFilter, setAuditTypeFilter] = useState('all')
  const [auditDatePreset, setAuditDatePreset] = useState('this_month')
  const [auditRangeStart, setAuditRangeStart] = useState('')
  const [auditRangeEnd, setAuditRangeEnd] = useState('')
  const [auditPaymentFocusId, setAuditPaymentFocusId] = useState('')
  const [salaryRefreshKey, setSalaryRefreshKey] = useState(0)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const avatarInputRef = useRef(null)
  const [avatarPaletteId, setAvatarPaletteId] = useState(() => {
    try { return window.localStorage.getItem('resibo-avatar-palette') || 'blue' } catch { return 'blue' }
  })
  const [showPassword, setShowPassword] = useState(false)
  const firstNameInputRef = useRef(null)
  const lastNameInputRef = useRef(null)
  const emailInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  const confirmPasswordInputRef = useRef(null)
  const [rememberMe, setRememberMe] = useState(true)
  const [active, setActive] = useState(() => window.location.hash.startsWith('#settings/') ? 'Profile' : 'Dashboard')
  const [selectedCycleDate, setSelectedCycleDate] = useState(() => currentMonthAnchor())
  const [chartGrouping, setChartGrouping] = useState('day')
  const [showFilters, setShowFilters] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [paymentGroupsState, setPaymentGroupsState] = useState(paymentGroups)
  const [paymentCatalog, setPaymentCatalog] = useState([])
  const [revealedPaymentCardId, setRevealedPaymentCardId] = useState(null)
  const [editingExpiryCardId, setEditingExpiryCardId] = useState(null)
  const [expiryDraft, setExpiryDraft] = useState('')
  const [cardExpiryError, setCardExpiryError] = useState('')
  const [activePaymentGroup, setActivePaymentGroup] = useState('ewallet')
  const [activePaymentCard, setActivePaymentCard] = useState(0)
  const [showMethodPicker, setShowMethodPicker] = useState(false)
  const [designSearch, setDesignSearch] = useState('')
  const [visibleDesignCount, setVisibleDesignCount] = useState(5)
  const [designTypeFilter, setDesignTypeFilter] = useState('all')
  const [showMethodMenu, setShowMethodMenu] = useState(false)
  const [methodError, setMethodError] = useState('')
  const [editingMethod, setEditingMethod] = useState(null)
  const [methodBalance, setMethodBalance] = useState('')
  const [methodCreditLimit, setMethodCreditLimit] = useState('')
  const [methodDebt, setMethodDebt] = useState('')
  const [methodCardholderName, setMethodCardholderName] = useState('')
  const [methodLastFour, setMethodLastFour] = useState('')
  const [methodExpiry, setMethodExpiry] = useState('')
  const [methodSettingsError, setMethodSettingsError] = useState('')
  const [methodSettingsBusy, setMethodSettingsBusy] = useState(false)
  const [methodRemoveBusy, setMethodRemoveBusy] = useState(false)
  const [confirmRemoveMethod, setConfirmRemoveMethod] = useState(null)
  const [methodRemoveError, setMethodRemoveError] = useState('')
  const [transactions, setTransactions] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [dashboardDetailModal, setDashboardDetailModal] = useState(null)
  const [incomeDetailPage, setIncomeDetailPage] = useState(1)
  const [incomeDetailSearch, setIncomeDetailSearch] = useState('')
  const [incomeDetailTransactionPages, setIncomeDetailTransactionPages] = useState({})
  const [creditDebtSearch, setCreditDebtSearch] = useState('')
  const [creditDebtPage, setCreditDebtPage] = useState(1)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [transactionContextMenu, setTransactionContextMenu] = useState(null)
  const [paymentCardContextMenu, setPaymentCardContextMenu] = useState(null)
  const [transactionToDelete, setTransactionToDelete] = useState(null)
  const [transactionDeleteError, setTransactionDeleteError] = useState('')
  const [transactionDeleteBusy, setTransactionDeleteBusy] = useState(false)
  const [transactionBusy, setTransactionBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [transactionPage, setTransactionPage] = useState(1)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [kind, setKind] = useState('Expense')
  const [transactionDate, setTransactionDate] = useState(() => localIsoDate())
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [creditCardPaymentTargetId, setCreditCardPaymentTargetId] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [saved, setSaved] = useState(false)
  const [savedMessage, setSavedMessage] = useState('Transaction added to your activity.')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState([])
  const notificationPanelRef = useRef(null)
  const methodMenuRef = useRef(null)
  const methodPickerRef = useRef(null)
  const transactionContextMenuRef = useRef(null)
  const paymentCardContextMenuRef = useRef(null)
  const incomeScheduleContextMenuRef = useRef(null)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const isCardPaymentGroup = activePaymentGroup === 'debit' || activePaymentGroup === 'credit'
  const activeCatalogCategory = activePaymentGroup === 'debit' ? 'debit_card' : activePaymentGroup === 'credit' ? 'credit_card' : activePaymentGroup
  const designTypes = [...new Set(paymentCatalog.filter((design) => design.category === activeCatalogCategory && referenceProductNames.has(design.display_name)).map((design) => design.product_type || (design.category === 'credit_card' ? 'Credit' : 'Debit')))].sort()
  const filteredPaymentCatalog = paymentCatalog.filter((design) => {
    const query = designSearch.trim().toLocaleLowerCase()
    if (design.category !== activeCatalogCategory) return false
    if (activePaymentGroup === 'ewallet') return !query || [design.issuer, design.display_name].some((value) => value?.toLocaleLowerCase().includes(query))
    if (!referenceProductNames.has(design.display_name)) return false
    if (activePaymentGroup === 'cash') return !query || [design.issuer, design.display_name].some((value) => value?.toLocaleLowerCase().includes(query))
    const type = design.product_type || (design.category === 'credit_card' ? 'Credit' : 'Debit')
    return (designTypeFilter === 'all' || type === designTypeFilter) && (!query || [design.issuer, design.display_name, design.network].some((value) => value?.toLocaleLowerCase().includes(query)))
  }).sort((a, b) => (catalogProductOrder.get(a.display_name) ?? Number.MAX_SAFE_INTEGER) - (catalogProductOrder.get(b.display_name) ?? Number.MAX_SAFE_INTEGER))
  const visiblePaymentCatalog = filteredPaymentCatalog.slice(0, visibleDesignCount)
  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [budgetLimit, setBudgetLimit] = useState('')
  const [budgetError, setBudgetError] = useState('')
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const next = themePreference === 'system' ? (media.matches ? 'light' : 'dark') : themePreference === 'light' ? 'light' : 'dark'
      setTheme(next)
      document.documentElement.dataset.theme = next
      try { window.localStorage.setItem('resibo-theme', next); window.localStorage.setItem('resibo-theme-preference', themePreference) } catch { /* Keep the selected theme for this session. */ }
    }
    apply()
    media.addEventListener?.('change', apply)
    return () => media.removeEventListener?.('change', apply)
  }, [themePreference])
  useEffect(() => {
    if (showMethodPicker && methodPickerRef.current) methodPickerRef.current.scrollTop = 0
  }, [showMethodPicker])
  useEffect(() => {
    if (!showDeveloperCredit) return
    const revertTimer = window.setTimeout(() => setShowDeveloperCredit(false), 3000)
    return () => window.clearTimeout(revertTimer)
  }, [showDeveloperCredit])
  useEffect(() => {
    if (!authUser || authView !== 'app') {
      setShowTutorial(false)
      setShowGettingStarted(false)
      setDismissedHelpTips({})
      setPaymentSetupSkipped(false)
      return
    }
    const accountId = authUser.id || authUser.email
    try {
      setShowGettingStarted(window.localStorage.getItem(`resibo-setup-dismissed-${accountId}`) !== 'true')
      setPaymentSetupSkipped(window.localStorage.getItem(`resibo-setup-payment-skipped-${accountId}`) === 'true')
      setDismissedHelpTips(JSON.parse(window.localStorage.getItem(`resibo-help-tips-${accountId}`) || '{}') || {})
    } catch {
      setShowGettingStarted(true)
      setPaymentSetupSkipped(false)
      setDismissedHelpTips({})
    }
    setTutorialStep(0)
    setShowTutorial(false)
  }, [authUser?.id, authUser?.email, authView])
  useEffect(() => {
    if (!authUser) { setReadNotificationIds([]); return }
    try {
      const key = `resibo-notifications-read-${authUser.id || authUser.email}`
      setReadNotificationIds(JSON.parse(window.localStorage.getItem(key) || '[]'))
    } catch { setReadNotificationIds([]) }
  }, [authUser?.id, authUser?.email])
  useEffect(() => {
    if (!notificationsOpen) return
    const dismissOnOutsideClick = (event) => { if (!notificationPanelRef.current?.contains(event.target)) setNotificationsOpen(false) }
    const dismissOnEscape = (event) => { if (event.key === 'Escape') setNotificationsOpen(false) }
    document.addEventListener('pointerdown', dismissOnOutsideClick)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOnOutsideClick)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [notificationsOpen])
  useEffect(() => {
    if (!showMethodMenu) return
    const dismissOnOutsideClick = (event) => { if (!methodMenuRef.current?.contains(event.target)) setShowMethodMenu(false) }
    const dismissOnEscape = (event) => { if (event.key === 'Escape') setShowMethodMenu(false) }
    document.addEventListener('pointerdown', dismissOnOutsideClick)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOnOutsideClick)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [showMethodMenu])
  useEffect(() => {
    if (!transactionContextMenu) return
    const dismissOnOutsideClick = (event) => { if (!transactionContextMenuRef.current?.contains(event.target)) setTransactionContextMenu(null) }
    const dismissOnEscape = (event) => { if (event.key === 'Escape') setTransactionContextMenu(null) }
    document.addEventListener('pointerdown', dismissOnOutsideClick)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOnOutsideClick)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [transactionContextMenu])
  useEffect(() => {
    if (!paymentCardContextMenu) return
    const dismissOnOutsideClick = (event) => { if (!paymentCardContextMenuRef.current?.contains(event.target)) setPaymentCardContextMenu(null) }
    const dismissOnEscape = (event) => { if (event.key === 'Escape') setPaymentCardContextMenu(null) }
    document.addEventListener('pointerdown', dismissOnOutsideClick)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOnOutsideClick)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [paymentCardContextMenu])
  useEffect(() => {
    if (!incomeScheduleContextMenu) return
    const dismissOnOutsideClick = (event) => { if (!incomeScheduleContextMenuRef.current?.contains(event.target)) setIncomeScheduleContextMenu(null) }
    const dismissOnEscape = (event) => { if (event.key === 'Escape') setIncomeScheduleContextMenu(null) }
    document.addEventListener('pointerdown', dismissOnOutsideClick)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOnOutsideClick)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [incomeScheduleContextMenu])
  useEffect(() => {
    if (!revealedPaymentCardId) return
    const hideTimer = window.setTimeout(() => setRevealedPaymentCardId(null), 10000)
    return () => window.clearTimeout(hideTimer)
  }, [revealedPaymentCardId])
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => document.querySelectorAll('.wallet-deck .payment-card-holder > strong').forEach(fitCardholderName))
    return () => window.cancelAnimationFrame(frame)
  }, [paymentGroupsState, activePaymentCard, activePaymentGroup])
  useEffect(() => {
    let activeRequest = true
    async function restoreSession() {
      try {
        const csrfResponse = await fetch('/api/csrf', { credentials: 'include' })
        const csrfData = await csrfResponse.json()
        if (activeRequest && csrfData.csrf_token) setCsrfToken(csrfData.csrf_token)
        const userResponse = await fetch('/api/auth/me', { credentials: 'include' })
        if (!activeRequest) return
        if (userResponse.ok) {
          const result = await userResponse.json()
          setAuthUser(result.user)
          setAuthView('app')
        } else setAuthView('login')
      } catch {
        if (activeRequest) {
          setAuthView('login')
          setAuthError('Can’t connect to the local API. Make sure the backend is running, then try again.')
        }
      }
    }
    restoreSession()
    return () => { activeRequest = false }
  }, [])
  useEffect(() => {
    let activeRequest = true
    fetch('/api/payment-card-designs').then((response) => response.ok ? response.json() : null).then((data) => {
      if (!activeRequest || !data?.designs?.length) return
      const designs = data.designs
      const cashBase = designs.find((design) => design.category === 'cash')
      const cashBank = bankCardCatalog.banks.find((bank) => bank.name === 'Cash')
      const missingCashDesigns = (cashBank?.cards?.Cash || []).filter((name) => !designs.some((design) => design.category === 'cash' && design.display_name === name)).map((name) => ({
        ...cashBase, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), display_name: name, product_type: 'Cash',
        theme_key: 'cash', background_color: '#0a4430', foreground_color: '#FFFFFF', accent_color: '#33a06e', pattern_key: 'guilloche', is_catalog_fallback: true,
      }))
      setPaymentCatalog([...designs, ...missingCashDesigns])
    }).catch(() => {})
    return () => { activeRequest = false }
  }, [])
  useEffect(() => {
    if (!authUser) {
      setTransactions([]); setDashboardData(null); setBudgets([]); setCategories([])
      setPaymentGroupsState(paymentGroups); setPaymentMethodId(''); setCategoryId('')
      setRevealedPaymentCardId(null); setEditingExpiryCardId(null); setExpiryDraft('')
      return
    }
    let activeRequest = true
    async function loadAccountData() {
      try {
        const dashboardResponse = await fetch(`/api/dashboard?date=${selectedCycleDate}`, { credentials: 'include' })
        if (!dashboardResponse.ok) throw new Error('Unable to load this account’s budget data.')
        const summary = await dashboardResponse.json()
        const cycleEnd = new Date(`${summary.cycle.end_date_exclusive}T12:00:00`)
        cycleEnd.setDate(cycleEnd.getDate() - 1)
        const cycleStart = summary.cycle.start_date
        const cycleLastDay = localIsoDate(cycleEnd)
        const [transactionResponse, budgetResponse, categoryResponse, methodsResponse, cardPaymentResponse] = await Promise.all([
          fetch(`/api/transactions?start=${cycleStart}&end=${cycleLastDay}&limit=500&offset=0`, { credentials: 'include' }),
          fetch(`/api/budgets?date=${selectedCycleDate}`, { credentials: 'include' }),
          fetch('/api/categories', { credentials: 'include' }),
          fetch('/api/payment-methods', { credentials: 'include' }),
          fetch(`/api/credit-card-payments?start=${cycleStart}&end=${cycleLastDay}&limit=500&offset=0`, { credentials: 'include' }).catch(() => null),
        ])
        if (![transactionResponse, budgetResponse, categoryResponse, methodsResponse].every((response) => response.ok)) throw new Error('Unable to load this account’s budget data.')
        const [transactionData, budgetData, categoryData, methodsData, cardPaymentData] = await Promise.all([
          transactionResponse.json(), budgetResponse.json(), categoryResponse.json(), methodsResponse.json(),
          cardPaymentResponse?.ok ? cardPaymentResponse.json() : Promise.resolve({ payments: [], total: 0 }),
        ])
        if (!activeRequest) return
        const allTransactions = [...(transactionData.transactions || [])]
        let nextOffset = allTransactions.length
        while (nextOffset < (transactionData.total || 0)) {
          const pageResponse = await fetch(`/api/transactions?start=${cycleStart}&end=${cycleLastDay}&limit=500&offset=${nextOffset}`, { credentials: 'include' })
          if (!pageResponse.ok) throw new Error('Unable to load all transactions for this cycle.')
          const page = await pageResponse.json()
          if (!page.transactions?.length) break
          allTransactions.push(...page.transactions)
          nextOffset += page.transactions.length
        }
        const allCardPayments = [...(cardPaymentData.payments || [])]
        let nextPaymentOffset = allCardPayments.length
        while (cardPaymentResponse?.ok && nextPaymentOffset < (cardPaymentData.total || 0)) {
          const pageResponse = await fetch(`/api/credit-card-payments?start=${cycleStart}&end=${cycleLastDay}&limit=500&offset=${nextPaymentOffset}`, { credentials: 'include' })
          if (!pageResponse.ok) throw new Error('Unable to load all credit card payments for this cycle.')
          const page = await pageResponse.json()
          if (!page.payments?.length) break
          allCardPayments.push(...page.payments)
          nextPaymentOffset += page.payments.length
        }
        if (!activeRequest) return
        setDashboardData(summary)
        setBudgets(budgetData.budgets || [])
        setCategories(categoryData.categories || [])
        const savedCashMethods = (methodsData.payment_methods || []).filter((method) => method.design.category === 'cash')
        const activeMethodIds = new Set((methodsData.payment_methods || []).map((method) => method.id))
        setPaymentMethodId((current) => activeMethodIds.has(Number(current)) ? current : savedCashMethods.length === 1 ? String(savedCashMethods[0].id) : '')
        const regularTransactionItems = allTransactions.map((row) => ({
          id: row.id, name: row.note || row.category || (row.type === 'income' ? 'Income' : 'Expense'), note: row.note || '', category: row.category || 'Uncategorized', categoryId: row.category_id, type: row.type, paymentMethodId: row.payment_method_id, paymentMethodName: row.payment_method,
          method: row.payment_method || 'cash', date: new Date(`${row.date}T12:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
          time: row.created_at ? new Date(row.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '', createdAt: row.created_at,
          isoDate: row.date, amount: (row.type === 'income' ? 1 : -1) * row.amount_minor / 100,
          icon: row.type === 'income' ? ArrowDownLeft : ShoppingBag, color: row.type === 'income' ? 'mint' : 'blue',
        }))
        const cardPaymentItems = allCardPayments.map((payment) => ({
          id: `credit-card-payment-${payment.id}`,
          creditCardPaymentId: payment.id,
          name: `Payment to ${payment.credit_card_name}`,
          note: payment.note || '',
          category: 'Credit card payment',
          categoryId: '__credit_card_payment__',
          type: 'expense',
          paymentMethodId: payment.source_method_id,
          paymentMethodName: `${payment.source_name} → ${payment.credit_card_name}`,
          method: `${payment.source_name} → ${payment.credit_card_name}`,
          date: new Date(`${payment.date}T12:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
          time: payment.created_at ? new Date(payment.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '',
          createdAt: payment.created_at,
          isoDate: payment.date,
          amount: -payment.amount_minor / 100,
          icon: CreditCard,
          color: 'blue',
          isCreditCardPayment: true,
        }))
        setTransactions([...regularTransactionItems, ...cardPaymentItems].sort((a, b) => {
          const dateOrder = String(b.isoDate || '').localeCompare(String(a.isoDate || ''))
          return dateOrder || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        }))
        const groups = { ewallet: [], debit: [], credit: [], cash: [] }
        for (const savedMethod of methodsData.payment_methods || []) {
          const design = savedMethod.design
          const group = design.category === 'debit_card' ? 'debit' : design.category === 'credit_card' ? 'credit' : design.category
          if (!groups[group]) continue
          const cycleSpendMinor = allTransactions.filter((row) => row.payment_method_id === savedMethod.id && row.type === 'expense').reduce((sum, row) => sum + row.amount_minor, 0)
          const network = cardNetwork(design)
          const amountMinor = group === 'debit' || group === 'ewallet' || group === 'cash' ? savedMethod.balance_minor : savedMethod.available_minor
          const card = { userMethodId: savedMethod.id, name: design.display_name, customLabel: savedMethod.custom_label || '', kind: cardTypeLabel(design), network, cardholderName: savedMethod.cardholder_name || '', lastFour: savedMethod.last_four || '', expiryMonth: savedMethod.expiry_month || null, expiryYear: savedMethod.expiry_year || null, patternKey: design.pattern_key || 'gradient', method: group === 'ewallet' ? design.issuer : group === 'cash' ? 'Cash' : group === 'debit' ? 'Debit card' : 'Credit card', amount: peso((amountMinor || 0) / 100), amountLabel: group === 'debit' || group === 'ewallet' || group === 'cash' ? 'BALANCE' : 'AVAILABLE TO SPEND', subAmount: group === 'credit' ? peso((savedMethod.debt_minor || 0) / 100) : '', subLabel: group === 'credit' ? 'DEBT' : '', cycleSpend: peso(cycleSpendMinor / 100), cycleSpendMinor, balanceMinor: savedMethod.balance_minor || 0, creditLimitMinor: savedMethod.credit_limit_minor || 0, debtMinor: savedMethod.debt_minor || 0, symbol: design.issuer, theme: design.theme_key, issuer: design.issuer, designId: design.id, groupId: group, backgroundColor: design.background_color, foregroundColor: design.foreground_color, accentColor: design.accent_color }
          groups[group].push(card)
        }
        setPaymentGroupsState(paymentGroups.map((group) => ({ ...group, cards: groups[group.id] })))
      } catch (error) {
        if (activeRequest) setAuthError(error.message)
      }
    }
    loadAccountData()
    return () => { activeRequest = false }
  }, [authUser, selectedCycleDate, salaryRefreshKey])
  useEffect(() => {
    if (!authUser) return
    const legacyNameParts = (authUser.name || '').trim().split(/\s+/).filter(Boolean)
    setProfileFirstName(authUser.first_name || legacyNameParts[0] || '')
    setProfileMiddleName(authUser.middle_name || (legacyNameParts.length > 2 ? legacyNameParts.slice(1, -1).join(' ') : ''))
    setProfileLastName(authUser.last_name || legacyNameParts.slice(1).at(-1) || '')
    setProfileTimeZone(authUser.time_zone || detectTimeZone())
  }, [authUser?.first_name, authUser?.middle_name, authUser?.last_name, authUser?.name, authUser?.time_zone])
  useEffect(() => {
    if (!authUser || !csrfToken) return
    if (authUser.time_zone && authUser.time_zone !== detectTimeZone()) return
    let activeRequest = true
    let syncing = false
    const syncDeviceTimeZone = async () => {
      const timeZone = detectTimeZone()
      if (syncing || timeZone === authUser.time_zone) return
      syncing = true
      try {
        const response = await fetch('/api/profile', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify({ time_zone: timeZone }),
        })
        if (!response.ok) throw new Error('Could not synchronize the device time zone.')
        const result = await response.json()
        if (activeRequest) setAuthUser(result.user)
      } catch (error) {
        console.error('Automatic time zone update failed:', error)
      } finally {
        syncing = false
      }
    }
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') syncDeviceTimeZone()
    }
    syncDeviceTimeZone()
    window.addEventListener('focus', syncDeviceTimeZone)
    document.addEventListener('visibilitychange', syncWhenVisible)
    return () => {
      activeRequest = false
      window.removeEventListener('focus', syncDeviceTimeZone)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [authUser?.id, authUser?.time_zone, csrfToken])
  useEffect(() => {
    if (!authUser || !csrfToken) return undefined
    let activeRequest = true
    let processing = false
    const processDueIncome = async () => {
      if (processing || document.visibilityState !== 'visible') return
      processing = true
      try {
        const response = await fetch('/api/income-schedules/process', {
          method: 'POST', credentials: 'include',
          headers: { 'X-CSRFToken': csrfToken },
        })
        if (!response.ok) return
        const result = await response.json()
        if (activeRequest && result.created_count > 0) {
          setSalaryRefreshKey((value) => value + 1)
          const scheduleResponse = await fetch('/api/income-schedules', { credentials: 'include' })
          const scheduleData = await scheduleResponse.json().catch(() => ({}))
          if (activeRequest && scheduleResponse.ok) {
            const nextRuns = new Map((scheduleData.schedules || []).map((schedule) => [String(schedule.id), schedule.next_run || '']))
            setIncomeSchedules((items) => items.map((item) => ({ ...item, nextRun: nextRuns.get(String(item.id)) ?? item.nextRun ?? '' })))
          }
        }
      } catch {
        // A later poll or the next app visit can retry if the local API is restarting.
      } finally {
        processing = false
      }
    }
    const loadSchedules = async () => {
      setIncomeSchedulesLoading(true)
      try {
        const response = await fetch('/api/income-schedules', { credentials: 'include' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || 'Could not load automatic schedules. Check the API connection and try again.')
        if (!activeRequest) return
        setIncomeSchedules((result.schedules || []).map((schedule) => ({
          ...schedule,
          clientKey: `saved-${schedule.id}`,
          nextRun: schedule.next_run || '',
          name: schedule.name || 'Salary',
          transactionType: schedule.transaction_type || 'income',
          frequency: schedule.frequency || 'twice_monthly',
          monthlyDay: String(schedule.monthly_day ?? 1),
          amount: schedule.amount_minor ? (schedule.amount_minor / 100).toFixed(2) : '',
          firstPaydayDay: String(schedule.first_payday_day ?? 15),
          secondPaydayDay: String(schedule.second_payday_day ?? 31),
          categoryId: schedule.category_id ? String(schedule.category_id) : '',
          paymentMethodId: schedule.payment_method_id ? String(schedule.payment_method_id) : '',
          busy: false,
          error: '',
          saved: false,
        })))
        setIncomeSchedulesError('')
        await processDueIncome()
      } catch (error) {
        if (activeRequest) setIncomeSchedulesError(error.message)
      } finally {
        if (activeRequest) setIncomeSchedulesLoading(false)
      }
    }
    loadSchedules()
    const interval = window.setInterval(processDueIncome, 60_000)
    window.addEventListener('focus', processDueIncome)
    document.addEventListener('visibilitychange', processDueIncome)
    return () => {
      activeRequest = false
      window.clearInterval(interval)
      window.removeEventListener('focus', processDueIncome)
      document.removeEventListener('visibilitychange', processDueIncome)
    }
  }, [authUser?.id, csrfToken])
  useEffect(() => {
    if (!authUser || active !== 'Profile') return undefined
    let activeRequest = true
    const loadAuditHistory = async () => {
      setAuditLoading(true)
      setAuditError('')
      setExpandedAuditRows({})
      try {
        const params = new URLSearchParams({ limit: String(ACTIVITY_FETCH_SIZE), offset: '0', action: auditActionFilter, type: auditTypeFilter })
        const dateRange = getActivityDateRange(auditDatePreset, auditRangeStart, auditRangeEnd)
        if (dateRange.startDate && dateRange.endDate) {
          params.set('start_date', dateRange.startDate)
          params.set('end_date', dateRange.endDate)
        }
        if (auditPaymentFocusId) params.set('payment_id', auditPaymentFocusId)
        const collected = []
        let total = 0
        do {
          params.set('offset', String(collected.length))
          const response = await fetch(`/api/transaction-audit?${params}`, { credentials: 'include' })
          const result = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(result.error || 'Could not load transaction audit history.')
          total = Number(result.total) || 0
          collected.push(...(result.entries || []))
          if (!result.entries?.length) break
        } while (collected.length < total)
        if (!activeRequest) return
        setAuditEntries(collected)
        setAuditTotal(total)
      } catch (error) {
        if (activeRequest) setAuditError(error.message)
      } finally {
        if (activeRequest) setAuditLoading(false)
      }
    }
    const timer = window.setTimeout(loadAuditHistory, 250)
    return () => { activeRequest = false; window.clearTimeout(timer) }
  }, [authUser?.id, active, auditActionFilter, auditTypeFilter, auditDatePreset, auditRangeStart, auditRangeEnd, auditPaymentFocusId, salaryRefreshKey])
  useEffect(() => {
    if (active !== 'Profile' || !auditPaymentFocusId || auditLoading) return
    const focusedEntry = Array.from(document.querySelectorAll('[data-payment-audit-id]')).find((entry) => entry.dataset.paymentAuditId === String(auditPaymentFocusId))
    focusedEntry?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [active, auditEntries, auditLoading, auditPaymentFocusId])
  useEffect(() => {
    if (active !== 'Profile' && auditPaymentFocusId) setAuditPaymentFocusId('')
  }, [active, auditPaymentFocusId])
  useEffect(() => {
    const matching = categories.find((entry) => entry.type === kind.toLowerCase())
    if (kind === 'Expense' && categoryId === CREDIT_CARD_PAYMENT_CATEGORY) return
    if (matching && !categories.some((entry) => String(entry.id) === String(categoryId) && entry.type === kind.toLowerCase())) setCategoryId(String(matching.id))
  }, [categories, kind, categoryId])
  useEffect(() => {
    const today = localIsoDate()
    setTransactionDate(today.slice(0, 7) === selectedCycleDate.slice(0, 7) ? today : selectedCycleDate)
  }, [selectedCycleDate])
  const filtered = transactions.filter((t) => `${t.name} ${t.category} ${t.paymentMethodName || ''}`.toLowerCase().includes(search.toLowerCase()) && (filterCategory === 'all' || (filterCategory === '__credit_card_payment__' ? t.isCreditCardPayment : String(t.categoryId) === filterCategory)) && (filterType === 'all' || t.type === filterType))
  const transactionCategoryOptions = [
    { value: 'all', label: 'All categories' },
    ...categories.filter((entry) => filterType === 'all' || entry.type === filterType).map((entry) => ({ value: String(entry.id), label: entry.name })),
    ...(filterType === 'income' ? [] : [{ value: '__credit_card_payment__', label: 'Credit card payment' }]),
  ]
  const transactionPageCount = Math.max(1, Math.ceil(filtered.length / TRANSACTION_PAGE_SIZE))
  const currentTransactionPage = Math.min(transactionPage, transactionPageCount)
  const visibleTransactions = filtered.slice((currentTransactionPage - 1) * TRANSACTION_PAGE_SIZE, currentTransactionPage * TRANSACTION_PAGE_SIZE)
  const transactionPageStart = filtered.length ? (currentTransactionPage - 1) * TRANSACTION_PAGE_SIZE + 1 : 0
  const transactionPageEnd = Math.min(currentTransactionPage * TRANSACTION_PAGE_SIZE, filtered.length)
  const selectedPaymentGroup = paymentGroupsState.find((group) => group.id === activePaymentGroup)
  const selectedPaymentItem = selectedPaymentGroup?.cards[activePaymentCard]
  const selectedPaymentTransactions = selectedPaymentItem
    ? transactions.filter((transaction) => String(transaction.paymentMethodId) === String(selectedPaymentItem.userMethodId))
    : []
  const selectedPaymentSpendMinor = selectedPaymentTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + Math.round(Math.abs(transaction.amount) * 100), 0)
  const latestPaymentActivity = [...selectedPaymentTransactions].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.isoDate || 0).getTime()
    const dateB = new Date(b.createdAt || b.isoDate || 0).getTime()
    return dateB - dateA
  })[0]
  const selectedPaymentInfoItem = selectedPaymentItem ? {
    ...selectedPaymentItem,
    cycleSpendMinor: selectedPaymentSpendMinor,
    lastActivity: latestPaymentActivity
      ? [latestPaymentActivity.date, latestPaymentActivity.time].filter(Boolean).join(' · ')
      : '',
  } : null
  const movePaymentCard = (step) => setActivePaymentCard((current) => (current + step + selectedPaymentGroup.cards.length) % selectedPaymentGroup.cards.length)
  const currency = (minor) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: authUser?.currency_code || 'PHP', minimumFractionDigits: 2 }).format((minor || 0) / 100)
  const incomeMinor = dashboardData?.income_minor || 0
  const expensesMinor = dashboardData?.expenses_minor || 0
  const remainingMinor = dashboardData?.remaining_minor || 0
  const availableBalanceMinor = dashboardData?.available_balance_minor ?? remainingMinor
  const creditDebtMinor = dashboardData?.credit_debt_minor || 0
  const availableFundsMinor = Math.max(0, availableBalanceMinor) + expensesMinor
  const spendPercent = availableFundsMinor ? Math.min(100, expensesMinor / availableFundsMinor * 100) : 0
  const cycleStart = dashboardData?.cycle?.start_date
  const cycleEnd = dashboardData?.cycle?.end_date_exclusive
  const cycleLabel = cycleStart && cycleEnd ? `${new Date(`${cycleStart}T12:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${new Date(new Date(`${cycleEnd}T12:00:00`).getTime() - 86400000).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}` : 'Current cycle'
  const now = new Date()
  const currentMonth = new Date(`${selectedCycleDate.slice(0, 7)}-15T12:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  const cyclePicker = <BudgetCyclePicker value={selectedCycleDate} options={monthOptions} onChange={setSelectedCycleDate}/>
  const welcomeDate = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  const profileInitials = authUser?.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'R'
  const profileImageUrl = authUser?.profile_image_updated_at ? `/api/profile/avatar?v=${encodeURIComponent(authUser.profile_image_updated_at)}` : ''
  const selectedAvatarPalette = avatarPalettes.find((palette) => palette.id === avatarPaletteId) || avatarPalettes[0]
  const notifications = budgets.flatMap((budget) => {
    const percent = budget.limit_minor > 0 ? Math.round((budget.spent_minor || 0) / budget.limit_minor * 100) : 0
    if (percent < 80) return []
    const overLimit = percent >= 100
    const id = `budget-${selectedCycleDate}-${budget.id}-${overLimit ? 'over' : 'near'}`
    return [{ id, title: overLimit ? 'Budget limit reached' : 'Budget nearly reached', message: `${budget.category || 'Category'} · ${currency(budget.spent_minor)} of ${currency(budget.limit_minor)} (${percent}%)`, overLimit }]
  }).sort((a, b) => Number(b.overLimit) - Number(a.overLimit))
  const unreadNotifications = notifications.filter((notification) => !readNotificationIds.includes(notification.id))
  const profileIsDirty = Boolean(authUser && (
    profileFirstName.trim() !== (authUser.first_name || '') ||
    profileMiddleName.trim() !== (authUser.middle_name || '') ||
    profileLastName.trim() !== (authUser.last_name || '') ||
    profileTimeZone !== (authUser.time_zone || detectTimeZone())
  ))
  const { tab: settingsTab, requestTab: selectSettingsTab, pendingTab: pendingSettingsTab, stayOnTab: stayOnSettingsTab, discardAndSwitch: discardAndSwitchSettingsTab, syncTabHash } = useSettingsTab({ isDirty: profileIsDirty, onDiscard: discardProfileChanges, onRouteRestore: () => setActive('Profile') })
  const savedPaymentMethods = paymentGroupsState.flatMap((group) => group.cards.map((card) => ({ ...card, groupId: group.id })))
  const accountTransactionCount = transactions.length
  const regularTransactionCount = transactions.filter((item) => !item.isCreditCardPayment).length
  const cardPaymentTransactionCount = transactions.filter((item) => item.isCreditCardPayment).length
  const transactionCountBreakdown = `${regularTransactionCount} income/expense · ${cardPaymentTransactionCount} card payments`
  const paymentMethodBreakdown = ['ewallet', 'debit', 'credit', 'cash'].map((type) => {
    const count = paymentGroupsState.find((group) => group.id === type)?.cards.length || 0
    const label = { ewallet: 'e-wallet', debit: 'debit', credit: 'credit', cash: 'cash' }[type]
    return count ? `${count} ${label}` : null
  }).filter(Boolean).join(' · ')
  const accountCreatedDate = authUser?.created_at ? new Date(authUser.created_at) : null
  const accountCreatedAt = accountCreatedDate && Number.isFinite(accountCreatedDate.getTime()) ? accountCreatedDate.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }) : ''
  const summarySpend = dashboardData ? currency(expensesMinor) : '—'
  const accountSummaryLoading = !dashboardData || !paymentGroupsState.length || incomeSchedulesLoading
  const setupAccountId = authUser?.id || authUser?.email
  const setupHasPaymentMethod = paymentGroupsState.some((group) => group.id !== 'cash' && group.cards.length > 0)
  const setupItems = [
    { id: 'transaction', title: 'Record a transaction', detail: 'Add income or an expense', done: transactions.length > 0, action: startNewTransaction, actionLabel: 'Add' },
    { id: 'budget', title: 'Set a budget', detail: 'Choose a category and limit', done: budgets.length > 0, action: () => { setActive('Budgets'); setBudgetCategoryId(''); setBudgetLimit(''); setBudgetError(''); setShowBudgetForm(true) }, actionLabel: 'Set up' },
    { id: 'payment', title: 'Add a card or wallet', detail: 'Optional · cash is already ready', done: setupHasPaymentMethod || paymentSetupSkipped, action: openMethodPicker, actionLabel: 'Add', optional: true },
  ]
  const setupCompletedCount = setupItems.filter((item) => item.done).length
  const creditCardPaymentTargets = savedPaymentMethods.filter((method) => method.groupId === 'credit')
  const creditCardPaymentSources = savedPaymentMethods.filter((method) => method.groupId === 'cash' || method.groupId === 'debit')
  const incomeDetailsByDestination = [...transactions.filter((item) => item.type === 'income').reduce((groups, item) => {
    const method = savedPaymentMethods.find((entry) => String(entry.userMethodId) === String(item.paymentMethodId))
    const key = method ? `method:${method.userMethodId}` : `legacy:${item.paymentMethodName || 'unknown'}`
    if (!groups.has(key)) groups.set(key, { key, method, name: method ? paymentMethodDisplayName(method) : item.paymentMethodName || 'Unassigned', totalMinor: 0, items: [] })
    const group = groups.get(key)
    group.totalMinor += Math.round(Math.abs(item.amount) * 100)
    group.items.push(item)
    return groups
  }, new Map()).values()].map((group) => ({ ...group, items: group.items.sort((a, b) => new Date(b.createdAt || b.isoDate).getTime() - new Date(a.createdAt || a.isoDate).getTime()) })).sort((a, b) => new Date(b.items[0]?.createdAt || b.items[0]?.isoDate || 0).getTime() - new Date(a.items[0]?.createdAt || a.items[0]?.isoDate || 0).getTime() || b.totalMinor - a.totalMinor)
  const normalizedIncomeSearch = incomeDetailSearch.trim().toLowerCase()
  const filteredIncomeDetails = normalizedIncomeSearch ? incomeDetailsByDestination.flatMap((group) => {
    const destinationMatches = `${group.name} ${group.method?.kind || ''}`.toLowerCase().includes(normalizedIncomeSearch)
    const matchingItems = destinationMatches ? group.items : group.items.filter((item) => `${item.name} ${item.category} ${item.date} ${item.time} ${Math.abs(item.amount)}`.toLowerCase().includes(normalizedIncomeSearch))
    if (!matchingItems.length) return []
    return [{ ...group, items: matchingItems, totalMinor: matchingItems.reduce((total, item) => total + Math.round(Math.abs(item.amount) * 100), 0) }]
  }) : incomeDetailsByDestination
  const incomeDetailPageCount = Math.max(1, Math.ceil(filteredIncomeDetails.length / 2))
  const currentIncomeDetailPage = Math.min(incomeDetailPage, incomeDetailPageCount)
  const visibleIncomeDetails = filteredIncomeDetails.slice((currentIncomeDetailPage - 1) * 2, currentIncomeDetailPage * 2)
  const indebtedCreditCards = creditCardPaymentTargets.filter((method) => method.debtMinor > 0).sort((a, b) => b.debtMinor - a.debtMinor)
  const filteredIndebtedCreditCards = indebtedCreditCards.filter((method) => `${paymentMethodDisplayName(method)} ${method.kind} ${method.debtMinor}`.toLowerCase().includes(creditDebtSearch.trim().toLowerCase()))
  const creditDebtPageCount = Math.max(1, Math.ceil(filteredIndebtedCreditCards.length / 10))
  const currentCreditDebtPage = Math.min(creditDebtPage, creditDebtPageCount)
  const visibleIndebtedCreditCards = filteredIndebtedCreditCards.slice((currentCreditDebtPage - 1) * 10, currentCreditDebtPage * 10)
  const selectedCreditCardTarget = creditCardPaymentTargets.find((method) => String(method.userMethodId) === creditCardPaymentTargetId)
  const isCreditCardPayment = kind === 'Expense' && categoryId === CREDIT_CARD_PAYMENT_CATEGORY
  const filteredIncomeSchedules = incomeSchedules.filter((schedule) => {
    if (incomeScheduleTypeFilter !== 'all' && schedule.transactionType !== incomeScheduleTypeFilter) return false
    const query = incomeScheduleSearch.trim().toLocaleLowerCase()
    if (!query) return true
    const category = categories.find((entry) => String(entry.id) === String(schedule.categoryId))
    const method = savedPaymentMethods.find((entry) => String(entry.userMethodId) === String(schedule.paymentMethodId))
    const searchable = [schedule.name, schedule.transactionType, schedule.frequency, schedule.monthlyDay, schedule.firstPaydayDay, schedule.secondPaydayDay, category?.name, method ? paymentMethodDisplayName(method) : 'Cash', schedule.enabled ? 'active enabled' : 'paused disabled', schedule.amount].filter(Boolean).join(' ').toLocaleLowerCase()
    return searchable.includes(query)
  })
  const incomeSchedulePageCount = Math.max(1, Math.ceil(filteredIncomeSchedules.length / SCHEDULE_PAGE_SIZE))
  const currentIncomeSchedulePage = Math.min(incomeSchedulePage, incomeSchedulePageCount)
  const visibleIncomeSchedules = filteredIncomeSchedules.slice((currentIncomeSchedulePage - 1) * SCHEDULE_PAGE_SIZE, currentIncomeSchedulePage * SCHEDULE_PAGE_SIZE)
  const incomeSchedulePageStart = filteredIncomeSchedules.length ? (currentIncomeSchedulePage - 1) * SCHEDULE_PAGE_SIZE + 1 : 0
  const incomeSchedulePageEnd = Math.min(currentIncomeSchedulePage * SCHEDULE_PAGE_SIZE, filteredIncomeSchedules.length)
  const auditPageCount = Math.max(1, Math.ceil(auditTotal / ACTIVITY_PAGE_SIZE))
  const currentAuditPage = Math.min(auditPage, auditPageCount)
  const auditPageStart = auditTotal ? (currentAuditPage - 1) * ACTIVITY_PAGE_SIZE + 1 : 0
  const auditPageEnd = Math.min(currentAuditPage * ACTIVITY_PAGE_SIZE, auditTotal)
  const visibleAuditEntries = auditEntries.slice((currentAuditPage - 1) * ACTIVITY_PAGE_SIZE, currentAuditPage * ACTIVITY_PAGE_SIZE)

  useEffect(() => {
    if (!authUser || authView !== 'app' || !dashboardData || !showGettingStarted || setupCompletedCount < setupItems.length) return
    setShowGettingStarted(false)
    if (setupAccountId) {
      try { window.localStorage.setItem(`resibo-setup-dismissed-${setupAccountId}`, 'true') } catch { /* Keep completion for this session. */ }
    }
  }, [authUser?.id, authUser?.email, authView, dashboardData, showGettingStarted, setupCompletedCount, setupItems.length, setupAccountId])

  useEffect(() => {
    setIncomeSchedulePage((page) => Math.min(page, incomeSchedulePageCount))
  }, [incomeSchedulePageCount])

  useEffect(() => {
    const hash = window.location.hash
    if (active === 'Profile') {
      if (!hash.startsWith('#settings/')) syncTabHash()
    } else if (hash.startsWith('#settings/')) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
  }, [active])

  useEffect(() => {
    setAuditPage((page) => Math.min(page, auditPageCount))
  }, [auditPageCount])

  useEffect(() => {
    setCreditDebtPage((page) => Math.min(page, creditDebtPageCount))
  }, [creditDebtPageCount])

  useEffect(() => {
    setIncomeDetailPage((page) => Math.min(page, incomeDetailPageCount))
  }, [incomeDetailPageCount])

  useEffect(() => {
    setTransactionPage(1)
  }, [search, filterType, filterCategory, selectedCycleDate])

  useEffect(() => {
    setTransactionPage((page) => Math.min(page, transactionPageCount))
  }, [transactionPageCount])

  async function addTransaction(event) {
    event.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) return
    const category = isCreditCardPayment ? null : categories.find((entry) => String(entry.id) === String(categoryId) && entry.type === kind.toLowerCase()) || categories.find((entry) => entry.type === kind.toLowerCase())
    if (!isCreditCardPayment && !category) { setTransactionError('Add a matching category before saving this transaction.'); return }
    const creditCardTarget = creditCardPaymentTargets.find((method) => String(method.userMethodId) === creditCardPaymentTargetId)
    const paymentSource = creditCardPaymentSources.find((method) => String(method.userMethodId) === paymentMethodId)
    if (isCreditCardPayment && (!creditCardTarget || !paymentSource)) { setTransactionError('Choose a credit card and pay from cash or a debit card.'); return }
    if (isCreditCardPayment && Math.round(value * 100) > (creditCardTarget?.debtMinor || 0)) { setTransactionError('The payment cannot be more than the current debt on this card.'); return }
    if (isCreditCardPayment && Math.round(value * 100) > paymentMethodSpendableMinor(paymentSource)) { setTransactionError(`Insufficient balance: ${paymentSource?.groupId === 'cash' ? 'Cash' : paymentMethodDisplayName(paymentSource)} has ${currency(paymentMethodSpendableMinor(paymentSource))} available. Choose another payment method.`); return }
    const selectedMethod = savedPaymentMethods.find((method) => String(method.userMethodId) === paymentMethodId)
    if (!isCreditCardPayment && !editingTransaction && !selectedMethod) { setTransactionError('Choose a payment method with an available balance.'); return }
    if (!isCreditCardPayment && kind === 'Expense' && selectedMethod && Math.round(value * 100) > paymentMethodSpendableMinor(selectedMethod)) { setTransactionError(`Insufficient balance: ${paymentMethodDisplayName(selectedMethod)} has ${currency(paymentMethodSpendableMinor(selectedMethod))} available. Choose another payment method.`); return }
    setTransactionError('')
    setTransactionBusy(true)
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      setCsrfToken(csrfData.csrf_token || '')
      if (isCreditCardPayment) {
        const response = await fetch('/api/credit-card-payments', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfData.csrf_token }, body: JSON.stringify({ credit_card_method_id: creditCardTarget.userMethodId, source_method_id: paymentSource.userMethodId, amount: value, date: transactionDate, note }) })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          const fallback = response.status === 404
            ? 'The credit card payment API is not active. Restart the Flask server and try again.'
            : response.status >= 500
              ? `The server could not record this payment (HTTP ${response.status}). Check the Flask or database error log.`
              : `Could not record this credit card payment (HTTP ${response.status}).`
          throw new Error(result.error || fallback)
        }
        setAmount(''); setNote(''); setEditingTransaction(null); setShowAdd(false); setSavedMessage('Credit card payment recorded.'); setSaved(true); setSalaryRefreshKey((current) => current + 1)
        window.setTimeout(() => setSaved(false), 3000)
        return
      }
      const legacyMethod = paymentMethodId.startsWith('legacy:') ? paymentMethodId.slice(7) : ''
      const methodName = selectedMethod ? selectedMethod.groupId === 'ewallet' ? selectedMethod.issuer.toLowerCase() : selectedMethod.groupId === 'cash' ? 'cash' : selectedMethod.groupId === 'debit' ? 'debit card' : 'credit card' : legacyMethod || (editingTransaction && !paymentMethodId ? 'cash' : 'cash')
      const payload = { type: kind.toLowerCase(), amount: value, date: transactionDate, note, category_id: category.id, payment_method: methodName }
      if (editingTransaction) payload.payment_method_id = selectedMethod?.userMethodId ?? null
      else if (selectedMethod) payload.payment_method_id = selectedMethod.userMethodId
      const response = await fetch(editingTransaction ? `/api/transactions/${editingTransaction.id}` : '/api/transactions', { method: editingTransaction ? 'PATCH' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfData.csrf_token }, body: JSON.stringify(payload) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || `Could not ${editingTransaction ? 'update' : 'save'} this transaction.`)
      setAmount(''); setNote(''); setEditingTransaction(null); setShowAdd(false); setSavedMessage(editingTransaction ? 'Transaction updated.' : 'Transaction added to your activity.'); setSaved(true); setAuthUser((current) => current ? { ...current } : current)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (error) { setTransactionError(error instanceof TypeError ? 'Can’t reach the server. Try again.' : error.message) }
    finally { setTransactionBusy(false) }
  }

  function openTransactionMenu(event, item) {
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    const menuWidth = 190
    const menuHeight = 94
    const x = event.type === 'contextmenu' ? event.clientX : bounds.right - menuWidth
    const y = event.type === 'contextmenu' ? event.clientY : bounds.bottom + 4
    setTransactionContextMenu({ item, x: Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8)), y: Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8)) })
  }

  function showCreditCardPaymentInHistory(item) {
    setTransactionContextMenu(null)
    setAuditActionFilter('all')
    setAuditTypeFilter('card_payment')
    setAuditDatePreset('all_time')
    setAuditRangeStart('')
    setAuditRangeEnd('')
    setAuditPage(1)
    setAuditPaymentFocusId(String(item.creditCardPaymentId))
    setActive('Profile')
  }

  function clearActivityFilters() {
    setAuditPaymentFocusId('')
    setAuditActionFilter('all')
    setAuditTypeFilter('all')
    setAuditDatePreset('this_month')
    setAuditRangeStart('')
    setAuditRangeEnd('')
    setAuditPage(1)
  }

  function exportActivityCsv() {
    const columns = ['date', 'time', 'action', 'type', 'title', 'account', 'category', 'amount', 'reference ID']
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = auditEntries.map((entry) => {
      const snapshot = entry.action === 'delete' ? entry.before_data : entry.after_data || entry.before_data
      const presentation = buildActivityRowPresentation({ entry, snapshot, paymentMethods: savedPaymentMethods })
      const date = new Date(entry.occurred_at)
      const amount = Number(snapshot?.amount_minor)
      const signed = Number.isFinite(amount) ? presentation.direction === 'inflow' ? amount : presentation.direction === 'outflow' ? -amount : 0 : ''
      return [Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-CA') : '', Number.isFinite(date.getTime()) ? date.toLocaleTimeString('en-PH') : '', presentation.actionLabel, presentation.typeLabel, presentation.title, presentation.accountLabel, snapshot?.category || '', Number.isFinite(signed) ? `${signed < 0 ? '-' : signed > 0 ? '+' : ''}${currency(Math.abs(signed))}` : '', entry.transaction_id ? `#${entry.transaction_id}` : `#${entry.id}`]
    })
    const csv = [columns, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'resibo-activity.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function openPaymentCardMenu(event, card) {
    if (!card?.userMethodId) return
    event.preventDefault()
    const menuWidth = 190
    const menuHeight = 86
    setPaymentCardContextMenu({ card, x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)) })
  }

  function handlePaymentCardContextMenu(event) {
    const cardElement = event.target.closest?.('.payment-card')
    if (!cardElement) return
    const cardElements = [...event.currentTarget.querySelectorAll('.payment-card')]
    openPaymentCardMenu(event, selectedPaymentGroup.cards[cardElements.indexOf(cardElement)])
  }

  function startNewTransaction() {
    setEditingTransaction(null)
    setKind('Expense')
    setAmount('')
    setNote('')
    setTransactionDate(localIsoDate())
    setCategoryId(String(categories.find((entry) => entry.type === 'expense')?.id || ''))
    const availableSource = savedPaymentMethods.find((method) => ['cash', 'debit', 'ewallet'].includes(method.groupId) && method.balanceMinor > 0)
    const cashSource = savedPaymentMethods.find((method) => method.groupId === 'cash')
    setPaymentMethodId(String(availableSource?.userMethodId || cashSource?.userMethodId || ''))
    setCreditCardPaymentTargetId(String(creditCardPaymentTargets.find((method) => method.debtMinor > 0)?.userMethodId || creditCardPaymentTargets[0]?.userMethodId || ''))
    setTransactionError('')
    setShowAdd(true)
  }

  function openTransactionsForSpending() {
    setActive('Transactions')
    setFilterType('expense')
    setFilterCategory('all')
    setSearch('')
    setShowFilters(false)
    setTransactionPage(1)
  }

  function openCreditCardDebtModal() {
    setCreditDebtSearch('')
    setCreditDebtPage(1)
    setDashboardDetailModal('debt')
  }

  function openIncomeDetailsModal() {
    setIncomeDetailPage(1)
    setIncomeDetailSearch('')
    setIncomeDetailTransactionPages({})
    setDashboardDetailModal('income')
  }

  function openCreditCardSettlement(method) {
    setDashboardDetailModal(null)
    setEditingTransaction(null)
    setKind('Expense')
    setCategoryId(CREDIT_CARD_PAYMENT_CATEGORY)
    setCreditCardPaymentTargetId(String(method.userMethodId))
    const source = availablePaymentMethodsFirst(creditCardPaymentSources).find((entry) => paymentMethodSpendableMinor(entry) > 0)
    setPaymentMethodId(String(source?.userMethodId || ''))
    setAmount((method.debtMinor / 100).toFixed(2))
    setNote('')
    setTransactionDate(localIsoDate())
    setTransactionError('')
    setShowAdd(true)
  }

  function handleSummaryCardKeyDown(event, action) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    action()
  }

  function closeTransactionForm() {
    setShowAdd(false)
    setEditingTransaction(null)
    setTransactionError('')
    setAmount('')
    setNote('')
  }

  function renderTransactionRow(item) {
    const paymentMethodLabel = item.method.length > 17 ? `${item.method.slice(0, 17)}…` : item.method
    return <div className={`transaction-row${item.isCreditCardPayment ? ' credit-card-payment-row' : ''}`} key={item.id} onContextMenu={(event) => openTransactionMenu(event, item)}>
      <div className="transaction-name"><span className={`transaction-icon ${item.color}`}><item.icon size={17}/></span><span><strong>{item.name}</strong><small>{item.category}</small></span></div>
      <span className="payment-method" title={item.method}>{paymentMethodLabel}</span>
      <time className="transaction-date" dateTime={item.createdAt || item.isoDate}><span>{item.date}</span>{item.time && <small>{item.time}</small>}</time>
      <div className="transaction-amount-cell"><strong className={`transaction-amount ${item.amount > 0 ? 'positive' : ''}`}>{item.amount > 0 ? '+' : '−'}{peso(item.amount)}</strong><button type="button" className="transaction-more" aria-label={`Actions for ${item.name}`} aria-haspopup="menu" onClick={(event) => { event.stopPropagation(); openTransactionMenu(event, item) }}><MoreHorizontal size={17}/></button></div>
    </div>
  }

  function editTransaction(item) {
    setTransactionContextMenu(null)
    setEditingTransaction(item)
    setKind(item.type === 'income' ? 'Income' : 'Expense')
    setAmount(Math.abs(item.amount).toFixed(2))
    setNote(item.note || '')
    setTransactionDate(item.isoDate || localIsoDate())
    const matchingCategory = categories.some((entry) => String(entry.id) === String(item.categoryId) && entry.type === item.type)
      ? String(item.categoryId)
      : String(categories.find((entry) => entry.type === item.type)?.id || '')
    setCategoryId(matchingCategory)
    const savedMethod = savedPaymentMethods.find((method) => String(method.userMethodId) === String(item.paymentMethodId))
    const hasSavedMethod = Boolean(savedMethod)
    const invalidIncomeCredit = item.type === 'income' && (savedMethod?.groupId === 'credit' || item.paymentMethodName === 'credit card')
    setPaymentMethodId(invalidIncomeCredit ? '' : hasSavedMethod ? String(item.paymentMethodId) : item.paymentMethodName === 'cash' ? String(savedPaymentMethods.find((method) => method.groupId === 'cash')?.userMethodId || '') : item.paymentMethodName ? `legacy:${item.paymentMethodName}` : '')
    setTransactionError('')
    setShowAdd(true)
  }

  function confirmDeleteTransaction(item) {
    setTransactionContextMenu(null)
    setTransactionDeleteError('')
    setTransactionToDelete(item)
  }

  async function deleteTransaction() {
    if (!transactionToDelete) return
    setTransactionDeleteError('')
    setTransactionDeleteBusy(true)
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const response = await fetch(`/api/transactions/${transactionToDelete.id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRFToken': csrfData.csrf_token } })
      const result = response.status === 204 ? {} : await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not delete this transaction.')
      setTransactionToDelete(null)
      setSavedMessage('Transaction deleted.')
      setSaved(true)
      setAuthUser((current) => current ? { ...current } : current)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (error) { setTransactionDeleteError(error instanceof TypeError ? 'Can’t reach the server. Try again.' : error.message) }
    finally { setTransactionDeleteBusy(false) }
  }

  async function saveBudget(event) {
    event.preventDefault()
    setBudgetError('')
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const response = await fetch('/api/budgets', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfData.csrf_token }, body: JSON.stringify({ category_id: budgetCategoryId ? Number(budgetCategoryId) : null, limit: Number(budgetLimit), date: selectedCycleDate }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not save this budget.')
      setShowBudgetForm(false); setBudgetLimit(''); setAuthUser((current) => current ? { ...current } : current)
    } catch (error) { setBudgetError(error instanceof TypeError ? 'Can’t reach the server. Try again.' : error.message) }
  }

  function openMethodPicker() {
    setMethodError('')
    setDesignSearch('')
    setVisibleDesignCount(5)
    setDesignTypeFilter('all')
    setShowMethodPicker(true)
  }

  async function addPaymentDesign(design) {
    const category = design.category === 'debit_card' ? 'debit' : design.category === 'credit_card' ? 'credit' : design.category
    const group = paymentGroupsState.find((entry) => entry.id === category)
    const existingCashMethod = category === 'cash' ? group?.cards.find((card) => card.userMethodId) : null
    setMethodError('')
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      setCsrfToken(csrfData.csrf_token || '')
      const payload = { design_id: design.id }
      const response = await fetch(existingCashMethod ? `/api/payment-methods/${existingCashMethod.userMethodId}` : '/api/payment-methods', { method: existingCashMethod ? 'PATCH' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfData.csrf_token }, body: JSON.stringify(payload) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not save this payment method.')
      const savedMethod = result.payment_method
      const savedDesign = savedMethod.design
      const network = cardNetwork(savedDesign)
      const card = { userMethodId: savedMethod.id, name: savedDesign.display_name, customLabel: savedMethod.custom_label || '', cardholderName: savedMethod.cardholder_name || '', lastFour: savedMethod.last_four || '', expiryMonth: savedMethod.expiry_month || null, expiryYear: savedMethod.expiry_year || null, kind: cardTypeLabel(savedDesign), network, patternKey: savedDesign.pattern_key || 'gradient', method: category === 'ewallet' ? savedDesign.issuer : category === 'cash' ? 'Cash' : category === 'debit' ? 'Debit card' : 'Credit card', amount: category === 'credit' ? peso((savedMethod.available_minor || 0) / 100) : category === 'debit' || category === 'ewallet' || category === 'cash' ? peso((savedMethod.balance_minor || 0) / 100) : '₱0.00', amountLabel: category === 'debit' || category === 'ewallet' || category === 'cash' ? 'BALANCE' : category === 'credit' ? 'AVAILABLE TO SPEND' : 'SPENT THIS CYCLE', subAmount: category === 'credit' ? peso((savedMethod.debt_minor || 0) / 100) : '', subLabel: category === 'credit' ? 'DEBT' : '', cycleSpend: '₱0.00', balanceMinor: savedMethod.balance_minor || 0, creditLimitMinor: savedMethod.credit_limit_minor || 0, debtMinor: savedMethod.debt_minor || 0, symbol: savedDesign.issuer, theme: savedDesign.theme_key, issuer: savedDesign.issuer, designId: savedDesign.id, groupId: category, backgroundColor: savedDesign.background_color, foregroundColor: savedDesign.foreground_color, accentColor: savedDesign.accent_color }
      const cardIndex = existingCashMethod ? group.cards.findIndex((item) => item.userMethodId === existingCashMethod.userMethodId) : group.cards.length
      setPaymentGroupsState((groups) => groups.map((entry) => entry.id !== category ? entry : { ...entry, cards: existingCashMethod ? entry.cards.map((item) => item.userMethodId === existingCashMethod.userMethodId ? card : item) : [...entry.cards, card] }))
      setActivePaymentGroup(category); setActivePaymentCard(cardIndex); setShowMethodPicker(false)
      if (category !== 'cash') configurePaymentMethod(card)
    } catch (error) { setMethodError(error instanceof TypeError ? 'Can’t reach the server. Try again.' : error.message) }
  }

  function configurePaymentMethod(card) {
    setEditingMethod(card)
    setMethodSettingsError('')
    setMethodBalance((card.balanceMinor / 100).toFixed(2))
    setMethodCreditLimit((card.creditLimitMinor / 100).toFixed(2))
    setMethodDebt((card.debtMinor / 100).toFixed(2))
    setMethodCardholderName(card.cardholderName || '')
    setMethodLastFour(card.lastFour || '')
    setMethodExpiry(card.expiryMonth && card.expiryYear ? `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}` : '')
  }

  function closePaymentMethodEditor() {
    setEditingMethod(null)
    setMethodCardholderName('')
    setMethodLastFour('')
    setMethodExpiry('')
  }

  async function saveCardExpiry(card, value) {
    const digits = value.replace(/\D/g, '')
    const month = Number(digits.slice(0, 2))
    if (digits.length !== 4 || month < 1 || month > 12) {
      setCardExpiryError('Use MM/YY')
      return false
    }
    setCardExpiryError('')
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const response = await fetch(`/api/payment-methods/${card.userMethodId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfData.csrf_token }, body: JSON.stringify({ expiry_month: month, expiry_year: 2000 + Number(digits.slice(2, 4)) }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not save the expiry date.')
      const updated = result.payment_method
      setPaymentGroupsState((groups) => groups.map((group) => ({ ...group, cards: group.cards.map((item) => item.userMethodId === card.userMethodId ? { ...item, expiryMonth: updated.expiry_month, expiryYear: updated.expiry_year } : item) })))
      setEditingExpiryCardId(null)
      setExpiryDraft('')
      return true
    } catch (error) {
      setCardExpiryError(error instanceof TypeError ? 'Could not reach the server.' : error.message)
      return false
    }
  }

  function formatExpiryInput(value) {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
  }

  async function savePaymentMethodSettings(event) {
    event.preventDefault()
    setMethodSettingsError('')
    const lastFour = methodLastFour.replace(/\D/g, '')
    if (methodLastFour && lastFour.length !== 4) { setMethodSettingsError('Enter only the last four card digits.'); return }
    const expiryDigits = methodExpiry.replace(/\D/g, '')
    if (methodExpiry && (expiryDigits.length !== 4 || Number(expiryDigits.slice(0, 2)) < 1 || Number(expiryDigits.slice(0, 2)) > 12)) { setMethodSettingsError('Enter a valid expiry date in MM/YY format.'); return }
    setMethodSettingsBusy(true)
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const payload = {}
      if (editingMethod.groupId !== 'cash') {
        payload.cardholder_name = methodCardholderName.trim()
        payload.last_four = lastFour
        payload.expiry_month = expiryDigits ? Number(expiryDigits.slice(0, 2)) : null
        payload.expiry_year = expiryDigits ? 2000 + Number(expiryDigits.slice(2, 4)) : null
      }
      if (editingMethod.groupId === 'credit') Object.assign(payload, { credit_limit: Number(methodCreditLimit), debt: Number(methodDebt) })
      else payload.balance = Number(methodBalance)
      const response = await fetch(`/api/payment-methods/${editingMethod.userMethodId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfData.csrf_token }, body: JSON.stringify(payload) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not update this card.')
      const updated = result.payment_method
      setPaymentGroupsState((groups) => groups.map((group) => ({ ...group, cards: group.cards.map((card) => card.userMethodId !== editingMethod.userMethodId ? card : { ...card, name: updated.design.display_name, customLabel: updated.custom_label || '', cardholderName: updated.cardholder_name || '', lastFour: updated.last_four || '', expiryMonth: updated.expiry_month || null, expiryYear: updated.expiry_year || null, balanceMinor: updated.balance_minor || 0, creditLimitMinor: updated.credit_limit_minor || 0, debtMinor: updated.debt_minor || 0, amount: card.groupId === 'credit' ? peso((updated.available_minor || 0) / 100) : peso((updated.balance_minor || 0) / 100), subAmount: card.groupId === 'credit' ? peso((updated.debt_minor || 0) / 100) : '', kind: [updated.design.product_type, cardNetwork(updated.design)].filter(Boolean).join(' · ').toUpperCase(), network: cardNetwork(updated.design), patternKey: updated.design.pattern_key || 'gradient', theme: updated.design.theme_key, issuer: updated.design.issuer, symbol: updated.design.issuer, backgroundColor: updated.design.background_color, foregroundColor: updated.design.foreground_color, accentColor: updated.design.accent_color }) })))
      setRevealedPaymentCardId(null)
      closePaymentMethodEditor()
      setAuthUser((current) => current ? { ...current } : current)
    } catch (error) { setMethodSettingsError(error instanceof TypeError ? 'Can’t reach the server. Try again.' : error.message) }
    finally { setMethodSettingsBusy(false) }
  }

  async function removePaymentMethod() {
    if (!confirmRemoveMethod) return
    setMethodRemoveError('')
    setMethodRemoveBusy(true)
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const response = await fetch(`/api/payment-methods/${confirmRemoveMethod.userMethodId}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRFToken': csrfData.csrf_token } })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not remove this payment method.')
      const groupId = confirmRemoveMethod.groupId
      setPaymentGroupsState((groups) => groups.map((group) => group.id === groupId ? { ...group, cards: group.cards.filter((card) => card.userMethodId !== confirmRemoveMethod.userMethodId) } : group))
      setActivePaymentCard((index) => Math.max(0, Math.min(index, (selectedPaymentGroup?.cards.length || 1) - 2)))
      setConfirmRemoveMethod(null)
      setAuthUser((current) => current ? { ...current } : current)
    } catch (error) { setMethodRemoveError(error instanceof TypeError ? 'Can’t reach the server. Try again.' : error.message) }
    finally { setMethodRemoveBusy(false) }
  }

  function getAuthFieldError(field, values = {}) {
    const firstName = values.firstName ?? authFirstName
    const lastName = values.lastName ?? authLastName
    const email = values.email ?? authEmail
    const password = values.password ?? authPassword
    const confirmation = values.confirmPassword ?? authConfirmPassword
    if (field === 'firstName' && !firstName.trim()) return 'First name is required.'
    if (field === 'lastName' && !lastName.trim()) return 'Last name is required.'
    if (field === 'email') return validateEmail(email)
    if (field === 'password') return authMode === 'register' ? validatePassword(password) : !password ? 'Password is required.' : ''
    if (field === 'confirmPassword') return !confirmation ? 'Please confirm your password.' : !passwordsMatch(password, confirmation) ? 'Passwords don’t match.' : ''
    return ''
  }

  function updateAuthField(field, setValue, value) {
    const fieldValue = field === 'firstName' ? { firstName: value }
      : field === 'lastName' ? { lastName: value }
        : field === 'email' ? { email: value }
          : field === 'password' ? { password: value }
            : { confirmPassword: value }
    setValue(value)
    setAuthError('')
    if (field === 'email') setEmailAlreadyRegistered(false)
    setAuthFieldErrors((current) => {
      const updates = { [field]: authSubmitAttempted ? getAuthFieldError(field, fieldValue) : '' }
      if (field === 'password' && authMode === 'register' && authConfirmPassword) updates.confirmPassword = getAuthFieldError('confirmPassword', { password: value })
      if (field === 'confirmPassword') updates.confirmPassword = authSubmitAttempted ? getAuthFieldError(field, fieldValue) : ''
      return { ...current, ...updates }
    })
  }

  function focusAuthField(field) {
    const refs = { firstName: firstNameInputRef, lastName: lastNameInputRef, email: emailInputRef, password: passwordInputRef, confirmPassword: confirmPasswordInputRef }
    refs[field]?.current?.focus()
  }

  async function submitAuth(event) {
    event.preventDefault()
    const registering = authMode === 'register'
    const verifying = authMode === 'verify'
    if (!verifying) {
      const fields = registering ? ['firstName', 'lastName', 'email', 'password', 'confirmPassword'] : ['email', 'password']
      const errors = Object.fromEntries(fields.map((field) => [field, getAuthFieldError(field)]))
      setAuthSubmitAttempted(true)
      setAuthFieldErrors((current) => ({ ...current, ...errors }))
      const firstInvalid = fields.find((field) => errors[field])
      if (firstInvalid) {
        focusAuthField(firstInvalid)
        return
      }
    }
    setAuthError(''); setAuthMessage(''); setAuthBusy(true)
    try {
      let token = csrfToken
      const csrfResponse = await fetch('/api/csrf', { credentials: 'include' })
      const csrfData = await csrfResponse.json().catch(() => null)
      if (!csrfResponse.ok || !csrfData?.csrf_token) {
        const detail = csrfData?.error || `The security check failed (HTTP ${csrfResponse.status}). Refresh the page and try again.`
        throw new Error(detail)
      }
      token = csrfData.csrf_token
      const endpoint = verifying ? '/api/auth/verify-email' : registering ? '/api/auth/register' : '/api/auth/login'
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
        body: JSON.stringify(verifying ? { email: pendingEmail || authEmail, code: verificationCode } : registering ? { first_name: authFirstName, middle_name: authMiddleName, last_name: authLastName, email: authEmail, password: authPassword } : { email: authEmail, password: authPassword, remember_me: rememberMe }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        const action = verifying ? 'verify your email' : registering ? 'create the account' : 'sign in'
        const message = result?.error || (response.status === 429
          ? 'Too many attempts. Wait a while before trying again.'
          : `Could not ${action}: the server returned HTTP ${response.status}${response.statusText ? ` (${response.statusText})` : ''} without a readable error.`)
        if (registering && (response.status === 409 || /already registered|those details/i.test(message))) {
          setAuthFieldErrors((current) => ({ ...current, email: 'Email already registered.' }))
          setEmailAlreadyRegistered(true)
          focusAuthField('email')
          return
        }
        if (registering && response.status === 400 && /password/i.test(message)) {
          setAuthFieldErrors((current) => ({ ...current, password: message }))
          focusAuthField('password')
          return
        }
        if (!registering && !verifying && response.status === 401) throw new Error('Email or password is incorrect.')
        throw new Error(result?.error_id ? `${message} Reference: ${result.error_id}` : message)
      }
      if (!result || typeof result !== 'object') {
        throw new Error(`The server returned an unreadable response (HTTP ${response.status}). Check the API log.`)
      }
      if (registering && !result.verification_required) {
        setAuthMode('login'); setAuthPassword(''); setAuthMessage('This API has not enabled email verification yet. No code was sent. Restart the API after configuring the email sandbox.')
        return
      }
      if (result.verification_required) {
        const email = result.email || authEmail
        setPendingEmail(email); setAuthEmail(email); setAuthMode('verify'); setAuthPassword(''); setVerificationCode('')
        setAuthMessage(result.message || 'Enter the verification code sent to your email.')
        return
      }
      if (verifying) {
        setAuthMode('login'); setAuthPassword(''); setVerificationCode(''); setAuthMessage(result.message || 'Email verified. You can now sign in.')
        return
      }
      const nextCsrf = await fetch('/api/csrf', { credentials: 'include' }).then((res) => res.json())
      setCsrfToken(nextCsrf.csrf_token || '')
      setAuthUser(result.user); setAuthView('app'); setAuthPassword('')
    } catch (error) {
      setAuthError(error instanceof TypeError ? 'Can’t reach the server. Check that the API is running.' : error.message)
    } finally { setAuthBusy(false) }
  }

  async function resendVerification() {
    if (resendBusy) return
    setAuthError(''); setAuthMessage(''); setResendBusy(true)
    try {
      let token = csrfToken
      const csrfResponse = await fetch('/api/csrf', { credentials: 'include' })
      const csrfData = await csrfResponse.json().catch(() => ({}))
      if (csrfResponse.ok && csrfData.csrf_token) token = csrfData.csrf_token
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
        body: JSON.stringify({ email: pendingEmail || authEmail }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not resend the verification code.')
      setAuthMessage(result.message || 'If this account needs verification, a code will be sent to its email address.')
    } catch (error) {
      setAuthError(error instanceof TypeError ? 'Can’t reach the server. Check that the API is running.' : error.message)
    } finally { setResendBusy(false) }
  }

  function requestSignOut() {
    setShowSignOutConfirm(true)
  }

  async function confirmSignOut() {
    if (signOutBusy) return
    setSignOutBusy(true)
    try {
      const csrfResponse = await fetch('/api/csrf', { credentials: 'include' })
      const token = (await csrfResponse.json()).csrf_token
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers: { 'X-CSRFToken': token } })
    } finally {
      setAuthUser(null); setAuthMode('login'); setAuthView('login'); setAuthMessage(''); setAuthError('')
      setShowSignOutConfirm(false)
      setSignOutBusy(false)
    }
  }

  function showSettingsToast(message = 'Not available yet') {
    setSavedMessage(message)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 3000)
  }

  function exportAccountData() {
    const payload = { exported_at: new Date().toISOString(), profile: authUser, payment_methods: savedPaymentMethods, transactions, budgets, automatic_schedules: incomeSchedules, categories }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'resibo-account-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function discardProfileChanges() {
    const parts = (authUser?.name || '').trim().split(/\s+/).filter(Boolean)
    setProfileFirstName(authUser?.first_name || parts[0] || '')
    setProfileMiddleName(authUser?.middle_name || (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''))
    setProfileLastName(authUser?.last_name || parts.slice(1).at(-1) || '')
    setProfileTimeZone(authUser?.time_zone || detectTimeZone())
    setProfileError('')
  }

  function openDashboardPaymentMethods() {
    setActivePaymentGroup('ewallet')
    setActive('Dashboard')
    window.setTimeout(() => document.getElementById('payment-methods-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  async function toggleIncomeSchedule(schedule) {
    if (!schedule.id || schedule.busy) return
    const enabled = !schedule.enabled
    setIncomeSchedules((items) => items.map((item) => item.clientKey === schedule.clientKey ? { ...item, busy: true } : item))
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const response = await fetch(`/api/income-schedules/${schedule.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfData.csrf_token }, body: JSON.stringify({ name: schedule.name, transaction_type: schedule.transactionType, frequency: schedule.frequency, monthly_day: Number(schedule.monthlyDay), enabled, amount_minor: Math.round(Number(schedule.amount) * 100), first_payday_day: Number(schedule.firstPaydayDay), second_payday_day: Number(schedule.secondPaydayDay), category_id: Number(schedule.categoryId), payment_method_id: schedule.paymentMethodId ? Number(schedule.paymentMethodId) : null }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not update this schedule.')
      setIncomeSchedules((items) => items.map((item) => item.clientKey === schedule.clientKey ? { ...item, ...result.schedule, enabled, busy: false } : item))
      if (enabled) {
        const processed = await fetch('/api/income-schedules/process', { method: 'POST', credentials: 'include', headers: { 'X-CSRFToken': csrfData.csrf_token } })
        if (processed.ok) {
          if ((await processed.json()).created_count > 0) setSalaryRefreshKey((value) => value + 1)
          const schedulesResponse = await fetch('/api/income-schedules', { credentials: 'include' })
          const schedulesResult = await schedulesResponse.json().catch(() => ({}))
          if (schedulesResponse.ok) {
            const nextRuns = new Map((schedulesResult.schedules || []).map((item) => [String(item.id), item.next_run || '']))
            setIncomeSchedules((items) => items.map((item) => ({ ...item, nextRun: nextRuns.get(String(item.id)) ?? item.nextRun ?? '' })))
          }
        }
      }
    } catch (error) {
      setIncomeSchedules((items) => items.map((item) => item.clientKey === schedule.clientKey ? { ...item, busy: false, error: error instanceof TypeError ? 'Can’t reach the server.' : error.message } : item))
      showSettingsToast(error instanceof TypeError ? 'Can’t reach the server.' : error.message || 'Could not update this schedule.')
    }
  }

  async function saveProfile(event) {
    event.preventDefault()
    if (!profileIsDirty) return
    setProfileError('')
    setProfileSaved(false)
    setProfileBusy(true)
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const response = await fetch('/api/profile', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfData.csrf_token }, body: JSON.stringify({ first_name: profileFirstName, middle_name: profileMiddleName, last_name: profileLastName, time_zone: profileTimeZone }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not save your profile.')
      setAuthUser(result.user)
      setProfileSaved(true)
    } catch (error) {
      setProfileError(error instanceof TypeError ? 'Can’t reach the server. Try again.' : error.message)
    } finally {
      setProfileBusy(false)
    }
  }

  function addIncomeSchedule() {
    const incomeCategories = categories.filter((entry) => entry.type === 'income')
    const defaultCategory = incomeCategories.find((entry) => entry.name.trim().toLowerCase() === 'salary') || incomeCategories[0]
    const clientKey = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setIncomeSchedules((schedules) => [...schedules, {
      clientKey, name: 'Income source', transactionType: 'income', frequency: 'twice_monthly', monthlyDay: '1', enabled: false, amount: '', firstPaydayDay: '15', secondPaydayDay: '31',
      categoryId: defaultCategory ? String(defaultCategory.id) : '', paymentMethodId: '', busy: false, error: '', saved: false,
    }])
    setIncomeScheduleModalKey(clientKey)
    setIncomeSchedulesError('')
  }

  function openIncomeScheduleMenu(event, schedule) {
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    const menuWidth = 190
    const menuHeight = 82
    const x = event.type === 'contextmenu' ? event.clientX : bounds.right - menuWidth
    const y = event.type === 'contextmenu' ? event.clientY : bounds.bottom + 4
    setIncomeScheduleContextMenu({ schedule, x: Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8)), y: Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8)) })
  }

  function editIncomeSchedule(clientKey) {
    setIncomeScheduleContextMenu(null)
    setIncomeScheduleModalKey(clientKey)
  }

  function updateIncomeSchedule(clientKey, field, value) {
    setIncomeSchedules((schedules) => schedules.map((schedule) => schedule.clientKey === clientKey ? { ...schedule, [field]: value, saved: false, error: field === 'error' ? value : '' } : schedule))
  }

  function changeIncomeScheduleType(clientKey, transactionType) {
    const matchingCategories = categories.filter((entry) => entry.type === transactionType)
    const defaultCategory = matchingCategories.find((entry) => entry.name.trim().toLowerCase() === (transactionType === 'income' ? 'salary' : 'rent')) || matchingCategories[0]
    setIncomeSchedules((schedules) => schedules.map((schedule) => {
      if (schedule.clientKey !== clientKey) return schedule
      const selectedMethod = savedPaymentMethods.find((method) => String(method.userMethodId) === String(schedule.paymentMethodId))
      return { ...schedule, transactionType, name: ['Income source', 'Expense'].includes(schedule.name) ? (transactionType === 'expense' ? 'Expense' : 'Income source') : schedule.name, categoryId: defaultCategory ? String(defaultCategory.id) : '', paymentMethodId: transactionType === 'income' && selectedMethod?.groupId === 'credit' ? '' : schedule.paymentMethodId, saved: false, error: '' }
    }))
  }

  async function saveIncomeSchedule(clientKey, event) {
    event.preventDefault()
    const schedule = incomeSchedules.find((entry) => entry.clientKey === clientKey)
    if (!schedule) return
    const amountMinor = Math.round(Number(schedule.amount) * 100)
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      updateIncomeSchedule(clientKey, 'error', 'Enter an amount greater than ₱0.00 for each occurrence.')
      return
    }
    if (!schedule.name.trim()) {
      updateIncomeSchedule(clientKey, 'error', `Give this ${schedule.transactionType} schedule a name.`)
      return
    }
    if (!schedule.categoryId) {
      updateIncomeSchedule(clientKey, 'error', `Add an ${schedule.transactionType} category before creating this automatic schedule.`)
      return
    }
    setIncomeSchedules((schedules) => schedules.map((entry) => entry.clientKey === clientKey ? { ...entry, busy: true, error: '', saved: false } : entry))
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const response = await fetch(schedule.id ? `/api/income-schedules/${schedule.id}` : '/api/income-schedules', {
        method: schedule.id ? 'PUT' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfData.csrf_token },
        body: JSON.stringify({ name: schedule.name.trim(), transaction_type: schedule.transactionType, frequency: schedule.frequency, monthly_day: Number(schedule.monthlyDay), enabled: schedule.enabled, amount_minor: amountMinor, first_payday_day: Number(schedule.firstPaydayDay), second_payday_day: Number(schedule.secondPaydayDay), category_id: Number(schedule.categoryId), payment_method_id: schedule.paymentMethodId ? Number(schedule.paymentMethodId) : null }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not save this automatic schedule. Check the API and database connection.')
      const savedSchedule = result.schedule
      setIncomeSchedules((schedules) => schedules.map((entry) => entry.clientKey === clientKey ? {
        ...entry, ...savedSchedule, clientKey: `saved-${savedSchedule.id}`, name: savedSchedule.name,
        amount: (savedSchedule.amount_minor / 100).toFixed(2), firstPaydayDay: String(savedSchedule.first_payday_day),
        secondPaydayDay: String(savedSchedule.second_payday_day), categoryId: String(savedSchedule.category_id),
        paymentMethodId: savedSchedule.payment_method_id ? String(savedSchedule.payment_method_id) : '', busy: false, error: '', saved: true,
      } : entry))
      setIncomeScheduleModalKey((currentKey) => currentKey === clientKey ? `saved-${savedSchedule.id}` : currentKey)
      if (schedule.enabled) {
        const processResponse = await fetch('/api/income-schedules/process', { method: 'POST', credentials: 'include', headers: { 'X-CSRFToken': csrfData.csrf_token } })
        if (!processResponse.ok) throw new Error('Schedule saved, but due transactions could not be recorded yet.')
        const processResult = await processResponse.json()
        if (processResult.created_count > 0) setSalaryRefreshKey((value) => value + 1)
      }
    } catch (error) {
      setIncomeSchedules((schedules) => schedules.map((entry) => entry.clientKey === clientKey ? { ...entry, busy: false, error: error instanceof TypeError ? 'Can’t reach the server. Make sure the local API is running.' : error.message } : entry))
    } finally {
      setIncomeSchedules((schedules) => schedules.map((entry) => entry.clientKey === clientKey ? { ...entry, busy: false } : entry))
    }
  }

  async function removeIncomeSchedule(clientKey) {
    const schedule = incomeSchedules.find((entry) => entry.clientKey === clientKey)
    if (!schedule) return
    if (!schedule.id) {
      setIncomeSchedules((schedules) => schedules.filter((entry) => entry.clientKey !== clientKey))
      setIncomeScheduleModalKey((currentKey) => currentKey === clientKey ? '' : currentKey)
      setIncomeScheduleContextMenu(null)
      return
    }
    setIncomeScheduleContextMenu(null)
    setIncomeScheduleDeleteError('')
    setIncomeScheduleToDelete({ clientKey: schedule.clientKey, name: schedule.name, transactionType: schedule.transactionType })
  }

  async function confirmRemoveIncomeSchedule() {
    const schedule = incomeSchedules.find((entry) => entry.clientKey === incomeScheduleToDelete?.clientKey)
    if (!schedule?.id) return
    setIncomeScheduleDeleteBusy(true)
    setIncomeScheduleDeleteError('')
    setIncomeSchedules((schedules) => schedules.map((entry) => entry.clientKey === schedule.clientKey ? { ...entry, busy: true, error: '' } : entry))
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const response = await fetch(`/api/income-schedules/${schedule.id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRFToken': csrfData.csrf_token } })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not remove this income schedule.')
      setIncomeSchedules((schedules) => schedules.filter((entry) => entry.clientKey !== schedule.clientKey))
      setIncomeScheduleModalKey((currentKey) => currentKey === schedule.clientKey ? '' : currentKey)
      setIncomeScheduleToDelete(null)
    } catch (error) {
      setIncomeScheduleDeleteError(error instanceof TypeError ? 'Can’t reach the server. Make sure the local API is running.' : error.message)
    } finally {
      setIncomeSchedules((schedules) => schedules.map((entry) => entry.clientKey === schedule.clientKey ? { ...entry, busy: false } : entry))
      setIncomeScheduleDeleteBusy(false)
    }
  }

  const editingIncomeSchedule = incomeSchedules.find((schedule) => schedule.clientKey === incomeScheduleModalKey)

  function chooseAvatarPalette(paletteId) {
    setAvatarPaletteId(paletteId)
    try { window.localStorage.setItem('resibo-avatar-palette', paletteId) } catch { /* Keep the selection for this session. */ }
  }

  function dismissGettingStarted() {
    setShowGettingStarted(false)
    if (setupAccountId) {
      try { window.localStorage.setItem(`resibo-setup-dismissed-${setupAccountId}`, 'true') } catch { /* Keep the dismissal for this session. */ }
    }
  }

  function skipPaymentSetup() {
    setPaymentSetupSkipped(true)
    if (setupAccountId) {
      try { window.localStorage.setItem(`resibo-setup-payment-skipped-${setupAccountId}`, 'true') } catch { /* Keep the skip for this session. */ }
    }
  }

  function dismissHelpTip(tipId) {
    const nextTips = { ...dismissedHelpTips, [tipId]: true }
    setDismissedHelpTips(nextTips)
    if (setupAccountId) {
      try { window.localStorage.setItem(`resibo-help-tips-${setupAccountId}`, JSON.stringify(nextTips)) } catch { /* Keep the dismissal for this session. */ }
    }
  }

  function closeTutorial() {
    setShowTutorial(false)
    if (authUser) {
      try { window.localStorage.setItem(`resibo-tutorial-completed-${authUser.id || authUser.email}`, 'true') } catch { /* Keep the tutorial dismissal for this session. */ }
    }
  }

  function replayTutorial() {
    setActive('Dashboard')
    setTutorialStep(0)
    setShowTutorial(true)
  }

  function markNotificationsRead(ids = notifications.map((notification) => notification.id)) {
    const nextIds = [...new Set([...readNotificationIds, ...ids])]
    setReadNotificationIds(nextIds)
    if (authUser) {
      try { window.localStorage.setItem(`resibo-notifications-read-${authUser.id || authUser.email}`, JSON.stringify(nextIds)) } catch { /* Notifications remain read for this session. */ }
    }
  }

  function openBudgetNotification(notification) {
    markNotificationsRead([notification.id])
    setNotificationsOpen(false)
    setActive('Budgets')
  }

  async function uploadAvatar(event) {
    const image = event.target.files?.[0]
    event.target.value = ''
    if (!image) return
    setAvatarError('')
    setAvatarBusy(true)
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const formData = new FormData()
      formData.append('image', image)
      const response = await fetch('/api/profile/avatar', { method: 'PUT', credentials: 'include', headers: { 'X-CSRFToken': csrfData.csrf_token }, body: formData })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not upload this image.')
      setAuthUser(result.user)
    } catch (error) {
      setAvatarError(error instanceof TypeError ? 'Can’t reach the server. Try again.' : error.message)
    } finally {
      setAvatarBusy(false)
    }
  }

  async function removeAvatar() {
    setAvatarError('')
    setAvatarBusy(true)
    try {
      const csrfData = await fetch('/api/csrf', { credentials: 'include' }).then((response) => response.json())
      const response = await fetch('/api/profile/avatar', { method: 'DELETE', credentials: 'include', headers: { 'X-CSRFToken': csrfData.csrf_token } })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not remove this image.')
      setAuthUser(result.user)
    } catch (error) {
      setAvatarError(error instanceof TypeError ? 'Can’t reach the server. Try again.' : error.message)
    } finally {
      setAvatarBusy(false)
    }
  }

  if (authView === 'checking') return <main className="auth-loading"><span className="brand-mark"><img src={resiboLogo} alt="Resibo logo" /></span><p>Checking your account…</p></main>
  if (authView !== 'app') {
    const registering = authMode === 'register'
    const verifying = authMode === 'verify'
    const changeAuthMode = (mode) => {
      if (mode === 'register') {
        setAuthEmail('')
        setAuthPassword('')
        setAuthConfirmPassword('')
      }
      setAuthMode(mode); setAuthError(''); setAuthMessage(''); setAuthFieldErrors({}); setAuthSubmitAttempted(false); setEmailAlreadyRegistered(false); setForgotPasswordNotice(false)
    }
    const handleAuthErrorDismiss = () => setAuthError('')
    const goToSignIn = () => changeAuthMode('login')
    const emailError = authFieldErrors.email || ''
    return <AuthLayout
      theme={theme}
      onToggleTheme={() => setThemePreference(() => theme === 'dark' ? 'light' : 'dark')}
      showDeveloperCredit={showDeveloperCredit}
      onShowDeveloperCredit={() => setShowDeveloperCredit(true)}
    >
      <span className="eyebrow">{verifying ? 'CHECK YOUR INBOX' : authMode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</span>
      <h2>{verifying ? 'Verify your email' : authMode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>
      <p className="auth-lede">{verifying ? <>Enter the 8-digit code sent to <strong>{pendingEmail || authEmail}</strong>.</> : authMode === 'login' ? 'Pick up where you left off with your budget.' : 'Set up your private space for everyday money.'}</p>
      {authMessage && <div className="auth-alert success" role="status">{authMessage}</div>}
      <form className="auth-form" noValidate autoComplete={registering ? 'off' : 'on'} onSubmit={submitAuth}>
        {registering && <>
          <div className="auth-name-row">
            <label className="auth-field" htmlFor="auth-first-name">
              <span className="auth-field-label-row"><span>First name</span></span>
              <input ref={firstNameInputRef} id="auth-first-name" autoFocus autoComplete="given-name" maxLength={100} disabled={authBusy} value={authFirstName} onChange={(event) => updateAuthField('firstName', setAuthFirstName, event.target.value)} aria-invalid={Boolean(authFieldErrors.firstName)} aria-describedby={authFieldErrors.firstName ? 'auth-first-name-error' : undefined} />
              {authFieldErrors.firstName && <small id="auth-first-name-error" className="auth-field-error">{authFieldErrors.firstName}</small>}
            </label>
            <label className="auth-field" htmlFor="auth-last-name">
              <span className="auth-field-label-row"><span>Last name</span></span>
              <input ref={lastNameInputRef} id="auth-last-name" autoComplete="family-name" maxLength={100} disabled={authBusy} value={authLastName} onChange={(event) => updateAuthField('lastName', setAuthLastName, event.target.value)} aria-invalid={Boolean(authFieldErrors.lastName)} aria-describedby={authFieldErrors.lastName ? 'auth-last-name-error' : undefined} />
              {authFieldErrors.lastName && <small id="auth-last-name-error" className="auth-field-error">{authFieldErrors.lastName}</small>}
            </label>
          </div>
          {(showMiddleName || Boolean(authMiddleName.trim())) ? <div className="auth-field">
            <div className="auth-field-label-row"><label htmlFor="auth-middle-name">Middle name <span className="field-optional">(optional)</span></label><button type="button" className="auth-text-button" disabled={authBusy} onClick={() => { setAuthMiddleName(''); setShowMiddleName(false) }}>Remove</button></div>
            <input id="auth-middle-name" autoComplete="additional-name" maxLength={100} disabled={authBusy} value={authMiddleName} onChange={(event) => setAuthMiddleName(event.target.value)} />
          </div> : <button type="button" className="auth-add-middle" disabled={authBusy} onClick={() => setShowMiddleName(true)}>Add middle name</button>}
        </>}
        {verifying ? <label className="auth-field" htmlFor="auth-verification-code">
          <span className="auth-field-label-row"><span>Verification code</span></span>
          <input id="auth-verification-code" autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} pattern="[0-9]{8}" placeholder="8-digit code" disabled={authBusy} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 8))} />
        </label> : <>
          <div className="auth-field">
            <div className="auth-field-label-row"><label htmlFor="auth-email">Email address</label></div>
            <input ref={emailInputRef} id="auth-email" autoFocus={!registering} type="email" autoComplete={authMode === 'login' ? 'username' : 'off'} maxLength={254} disabled={authBusy} value={authEmail} onChange={(event) => updateAuthField('email', setAuthEmail, event.target.value)} aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'auth-email-error' : undefined} />
            {emailError && <small id="auth-email-error" className="auth-field-error">{emailError}{emailAlreadyRegistered && <> <button type="button" className="auth-inline-link" disabled={authBusy} onClick={goToSignIn}>Sign in instead</button></>}</small>}
          </div>
          <PasswordField
            id="auth-password"
            inputRef={passwordInputRef}
            label="Password"
            labelAccessory={authMode === 'login' && <button type="button" className="auth-text-button forgot-password" disabled={authBusy} onClick={() => {
              // TODO: Replace this notice with the password reset flow when its API is available.
              setForgotPasswordNotice(true)
            }}>Forgot password?</button>}
            value={authPassword}
            onChange={(event) => updateAuthField('password', setAuthPassword, event.target.value)}
            disabled={authBusy}
            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((show) => !show)}
            error={authFieldErrors.password || ''}
            requirement={registering}
            requirementMet={authPassword.length >= 12 && authPassword.length <= 128}
          />
          {registering && <PasswordField
            id="auth-confirm-password"
            inputRef={confirmPasswordInputRef}
            label="Confirm password"
            value={authConfirmPassword}
            onChange={(event) => updateAuthField('confirmPassword', setAuthConfirmPassword, event.target.value)}
            disabled={authBusy}
            autoComplete="new-password"
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((show) => !show)}
            error={authFieldErrors.confirmPassword || ''}
            feedback={authConfirmPassword ? (passwordsMatch(authPassword, authConfirmPassword) ? { kind: 'match', text: 'Passwords match' } : { kind: 'mismatch', text: "Passwords don't match" }) : null}
          />}
        </>}
        {authMode === 'login' && <label className="remember-row"><input type="checkbox" checked={rememberMe} disabled={authBusy} onChange={(event) => setRememberMe(event.target.checked)} /> Keep me signed in</label>}
        {forgotPasswordNotice && authMode === 'login' && <div className="auth-inline-notice" role="status"><span>Password reset isn’t available yet.</span><button type="button" aria-label="Dismiss password reset message" onClick={() => setForgotPasswordNotice(false)}>×</button></div>}
        {authError && <div className="auth-alert error auth-form-error" role="alert"><span>{authError}</span><button type="button" aria-label="Dismiss error" onClick={handleAuthErrorDismiss}>×</button></div>}
        <button className="auth-submit" type="submit" disabled={authBusy}>
          {authBusy && <span className="auth-spinner" aria-hidden="true" />}
          {authBusy ? registering ? 'Creating account…' : authMode === 'login' ? 'Signing in…' : 'Please wait…' : verifying ? 'Verify email' : authMode === 'login' ? 'Sign in' : 'Create account'}
          {!authBusy && <span aria-hidden="true">→</span>}
        </button>
      </form>
      {verifying ? <div className="auth-verification-actions"><button type="button" className="auth-resend-button" onClick={resendVerification} disabled={resendBusy}>{resendBusy ? 'Sending…' : 'Resend code'}</button><div className="auth-switch">Using a different email? <button type="button" onClick={goToSignIn}>Sign in</button></div></div> : <div className="auth-switch">{authMode === 'login' ? <>New to Resibo? <button type="button" onClick={() => changeAuthMode('register')}>Create an account</button></> : <>Already have an account? <button type="button" onClick={goToSignIn}>Sign in</button></>}</div>}
      <AuthSecureFooter />
      <div className="auth-legal">{registering ? <>By creating an account you agree to the {/* TODO: Replace # with the Terms page route. */}<a href="#" title="TODO: Add the Terms page">Terms</a> and {/* TODO: Replace # with the Privacy Policy page route. */}<a href="#" title="TODO: Add the Privacy Policy page">Privacy Policy</a>.</> : 'By continuing, you agree to use this app for your personal budgeting.'}</div>
    </AuthLayout>
  }

  return <div className="app-shell">
    {paymentCardContextMenu && <div ref={paymentCardContextMenuRef} className="transaction-context-menu" role="menu" aria-label="Payment card actions" style={{ left: paymentCardContextMenu.x, top: paymentCardContextMenu.y }}><button type="button" role="menuitem" onClick={() => { const card = paymentCardContextMenu.card; setPaymentCardContextMenu(null); configurePaymentMethod(card) }}><Pencil size={15}/> Edit card</button><button type="button" role="menuitem" className="transaction-context-delete" onClick={() => { const card = paymentCardContextMenu.card; setPaymentCardContextMenu(null); setMethodRemoveError(''); setConfirmRemoveMethod(card) }}><Trash2 size={15}/> Delete card</button></div>}
    <aside className="sidebar">
      <a className="brand" href="#home" aria-label="Resibo home"><span className="brand-mark"><img src={resiboLogo} alt="" /></span><span>Resibo</span></a>
      <div className="workspace-label">YOUR SPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">
        {nav.map(({ label, icon: Icon }) => <button key={label} className={`nav-link ${active === label ? 'active' : ''}`} onClick={() => setActive(label)}><Icon size={18} strokeWidth={1.9} /><span>{label}</span>{label === 'Transactions' && accountTransactionCount > 0 && <span className="nav-count">{accountTransactionCount}</span>}</button>)}
      </nav>
      <div className="sidebar-divider" />
      <div className="workspace-label">YOUR CATEGORIES</div>
      <div className="category-list">{categories.filter((category) => category.type === 'expense').slice(0, 4).map((category, index) => <span key={category.id}><i className={`dot ${['dot-coral','dot-blue','dot-purple','dot-yellow'][index]}`} />{category.name}</span>)}<button className="category-add" onClick={() => setActive('Budgets')}><Plus size={15} />Add category</button></div>
      <div className="sidebar-bottom"><button className={`nav-link setting-link ${active === 'Profile' ? 'active' : ''}`} onClick={() => setActive('Profile')}><Settings2 size={18} /><span>Profile &amp; settings</span></button><div className="profile"><button type="button" className="avatar profile-avatar-button" style={{ backgroundColor: selectedAvatarPalette.background, color: selectedAvatarPalette.foreground, '--avatar-accent': selectedAvatarPalette.background }} aria-label="Open your profile" onClick={() => setActive('Profile')}>{profileImageUrl ? <img className="avatar-image" src={profileImageUrl} alt="" /> : profileInitials}</button><button type="button" className="profile-copy profile-open-button" onClick={() => setActive('Profile')}><strong>{authUser?.name}</strong><span>{authUser?.email}</span></button></div><button type="button" className="sidebar-signout" onClick={requestSignOut}><LogOut size={15}/><span>Sign out</span></button></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>My workspace</span><span className="crumb-slash">/</span><strong>{active === 'Profile' ? 'Profile & settings' : active}</strong></div><div className="top-actions"><div className="notification-wrap" ref={notificationPanelRef}><button type="button" className="icon-button notification" aria-label={unreadNotifications.length ? `Notifications, ${unreadNotifications.length} unread` : 'Notifications'} aria-expanded={notificationsOpen} aria-haspopup="dialog" onClick={() => setNotificationsOpen((open) => !open)}><Bell size={18}/>{unreadNotifications.length > 0 && <span className="notification-count">{unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}</span>}</button>{notificationsOpen && <section className="notification-popover" role="dialog" aria-label="Notifications"><div className="notification-popover-heading"><div><strong>Notifications</strong><small>{unreadNotifications.length ? `${unreadNotifications.length} unread` : 'You’re all caught up'}</small></div><button type="button" className="notification-mark-read" onClick={() => markNotificationsRead()} disabled={!unreadNotifications.length}>Mark all read</button></div>{notifications.length ? <div className="notification-list">{notifications.map((notification) => { const unread = !readNotificationIds.includes(notification.id); return <button type="button" className={`notification-item ${unread ? 'unread' : ''}`} key={notification.id} onClick={() => openBudgetNotification(notification)}><span className={`notification-item-icon ${notification.overLimit ? 'over-limit' : ''}`}><CircleAlert size={16}/></span><span className="notification-item-copy"><strong>{notification.title}</strong><small>{notification.message}</small></span>{unread && <i className="notification-unread-dot" aria-label="Unread"/>}</button> })}</div> : <div className="notification-empty"><span className="notification-empty-icon"><Bell size={17}/></span><strong>No budget alerts</strong><p>Alerts appear here when a category reaches 80% of its budget.</p></div>}</section>}</div><button type="button" className="top-avatar" style={{ backgroundColor: selectedAvatarPalette.background, color: selectedAvatarPalette.foreground, '--avatar-accent': selectedAvatarPalette.background }} aria-label="Open your profile" title="Profile & settings" onClick={() => setActive('Profile')}>{profileImageUrl ? <img className="avatar-image" src={profileImageUrl} alt="" /> : profileInitials}</button></div></header>

      {active === 'Dashboard' ? <div className="page-wrap">
        <div className="welcome-row"><div><div className="eyebrow">{welcomeDate}</div><h1>Welcome, {authUser?.name?.split(' ')[0] || 'there'} <span className="wave">✳</span></h1><p className="page-subtitle">Your account overview for {currentMonth}.</p></div><div className="page-actions">{cyclePicker}<button className="primary-button" onClick={startNewTransaction}><Plus size={18} strokeWidth={2.5} /> Add transaction</button></div></div>
        {showGettingStarted && dashboardData && setupCompletedCount < setupItems.length && <section className="getting-started panel" aria-labelledby="getting-started-title">
          <div className="getting-started-heading"><div><span className="eyebrow">GETTING STARTED</span><h2 id="getting-started-title">Set up your money space</h2></div><div className="getting-started-progress"><span>{setupCompletedCount} of {setupItems.length} done</span><button type="button" className="icon-button" aria-label="Hide getting started checklist" onClick={dismissGettingStarted}><X size={15}/></button></div></div>
          <div className="getting-started-track" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax={setupItems.length} aria-valuenow={setupCompletedCount}><span style={{ width: `${(setupCompletedCount / setupItems.length) * 100}%` }}/></div>
          <div className="getting-started-list">{setupItems.map((item, index) => <div className={`getting-started-item${item.done ? ' complete' : ''}`} key={item.id}>
            <button type="button" className="getting-started-action" onClick={item.action} disabled={item.done}><span className="getting-started-number">{item.done ? <Check size={14}/> : index + 1}</span><span className="getting-started-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><span className="getting-started-cta">{item.done ? 'Done' : item.actionLabel}</span></button>
            {item.optional && !item.done && <button type="button" className="getting-started-skip" onClick={skipPaymentSetup}>Skip</button>}
          </div>)}</div>
        </section>}

        <section className="summary-grid" aria-label="October summary">
          <article className="summary-card balance-card"><div className="card-top"><span className="metric-label">LEFT TO SPEND</span><span className="metric-icon mint-icon"><Wallet size={17} /></span></div><div className="metric-amount">{currency(availableBalanceMinor)}</div><div className="metric-foot"><span className="quiet-note">Available across debit, e-wallet &amp; cash</span></div></article>
          <article className="summary-card summary-card-interactive" role="button" tabIndex={0} aria-label={`Income this budget cycle, ${currency(incomeMinor)}. Open income sources and transactions.`} onClick={openIncomeDetailsModal} onKeyDown={(event) => handleSummaryCardKeyDown(event, openIncomeDetailsModal)}><div className="card-top"><span className="metric-label">INCOME</span><span className="metric-icon sky-icon"><ArrowDownLeft size={17} /></span></div><div className="metric-amount small">{currency(incomeMinor)}</div><div className="metric-foot"><span className="quiet-note">This budget cycle</span></div><div className="mini-bars income-bars" aria-hidden="true" /></article>
          <article className="summary-card summary-card-interactive" role="button" tabIndex={0} aria-label={`Spent this budget cycle, ${currency(expensesMinor)}. Open expenses in transactions.`} onClick={openTransactionsForSpending} onKeyDown={(event) => handleSummaryCardKeyDown(event, openTransactionsForSpending)}><div className="card-top"><span className="metric-label">SPENT</span><span className="metric-icon peach-icon"><ArrowUpRight size={17} /></span></div><div className="metric-amount small">{currency(expensesMinor)}</div><div className="metric-foot"><span className="quiet-note">This budget cycle</span></div><div className="spent-track"><span style={{ width: `${spendPercent}%` }} /></div><div className="track-caption"><span>{spendPercent.toFixed(2)}% of available funds</span><span>{currency(availableBalanceMinor)} left</span></div></article>
          <article className="summary-card debt-summary-card summary-card-interactive" role="button" tabIndex={0} aria-label={`Credit card debt, ${currency(creditDebtMinor)}. Open credit card debts.`} onClick={openCreditCardDebtModal} onKeyDown={(event) => handleSummaryCardKeyDown(event, openCreditCardDebtModal)}><div className="card-top"><span className="metric-label">CREDIT CARD DEBT</span><span className="metric-icon peach-icon"><CreditCard size={17} /></span></div><div className="metric-amount small">{currency(creditDebtMinor)}</div><div className="metric-foot"><span className="quiet-note">Across all credit cards</span></div></article>
        </section>

        <section id="payment-methods-panel" className="wallet-panel panel" aria-label="Payment methods">
          <div className="wallet-heading"><div><div className="eyebrow">HOW YOU PAY</div><h2>Payment methods</h2><p>Pick a type to browse Philippine wallet and card designs.</p></div><div className="method-menu-wrap" ref={methodMenuRef}>
            <button className="add-method-button" type="button" aria-haspopup="menu" aria-expanded={showMethodMenu} onClick={() => setShowMethodMenu((open) => !open)}><Plus size={15}/><span>Add a method</span><ChevronDown size={14}/></button>
            {showMethodMenu && <div className="method-action-menu" role="menu" aria-label="Payment method actions">
              <button type="button" role="menuitem" onClick={() => { setShowMethodMenu(false); openMethodPicker() }}><span className="method-menu-icon"><Plus size={15}/></span><span><strong>Add payment method</strong><small>Choose cash, a wallet, or a card</small></span></button>
              <button type="button" role="menuitem" disabled={!selectedPaymentGroup.cards[activePaymentCard]?.userMethodId} onClick={() => { const card = selectedPaymentGroup.cards[activePaymentCard]; setShowMethodMenu(false); if (card?.userMethodId) configurePaymentMethod(card) }}><span className="method-menu-icon"><Pencil size={14}/></span><span><strong>Edit selected method</strong><small>{selectedPaymentGroup.cards[activePaymentCard]?.name || `Choose a ${selectedPaymentGroup.title.toLowerCase()} first`}</small></span></button>
              <button type="button" role="menuitem" className="remove-menu-item" disabled={!selectedPaymentGroup.cards[activePaymentCard]?.userMethodId} onClick={() => { const card = selectedPaymentGroup.cards[activePaymentCard]; setShowMethodMenu(false); if (card?.userMethodId) { setMethodRemoveError(''); setConfirmRemoveMethod(card) } }}><span className="method-menu-icon remove-menu-icon"><Trash2 size={14}/></span><span><strong>Remove selected method</strong><small>{selectedPaymentGroup.cards[activePaymentCard]?.name || `Choose a ${selectedPaymentGroup.title.toLowerCase()} first`}</small></span></button>
            </div>}
          </div></div>
          <div className="payment-tabs" role="tablist" aria-label="Payment method type">{paymentGroupsState.map(({ id, title, icon: Icon, cards }) => <button role="tab" aria-selected={activePaymentGroup === id} className={activePaymentGroup === id ? 'selected' : ''} key={id} onClick={() => { setActivePaymentGroup(id); setActivePaymentCard(0) }}><Icon size={16}/><span>{title}</span><small>{cards.length}</small></button>)}</div>
          <div className="wallet-browser" key={selectedPaymentGroup.id} onContextMenu={handlePaymentCardContextMenu}>
            {selectedPaymentGroup.cards.length ? <>
              <div className="wallet-intro"><div className="eyebrow">{selectedPaymentGroup.title.toUpperCase()}</div><h3>{selectedPaymentGroup.cards[activePaymentCard]?.name}</h3><p>{activePaymentGroup === 'debit' ? 'Available balance from your saved activity.' : activePaymentGroup === 'ewallet' ? 'Current wallet balance from saved income and spending.' : activePaymentGroup === 'credit' ? 'Available credit and outstanding debt.' : 'Cash balance from saved income and spending.'}</p><div className="wallet-controls"><button type="button" aria-label="Previous payment method" disabled={selectedPaymentGroup.cards.length < 2} onClick={() => movePaymentCard(-1)}>‹</button><span>{String(activePaymentCard + 1).padStart(2, '0')} <i>/</i> {String(selectedPaymentGroup.cards.length).padStart(2, '0')}</span><button type="button" aria-label="Next payment method" disabled={selectedPaymentGroup.cards.length < 2} onClick={() => movePaymentCard(1)}>›</button></div></div>
              <div className="wallet-deck" aria-live="polite">{selectedPaymentGroup.cards.map((card, index) => {
                const depth = (index - activePaymentCard + selectedPaymentGroup.cards.length) % selectedPaymentGroup.cards.length
                const isCash = card.groupId === 'cash'
                const isCashBalanceHidden = revealedPaymentCardId === card.userMethodId
                const isCardNumberVisible = revealedPaymentCardId === card.userMethodId && Boolean(card.lastFour)
                const expiryLabel = card.expiryMonth && card.expiryYear ? `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}` : 'MM/YY'
                const isExpired = card.expiryYear && card.expiryMonth && (card.expiryYear < new Date().getFullYear() || (card.expiryYear === new Date().getFullYear() && card.expiryMonth < new Date().getMonth() + 1))
                const finish = cardFinish(card)
                return <div role="group" tabIndex={depth === 0 ? 0 : -1} className={`payment-card ${card.theme} ${card.groupId === 'credit' ? 'payment-card-credit' : ''} pattern-${finish === 'premium' ? 'grid' : card.patternKey || 'gradient'} finish-${finish} depth-${depth}`} style={cardVisualStyle(card)} key={card.userMethodId} aria-label={`${card.name}: ${card.amountLabel.toLowerCase()} ${card.amount}${card.subAmount ? `, debt ${card.subAmount}` : ''}`} aria-current={depth === 0 ? 'true' : undefined} onKeyDown={(event) => { if (event.currentTarget !== event.target || !['Enter', ' '].includes(event.key)) return; event.preventDefault(); depth === 0 ? movePaymentCard(1) : setActivePaymentCard(index) }} onPointerMove={(event) => { if (event.pointerType === 'touch') return; const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width; const y = (event.clientY - rect.top) / rect.height; event.currentTarget.style.setProperty('--glare-x', `${x * 100}%`); event.currentTarget.style.setProperty('--glare-y', `${y * 100}%`); event.currentTarget.style.setProperty('--glare-strength', '.95') }} onPointerLeave={(event) => { ['--glare-x', '--glare-y', '--glare-strength'].forEach((property) => event.currentTarget.style.removeProperty(property)) }} onClick={() => depth === 0 ? movePaymentCard(1) : setActivePaymentCard(index)}>
                  <span className="card-pattern" aria-hidden="true"/>{isCash && <><span className="cash-card-frame" aria-hidden="true"/><span className="cash-card-seal" aria-hidden="true">₱</span></>}<div className="payment-card-top"><span className="payment-mark">{cardBrandMark(card.symbol)}</span><span className="payment-card-heading"><strong>{card.name}</strong><small>{card.kind}{!isCash && finish !== 'standard' ? ` · ${finish}` : ''}</small></span><svg className="card-contactless" viewBox="0 0 22 26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M3 5c4 5 4 11 0 16"/><path d="M8.5 3c5.5 6.5 5.5 13.5 0 20"/><path d="M14 1c7 8 7 16 0 24"/></svg></div>{!isCash && <span className="payment-card-chip" aria-hidden="true"/>}
                  {isCash ? <><div className="cash-card-balance"><span>AVAILABLE CASH</span><strong>{isCashBalanceHidden ? '••••••' : card.amount}</strong></div><button type="button" className="payment-card-visibility cash-visibility" aria-label={isCashBalanceHidden ? 'Show cash balance' : 'Hide cash balance'} title={isCashBalanceHidden ? 'Show cash balance' : 'Hide cash balance'} onClick={(event) => { event.stopPropagation(); setRevealedPaymentCardId(isCashBalanceHidden ? null : card.userMethodId) }}>{isCashBalanceHidden ? <Eye size={15}/> : <EyeOff size={15}/>}</button></> : <><div className="payment-card-number" aria-label={card.lastFour ? `Card number ending in ${card.lastFour}` : 'Last four card digits not added'}>{isCardNumberVisible ? `••••  ••••  ••••  ${card.lastFour}` : '••••  ••••  ••••  ••••'}</div><div className="payment-card-value"><span>{card.amountLabel}</span><strong>{card.amount}</strong>{card.subAmount && <small>Debt {card.subAmount}</small>}</div>{card.lastFour && <button type="button" className="payment-card-visibility" aria-label={isCardNumberVisible ? 'Hide last four card digits' : 'Show last four card digits'} title={isCardNumberVisible ? 'Hide last four card digits' : 'Show last four card digits'} aria-pressed={isCardNumberVisible} onClick={(event) => { event.stopPropagation(); setRevealedPaymentCardId(isCardNumberVisible ? null : card.userMethodId) }}>{isCardNumberVisible ? <EyeOff size={15}/> : <Eye size={15}/>}</button>}</>}
                  {!isCash && card.groupId === 'credit' && finish !== 'standard' && <span className="payment-card-holo" aria-hidden="true"/>}
                  <div className={`payment-card-bottom ${isCash ? 'cash-bottom' : ''}`}>{isCash ? <div className="payment-card-owner"><span className="payment-card-name">{card.name}</span><span className="payment-card-network">Cash balance</span></div> : <><div className="payment-card-holder"><span>CARD HOLDER</span><strong>{card.cardholderName || 'YOUR NAME'}</strong></div><div className={`payment-card-expiry ${isExpired ? 'expired' : ''}`}><span>{isExpired ? 'EXPIRED' : 'VALID THRU'}</span>{editingExpiryCardId === card.userMethodId ? <><input autoFocus aria-label="Expiry date month and year" className="expiry-inline-input" inputMode="numeric" maxLength={5} placeholder="MM/YY" value={expiryDraft} onClick={(event) => event.stopPropagation()} onChange={(event) => { setCardExpiryError(''); setExpiryDraft(formatExpiryInput(event.target.value)) }} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); saveCardExpiry(card, expiryDraft) } else if (event.key === 'Escape') { setEditingExpiryCardId(null); setExpiryDraft(''); setCardExpiryError('') } }} onBlur={() => { if (expiryDraft) saveCardExpiry(card, expiryDraft) } }/><small className="card-expiry-error">{cardExpiryError}</small></> : <button type="button" className="expiry-inline-button" aria-label={`Edit expiry date, currently ${expiryLabel}`} onClick={(event) => { event.stopPropagation(); setCardExpiryError(''); setExpiryDraft(card.expiryMonth ? expiryLabel : ''); setEditingExpiryCardId(card.userMethodId) }}>{expiryLabel}</button>}</div><strong className={`payment-card-network-mark ${card.network?.toLowerCase().replace(/[^a-z]/g, '') || ''}`}>{cardNetworkLabel(card.network)}</strong></>}</div><span className="card-glow" aria-hidden="true"/>
                </div>
              })}</div>
              <PaymentInfoCard type={activePaymentGroup} item={selectedPaymentInfoItem}/>
            </> : <div className="wallet-empty"><span className="wallet-note-icon"><CreditCard size={17}/></span><div><strong>No {selectedPaymentGroup.title.toLowerCase()} added yet</strong><p>Your payment methods will appear here after you add one.</p><button className="text-button" type="button" onClick={() => { openMethodPicker() }}>Browse designs <span>↗</span></button></div></div>}
          </div>
        </section>

        <section className="content-grid">
          <SpendingOverview transactions={transactions} cycleStart={cycleStart} cycleEndExclusive={cycleEnd} grouping={chartGrouping} groupingControl={<MenuSelect className="chart-grouping-select" ariaLabel="Group spending chart" value={chartGrouping} onChange={setChartGrouping} options={[{ value: 'day', label: 'By day' }, { value: 'week', label: 'By week' }, { value: 'category', label: 'By category' }]}/>} />

          <article className="panel budgets-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR GUARDRAILS</div><h2>Budget progress</h2></div><button className="text-button" onClick={() => setActive('Budgets')}>See all <span>↗</span></button></div>{budgets.length ? <><div className="budget-list">{budgets.map((budget, index) => { const percent = budget.limit_minor > 0 ? Math.min(100, Math.round(budget.spent_minor / budget.limit_minor * 100)) : 0; const color = ['coral', 'blue', 'purple', 'yellow'][index % 4]; return <BudgetRow key={budget.id} color={color} icon={index % 2 ? <Wallet size={15}/> : <ShoppingBag size={15}/>} name={budget.category || 'Overall budget'} detail={`${currency(budget.spent_minor)} of ${currency(budget.limit_minor)}`} percent={percent} value={`${percent}%`} alert={percent >= 80}/> })}</div><button className="budget-manage" onClick={() => setActive('Budgets')}>Manage category limits <span>→</span></button></> : <div className="panel-empty"><p>No budgets set for this cycle yet.</p><button className="text-button" onClick={() => setActive('Budgets')}>Set a budget <span>↗</span></button></div>}</article>
        </section>

        <section className="panel transactions-panel"><div className="panel-heading transactions-heading"><div><div className="eyebrow">THE LATEST</div><h2>Recent transactions</h2></div><div className="transaction-tools"><label className="searchbox"><Search size={15}/><input aria-label="Search transactions" placeholder="Search transactions" value={search} onChange={(e) => setSearch(e.target.value)} /></label><button className={`filter-button ${showFilters ? 'active' : ''}`} aria-expanded={showFilters} aria-label="Filters" onClick={() => setShowFilters((shown) => !shown)}><SlidersHorizontal size={16}/><span>Filter</span></button><button className="text-button all-transactions" onClick={() => setActive('Transactions')}>View all <span>↗</span></button></div></div>{showFilters && <div className="filter-popover"><label>Type<MenuSelect value={filterType} onChange={(value) => { setFilterType(value); setFilterCategory('all') }} ariaLabel="Filter transactions by type" options={[{ value: 'all', label: 'All activity' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]}/></label><label>Category<MenuSelect value={filterCategory} onChange={setFilterCategory} ariaLabel="Filter transactions by category" options={transactionCategoryOptions}/></label><button type="button" className="text-button" onClick={() => { setFilterType('all'); setFilterCategory('all') }}>Clear filters</button></div>}<div className="table-head"><span>TRANSACTION</span><span>PAYMENT METHOD</span><span>DATE</span><span>AMOUNT</span></div><div className="transaction-list">{filtered.length ? filtered.slice(0, 4).map(renderTransactionRow) : <div className="transaction-empty">{search || filterCategory !== 'all' || filterType !== 'all' ? 'No transactions match these filters.' : 'No transactions yet. Add your first transaction to see it here.'}</div>}</div></section>
        <footer className="page-footer"><button type="button" className="auth-story-credit" aria-expanded={showDeveloperCredit} onClick={() => setShowDeveloperCredit(true)}>{showDeveloperCredit ? 'Developer: carinokarlos' : 'Made in the Philippines'}</button><button type="button" onClick={replayTutorial}><CircleHelp size={14}/> How to use Resibo</button></footer>
      </div> : active === 'Transactions' ? <div className="page-wrap"><div className="welcome-row"><div><div className="eyebrow">YOUR ACTIVITY · {currentMonth.toUpperCase()}</div><h1>Transactions</h1><p className="page-subtitle">A clear view of what came in and what went out.</p></div><div className="page-actions">{cyclePicker}<button className="primary-button" onClick={startNewTransaction}><Plus size={17}/> Add transaction</button></div></div><section className="summary-grid transaction-summary-grid" aria-label="Cycle activity summary"><article className="summary-card"><span className="metric-label">INCOME THIS CYCLE</span><div className="metric-amount small">{currency(incomeMinor)}</div><span className="stat-foot"><ArrowDownLeft size={14}/> Money received</span></article><article className="summary-card"><span className="metric-label">SPENDING THIS CYCLE</span><div className="metric-amount small">{currency(expensesMinor)}</div><span className="stat-foot expense-stat"><ArrowUpRight size={14}/> Money spent</span></article><article className="summary-card"><span className="metric-label">TRANSACTIONS</span><div className="metric-amount small">{transactions.length}</div><span className="stat-foot">{cycleLabel}</span></article></section><section className="panel transactions-panel full-transactions"><div className="panel-heading transactions-heading"><div><div className="eyebrow">{filtered.length} MATCHING RECORDS</div><h2>All transactions in this cycle</h2></div><div className="transaction-tools"><label className="searchbox"><Search size={15}/><input aria-label="Search transactions" placeholder="Search transactions" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className={`filter-button ${showFilters ? 'active' : ''}`} aria-expanded={showFilters} onClick={() => setShowFilters((shown) => !shown)}><SlidersHorizontal size={16}/><span>Filter</span></button></div></div>{showFilters && <div className="filter-popover"><label>Type<MenuSelect value={filterType} onChange={(value) => { setFilterType(value); setFilterCategory('all') }} ariaLabel="Filter transactions by type" options={[{ value: 'all', label: 'All activity' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]}/></label><label>Category<MenuSelect value={filterCategory} onChange={setFilterCategory} ariaLabel="Filter transactions by category" options={transactionCategoryOptions}/></label><button type="button" className="text-button" onClick={() => { setFilterType('all'); setFilterCategory('all') }}>Clear filters</button></div>}<div className="table-head"><span>TRANSACTION</span><span>PAYMENT METHOD</span><span>DATE</span><span>AMOUNT</span></div><div className="transaction-list">{filtered.length ? visibleTransactions.map(renderTransactionRow) : <div className="transaction-empty">{search || filterCategory !== 'all' || filterType !== 'all' ? 'No transactions match these filters.' : 'No transactions recorded in this cycle yet.'}</div>}</div>{filtered.length > 0 && <div className="audit-history-pagination transactions-pagination"><span>Showing {transactionPageStart}–{transactionPageEnd} of {filtered.length}</span><div><button type="button" className="secondary-button" onClick={() => setTransactionPage((page) => Math.max(1, page - 1))} disabled={currentTransactionPage <= 1} aria-label="Previous transactions page">Previous</button><span>Page {currentTransactionPage} of {transactionPageCount}</span><button type="button" className="secondary-button" onClick={() => setTransactionPage((page) => Math.min(transactionPageCount, page + 1))} disabled={currentTransactionPage >= transactionPageCount} aria-label="Next transactions page">Next</button></div></div>}</section></div> : active === 'Budgets' ? <div className="page-wrap"><div className="welcome-row"><div><div className="eyebrow">YOUR PLAN · {currentMonth.toUpperCase()}</div><h1>Budgets</h1><p className="page-subtitle">Set category limits for {cycleLabel} and track your progress.</p></div><div className="page-actions">{cyclePicker}<button className="primary-button" onClick={() => { setBudgetCategoryId(''); setBudgetLimit(''); setBudgetError(''); setShowBudgetForm(true) }}><Plus size={17}/> Add budget</button></div></div><section className="panel budget-manager"><div className="panel-heading"><div><div className="eyebrow">CURRENT CYCLE</div><h2>Category limits</h2></div><strong>{budgets.length} {budgets.length === 1 ? 'budget' : 'budgets'}</strong></div>{budgets.length ? <div className="budget-manager-list">{budgets.map((budget, index) => { const percent = budget.limit_minor > 0 ? Math.min(100, Math.round(budget.spent_minor / budget.limit_minor * 100)) : 0; const color = ['coral', 'blue', 'purple', 'yellow'][index % 4]; return <div className="budget-manager-row" key={budget.id}><BudgetRow color={color} icon={<Wallet size={15}/>} name={budget.category || 'Overall budget'} detail={`${currency(budget.spent_minor)} spent of ${currency(budget.limit_minor)}`} percent={percent} value={`${percent}%`} alert={percent >= 80}/><button className="text-button" onClick={() => { setBudgetCategoryId(budget.category_id ? String(budget.category_id) : ''); setBudgetLimit((budget.limit_minor / 100).toFixed(2)); setBudgetError(''); setShowBudgetForm(true) }}>Edit limit</button></div> })}</div> : <div className="panel-empty"><p>No budgets for this cycle yet. Add a category limit to start tracking progress.</p><button className="primary-button" onClick={() => { setBudgetCategoryId(''); setBudgetLimit(''); setBudgetError(''); setShowBudgetForm(true) }}><Plus size={16}/> Create your first budget</button></div>}</section></div> : active === 'Profile' ? <div className="page-wrap profile-page">
        <div className="welcome-row profile-welcome"><div><div className="eyebrow">YOUR ACCOUNT</div><h1>Profile &amp; settings</h1><p className="page-subtitle">Manage your details and how your account appears.</p></div></div>
        <SettingsTabs activeTab={settingsTab} onSelect={selectSettingsTab} activityCount={auditTotal} automationCount={filteredIncomeSchedules.length}/>
        <div className={`profile-settings-grid settings-tab-panel${settingsTab === 'profile' ? '' : ' profile-settings-grid-single'}`} role="tabpanel" id={`settings-panel-${settingsTab}`} aria-labelledby={`settings-tab-${settingsTab}`} tabIndex={0}>
          <div className="profile-settings-side">
          {settingsTab === 'profile' && <>
          <section id="user-profile-card" className="panel profile-photo-panel" aria-label="Profile appearance">
            <div className="profile-photo-identity">
              <div className="profile-overview-avatar" style={{ backgroundColor: selectedAvatarPalette.background, color: selectedAvatarPalette.foreground, '--avatar-accent': selectedAvatarPalette.background }}>{profileImageUrl ? <img src={profileImageUrl} alt="Profile" /> : profileInitials}</div>
              <div className="profile-photo-copy"><span className="eyebrow">YOUR PROFILE</span><h2>{authUser?.name}</h2><p>{authUser?.email}</p></div>
            </div>
            <div className="profile-photo-actions">
              <div><strong>Profile picture</strong><small>Choose a photo or use your initials.</small></div>
              <div className="avatar-upload-controls">
                <label className="avatar-upload-button"><Camera size={14}/>{avatarBusy ? 'Saving…' : profileImageUrl ? 'Change photo' : 'Upload photo'}<input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} disabled={avatarBusy}/></label>
                {profileImageUrl && <button className="avatar-remove-button" type="button" onClick={removeAvatar} disabled={avatarBusy}><Trash2 size={14}/>Remove</button>}
              </div>
              <small className="profile-image-help">PNG, JPG, or WebP · up to 1 MB</small>
              {avatarError && <div className="auth-alert error" role="alert">{avatarError}</div>}
            </div>
            <div className="avatar-color-section"><div><strong>Icon color</strong><small>Choose the accent for your profile ring and initials.</small><span className="selected-avatar-color">{selectedAvatarPalette.id}</span></div><div className="avatar-color-options" role="group" aria-label="Choose profile icon color">{avatarPalettes.map((palette) => <button key={palette.id} type="button" className={`avatar-swatch ${avatarPaletteId === palette.id ? 'selected' : ''}`} style={{ backgroundColor: palette.background }} title={`${palette.id} profile color`} aria-label={`${palette.id} profile icon color`} aria-pressed={avatarPaletteId === palette.id} onClick={() => chooseAvatarPalette(palette.id)}>{avatarPaletteId === palette.id && <Check size={12}/>}</button>)}</div></div>
          </section>
          <AccountSummaryCard loading={accountSummaryLoading} createdAt={accountCreatedAt} paymentMethods={savedPaymentMethods.length} breakdown={paymentMethodBreakdown} transactions={accountTransactionCount} transactionsDetail={transactionCountBreakdown} activeSchedules={incomeSchedules.filter((schedule) => schedule.enabled).length} spend={summarySpend} onProfile={() => document.getElementById('user-profile-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} onPaymentMethods={openDashboardPaymentMethods} onTransactions={() => setActive('Transactions')} onSchedules={() => selectSettingsTab('automations')}/>
          </>}
          </div>
          <div className="profile-settings-main">
            {settingsTab === 'profile' && <ProfileForm onSubmit={saveProfile} dirty={profileIsDirty} busy={profileBusy} onDiscard={discardProfileChanges} saved={profileSaved}>
              <div className="panel-heading"><div><div className="eyebrow">PERSONAL DETAILS</div><h2>Profile information</h2></div><UserRound size={18}/></div>
              <div className="profile-fields-grid">
                <label className="field-label profile-form-name">First name<input required maxLength="100" autoComplete="given-name" value={profileFirstName} onChange={(event) => setProfileFirstName(event.target.value)} /></label>
                <label className="field-label profile-form-name"><span>Middle name <span className="field-optional">(optional)</span></span><input maxLength="100" autoComplete="additional-name" value={profileMiddleName} onChange={(event) => setProfileMiddleName(event.target.value)} /></label>
                <label className="field-label profile-form-name">Last name<input required maxLength="100" autoComplete="family-name" value={profileLastName} onChange={(event) => setProfileLastName(event.target.value)} /></label>
                <label className="field-label profile-email-field">Email address<span className="locked-field"><input type="email" value={authUser?.email || ''} readOnly /><LockKeyhole size={15} aria-hidden="true"/></span><small>Your sign-in address. Can't be changed here.</small></label>
                <label className="field-label profile-timezone-field">Time zone<input list="profile-time-zone-options" value={profileTimeZone} onChange={(event) => { setProfileTimeZone(event.target.value); setProfileSaved(false) }} aria-label="Search time zone" /><datalist id="profile-time-zone-options">{(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [detectTimeZone()]).map((zone) => <option key={zone} value={zone}/>)}</datalist><small>Auto-detected. You can override it.</small></label>
              </div>
              {profileError && <div className="auth-alert error" role="alert">{profileError}</div>}
            </ProfileForm>}
            {settingsTab === 'preferences' && <div className="profile-settings-tools"><AppearanceControl theme={themePreference} onChange={setThemePreference}/><TutorialSettings tutorial={replayTutorial}/></div>}
            {settingsTab === 'security' && <AccountSecurity signOut={requestSignOut} exportData={exportAccountData} unavailable={() => showSettingsToast('Not available yet')} openDelete={() => setShowDeleteAccount(true)}/>}
            {settingsTab === 'automations' && <section className="panel income-schedules-section" id="automatic-transactions">
              <div className="income-schedules-heading"><div className="income-schedules-title-row"><div><div className="eyebrow">RECURRING TRANSACTIONS</div><h2>Automatic transactions</h2><p className="salary-schedule-description">Set recurring income or expenses, such as salary or monthly rent.</p></div><span className="audit-history-count">{visibleIncomeSchedules.length} of {filteredIncomeSchedules.length}</span></div><div className="income-schedules-heading-actions"><label className="income-schedule-filter-label"><span>Transaction type</span><MenuSelect className="income-schedule-menu-select" value={incomeScheduleTypeFilter} onChange={(value) => { setIncomeScheduleTypeFilter(value); setIncomeSchedulePage(1) }} ariaLabel="Filter automatic transactions by type" options={[{ value: 'all', label: 'All types' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expenses' }]}/></label><label className="searchbox income-schedule-search"><Search size={14}/><input type="search" aria-label="Search automatic transactions" placeholder="Search schedules" value={incomeScheduleSearch} onChange={(event) => { setIncomeScheduleSearch(event.target.value); setIncomeSchedulePage(1) }}/></label><button type="button" className="secondary-button income-schedule-add" onClick={addIncomeSchedule}><Plus size={15}/> Add schedule</button></div></div>
              {incomeSchedulesError && <div className="auth-alert error" role="alert">{incomeSchedulesError}</div>}
              {incomeSchedulesLoading && !incomeSchedules.length && <div className="income-schedule-empty">Loading your automatic schedules…</div>}
              {!incomeSchedulesLoading && !incomeSchedules.length && <div className="income-schedule-empty"><strong>No automatic transactions yet</strong><span>Add a schedule for salary, freelance income, rent, or another regular transaction.</span><button type="button" className="primary-button" onClick={addIncomeSchedule}><Plus size={15}/> Add schedule</button></div>}
              {incomeSchedules.length > 0 && !filteredIncomeSchedules.length && <div className="income-schedule-empty"><strong>{incomeScheduleSearch.trim() ? 'No matching schedules' : `No ${incomeScheduleTypeFilter} schedules`}</strong><span>{incomeScheduleSearch.trim() ? 'Try another search or clear the search field.' : 'Choose another transaction type to see more schedules.'}</span></div>}
              {visibleIncomeSchedules.length > 0 && <ScheduleList>{visibleIncomeSchedules.map((schedule) => {
                const typeLabel = schedule.transactionType === 'expense' ? 'Expense' : 'Income'
                const categoryOptions = categories.filter((entry) => entry.type === schedule.transactionType)
                const selectedMethod = savedPaymentMethods.find((method) => String(method.userMethodId) === String(schedule.paymentMethodId))
                const selectedCategory = categoryOptions.find((entry) => String(entry.id) === String(schedule.categoryId))
                const cadenceSummary = schedule.frequency === 'monthly'
                  ? `Monthly · ${dayOptionLabel(Number(schedule.monthlyDay)).replace(' / month-end', '')}`
                  : `Twice a month · ${dayOptionLabel(Number(schedule.firstPaydayDay)).replace(' / month-end', '')} & ${dayOptionLabel(Number(schedule.secondPaydayDay)).replace(' / month-end', '')}`
                const scheduleAmount = Number(schedule.amount)
                const amountMinor = Number.isFinite(scheduleAmount) ? Math.round(scheduleAmount * 100) : 0
                const methodName = selectedMethod?.name || 'Cash'
                return <div key={schedule.clientKey} className="income-schedule-item">
                  <div className="income-schedule-row" role="button" tabIndex={schedule.busy ? -1 : 0} aria-label={`Edit ${schedule.name || typeLabel} automatic ${typeLabel.toLowerCase()} schedule`} title="Edit schedule" aria-disabled={Boolean(schedule.busy)} onClick={() => !schedule.busy && editIncomeSchedule(schedule.clientKey)} onKeyDown={(event) => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); editIncomeSchedule(schedule.clientKey) } }} onContextMenu={(event) => openIncomeScheduleMenu(event, schedule)}>
                    <span className={`income-schedule-row-icon ${schedule.transactionType === 'expense' ? 'is-expense' : 'is-income'}`} aria-hidden="true">{schedule.transactionType === 'expense' ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}</span>
                    <span className="income-schedule-row-copy"><strong>{schedule.name || `${typeLabel} schedule`}</strong><small>{[selectedCategory?.name || schedule.name, cadenceSummary, methodName].filter(Boolean).join(' · ')} · {schedule.enabled ? `Next run: ${formatScheduleNextRun({ ...schedule, timeZone: profileTimeZone })}` : 'Paused'}</small></span>
                    <span className="income-schedule-row-meta"><button type="button" className={`income-schedule-toggle${schedule.enabled ? ' is-on' : ''}`} role="switch" aria-checked={Boolean(schedule.enabled)} aria-label={`${schedule.enabled ? 'Pause' : 'Activate'} ${schedule.name} schedule`} disabled={!schedule.id || schedule.busy} onClick={(event) => { event.stopPropagation(); toggleIncomeSchedule(schedule) }}><span>{schedule.busy ? 'Saving…' : schedule.enabled ? 'Active' : schedule.id ? 'Paused' : 'Draft'}</span><i/></button><span className={`income-schedule-row-amount ${schedule.transactionType === 'expense' ? 'is-expense' : 'is-income'}`}>{schedule.transactionType === 'expense' ? '−' : '+'}{currency(amountMinor)}</span></span>
                  </div>
                  <button type="button" className="income-schedule-menu-trigger" aria-label={`More actions for ${schedule.name}`} title="Edit or delete schedule" disabled={schedule.busy} onClick={(event) => openIncomeScheduleMenu(event, schedule)}><MoreHorizontal size={17}/></button>
                </div>
              })}</ScheduleList>}
              {filteredIncomeSchedules.length > 0 && <div className="income-schedule-pagination"><span>Showing {incomeSchedulePageStart}–{incomeSchedulePageEnd} of {filteredIncomeSchedules.length}</span><div><button type="button" className="secondary-button" onClick={() => setIncomeSchedulePage((page) => Math.max(1, page - 1))} disabled={currentIncomeSchedulePage <= 1} aria-label="Previous automatic transactions page">Previous</button><span>Page {currentIncomeSchedulePage} of {incomeSchedulePageCount}</span><button type="button" className="secondary-button" onClick={() => setIncomeSchedulePage((page) => Math.min(incomeSchedulePageCount, page + 1))} disabled={currentIncomeSchedulePage >= incomeSchedulePageCount} aria-label="Next automatic transactions page">Next</button></div></div>}
            </section>}
            {settingsTab === 'activity' && <section className="panel transaction-audit-panel" aria-labelledby="transaction-audit-title">
              <div className="audit-history-heading">
                <div><span className="eyebrow">YOUR ACTIVITY</span><h2 id="transaction-audit-title">Income, expense &amp; payment history</h2><p className="salary-schedule-description">Review your income, expenses, and card payments. Filter by activity, transaction type, or date.</p></div>
                <div className="audit-history-heading-actions"><button type="button" className="secondary-button activity-export-button" onClick={exportActivityCsv} disabled={!auditEntries.length}><Download size={14}/> Export CSV</button><span className="audit-history-count">{auditTotal} {auditTotal === 1 ? 'result' : 'results'}</span></div>
              </div>
              {!dismissedHelpTips.history && <div className="contextual-help-tip" role="note"><span>Filter by activity, transaction type, or date range.</span><button type="button" aria-label="Dismiss history tip" onClick={() => dismissHelpTip('history')}><X size={13}/></button></div>}
              <div className="audit-history-filters">
                <label>Activity<MenuSelect value={auditActionFilter} ariaLabel="Filter history by activity" options={[{ value: 'all', label: 'All actions' }, { value: 'create', label: 'Created' }, { value: 'update', label: 'Edited' }, { value: 'delete', label: 'Deleted' }]} onChange={(value) => { setAuditPaymentFocusId(''); setAuditActionFilter(value); setAuditPage(1) }}/></label>
                <label>Transaction type<MenuSelect value={auditTypeFilter} ariaLabel="Filter history by transaction type" options={[{ value: 'all', label: 'All transactions' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expenses' }, { value: 'card_payment', label: 'Card payments' }]} onChange={(value) => { setAuditPaymentFocusId(''); setAuditTypeFilter(value); setAuditPage(1) }}/></label>
                <ActivityDateRangePicker preset={auditDatePreset} startDate={auditRangeStart} endDate={auditRangeEnd} onPresetChange={(preset) => { setAuditPaymentFocusId(''); setAuditDatePreset(preset); if (preset !== 'custom') { setAuditRangeStart(''); setAuditRangeEnd('') }; setAuditPage(1) }} onCustomRangeChange={(start, end) => { setAuditPaymentFocusId(''); setAuditDatePreset('custom'); setAuditRangeStart(start); setAuditRangeEnd(end); setAuditPage(1) }}/>
                {(auditActionFilter !== 'all' || auditTypeFilter !== 'all' || auditDatePreset !== 'this_month' || Boolean(auditPaymentFocusId)) && <button type="button" className="audit-date-clear" onClick={clearActivityFilters}>Clear filters</button>}
              </div>
              {auditError && <div className="auth-alert error" role="alert">{auditError}</div>}
              <ActivityList entries={visibleAuditEntries} allEntries={auditEntries} loading={auditLoading} emptyAction={clearActivityFilters} currency={currency} actorName={authUser?.name || [authUser?.first_name, authUser?.last_name].filter(Boolean).join(' ') || 'You'} paymentMethods={savedPaymentMethods} page={currentAuditPage} pageCount={auditPageCount} pageStart={auditPageStart} pageEnd={auditPageEnd} total={auditTotal} onPageChange={setAuditPage} expandedRows={expandedAuditRows} onToggleRow={(id) => setExpandedAuditRows((current) => ({ ...current, [id]: !current[id] }))}/>
            </section>}
          </div>
        </div>
      </div> : <div className="page-wrap placeholder-page"><div className="eyebrow">YOUR MONEY, YOUR WAY</div><h1>{active}</h1><p className="page-subtitle">This section is part of the next build step. Your dashboard is ready to explore.</p><button className="primary-button" onClick={() => setActive('Dashboard')}><LayoutDashboard size={17}/> Back to dashboard</button></div>}
    </main>

    <nav className="mobile-nav" aria-label="Mobile navigation">{nav.map(({ label, icon: Icon }) => <button key={label} className={active === label ? 'selected' : ''} onClick={() => setActive(label)}><Icon size={19}/><span>{label}</span></button>)}<button className={active === 'Profile' ? 'selected' : ''} onClick={() => setActive('Profile')}><UserRound size={19}/><span>Profile</span></button></nav>
    {saved && <div className="toast" role="status">{savedMessage}</div>}
    {pendingSettingsTab && <SettingsTabGuardDialog onStay={stayOnSettingsTab} onDiscard={discardAndSwitchSettingsTab}/>}
    {showDeleteAccount && <DeleteAccountDialog email={authUser?.email || ''} onClose={() => setShowDeleteAccount(false)} onConfirm={() => { setShowDeleteAccount(false); showSettingsToast('Not available yet') }}/>}
    {showSignOutConfirm && <div className="modal-backdrop sign-out-confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !signOutBusy && setShowSignOutConfirm(false)}><section className="add-modal sign-out-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="sign-out-confirm-title" aria-describedby="sign-out-confirm-description"><div><span className="eyebrow">ACCOUNT SECURITY</span><h2 id="sign-out-confirm-title">Are you sure you want to sign out?</h2></div><p id="sign-out-confirm-description">You’ll need to sign in again to access your account on this device.</p><div className="payment-edit-actions"><button type="button" className="secondary-button" onClick={() => setShowSignOutConfirm(false)} disabled={signOutBusy}>Cancel</button><button type="button" className="primary-button" onClick={confirmSignOut} disabled={signOutBusy}>{signOutBusy ? 'Signing out…' : 'Sign out'}</button></div></section></div>}
    {editingIncomeSchedule && (() => {
      const schedule = editingIncomeSchedule
      const typeLabel = schedule.transactionType === 'expense' ? 'Expense' : 'Income'
      const categoryOptions = categories.filter((entry) => entry.type === schedule.transactionType)
      return <div className="modal-backdrop schedule-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !schedule.busy && setIncomeScheduleModalKey('')}>
        <form className="add-modal automatic-schedule-modal profile-editor salary-schedule-settings" role="dialog" aria-modal="true" aria-labelledby="income-schedule-modal-title" onSubmit={(event) => saveIncomeSchedule(schedule.clientKey, event)}>
          <div className="modal-title"><div><span className="eyebrow">RECURRING TRANSACTION</span><h2 id="income-schedule-modal-title">{schedule.id ? 'Edit automatic transaction' : 'Add automatic transaction'}</h2></div><button type="button" className="icon-button" aria-label="Close" disabled={schedule.busy} onClick={() => setIncomeScheduleModalKey('')}><X size={19}/></button></div>
          <label className="field-label income-name-field">{typeLabel} name<input required maxLength={80} value={schedule.name} onChange={(event) => updateIncomeSchedule(schedule.clientKey, 'name', event.target.value)} placeholder={schedule.transactionType === 'expense' ? 'Rent, utilities, subscription…' : 'Salary, freelance, allowance…'} title={schedule.name} /></label>
          <div className="salary-schedule-fields">
            <label className="field-label">Transaction type<MenuSelect value={schedule.transactionType} onChange={(value) => changeIncomeScheduleType(schedule.clientKey, value)} ariaLabel="Schedule transaction type" options={[{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }]}/></label>
            <label className="field-label">Frequency<MenuSelect value={schedule.frequency} onChange={(value) => updateIncomeSchedule(schedule.clientKey, 'frequency', value)} ariaLabel="Schedule frequency" options={[{ value: 'monthly', label: 'Once a month' }, { value: 'twice_monthly', label: 'Twice a month' }]}/></label>
          </div>
          {schedule.frequency === 'monthly' ? <><label className="field-label">Day of month<MenuSelect value={schedule.monthlyDay} onChange={(value) => updateIncomeSchedule(schedule.clientKey, 'monthlyDay', value)} ariaLabel="Schedule day of month" options={Array.from({ length: 31 }, (_, index) => index + 1).map((day) => ({ value: String(day), label: dayOptionLabel(day), description: day >= 29 ? 'Runs on the last day in shorter months.' : undefined }))}/></label><p className="salary-schedule-note salary-day-hint">Days 29–31 fall on the last calendar day in shorter months.</p></> : <><div className="salary-payday-fields">
            <label className="field-label">{typeLabel} date 1<MenuSelect value={schedule.firstPaydayDay} onChange={(value) => updateIncomeSchedule(schedule.clientKey, 'firstPaydayDay', value)} ariaLabel="First payday" options={Array.from({ length: 30 }, (_, index) => index + 1).map((day) => ({ value: String(day), label: dayOptionLabel(day), description: day >= 29 ? 'Runs on the last day in shorter months.' : undefined }))}/></label>
            <label className="field-label">{typeLabel} date 2<MenuSelect value={schedule.secondPaydayDay} onChange={(value) => updateIncomeSchedule(schedule.clientKey, 'secondPaydayDay', value)} ariaLabel="Second payday" options={Array.from({ length: 31 }, (_, index) => index + 1).filter((day) => day > Number(schedule.firstPaydayDay)).map((day) => ({ value: String(day), label: dayOptionLabel(day), description: day >= 29 ? 'Runs on the last day in shorter months.' : undefined }))}/></label>
          </div><p className="salary-schedule-note salary-day-hint">Days 29–31 fall on the last calendar day in shorter months.</p></>}
          <label className="field-label">Amount per occurrence<input required min="0.01" step="0.01" type="number" inputMode="decimal" placeholder="0.00" value={schedule.amount} onChange={(event) => updateIncomeSchedule(schedule.clientKey, 'amount', event.target.value)} /><span className="currency-prefix">₱</span></label>
          <label className="field-label">{typeLabel} category<MenuSelect value={schedule.categoryId} onChange={(value) => updateIncomeSchedule(schedule.clientKey, 'categoryId', value)} ariaLabel="Schedule category" options={categoryOptions.map((entry) => ({ value: String(entry.id), label: entry.name }))}/></label>
          <SchedulePaymentSource label={schedule.transactionType === 'expense' ? 'Paid from' : 'Received into'} transactionType={schedule.transactionType} value={schedule.paymentMethodId} methods={savedPaymentMethods} onChange={(value) => updateIncomeSchedule(schedule.clientKey, 'paymentMethodId', value)} />
          <label className="salary-schedule-toggle"><input type="checkbox" checked={Boolean(schedule.enabled)} onChange={(event) => updateIncomeSchedule(schedule.clientKey, 'enabled', event.target.checked)} /><span><strong>Enable automatic schedule</strong><small>Creates {schedule.transactionType} transactions on the selected date{schedule.frequency === 'monthly' ? '' : 's'} each month.</small></span></label>
          <p className="salary-schedule-note">Resibo records scheduled transactions while it is open and catches up on missed dates the next time you open it.</p>
          {schedule.error && <div className="auth-alert error" role="alert">{schedule.error}</div>}
          {schedule.saved && !schedule.error && <div className="auth-alert success" role="status">Automatic schedule saved.</div>}
          <div className="income-schedule-actions"><button className="primary-button save-button" type="submit" disabled={schedule.busy || !categories.some((entry) => entry.type === schedule.transactionType)}>{schedule.busy ? 'Saving…' : schedule.saved ? 'Save changes' : 'Save schedule'}</button><span>Recorded transactions stay in your history if you remove this schedule.</span></div>
          <button type="button" className="text-button income-schedule-modal-delete" disabled={schedule.busy} onClick={() => removeIncomeSchedule(schedule.clientKey)}><Trash2 size={14}/>{schedule.id ? 'Delete schedule' : 'Discard draft'}</button>
        </form>
      </div>
    })()}
    {incomeScheduleToDelete && <div className="modal-backdrop schedule-delete-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !incomeScheduleDeleteBusy && setIncomeScheduleToDelete(null)}><section className="add-modal confirm-remove-modal schedule-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-income-schedule-title" aria-describedby="delete-income-schedule-description"><div className="confirm-remove-heading"><span className="confirm-remove-icon"><Trash2 size={18}/></span><div><span className="eyebrow">AUTOMATIC TRANSACTION</span><h2 id="delete-income-schedule-title">Remove this schedule?</h2></div><button type="button" className="icon-button" aria-label="Close" disabled={incomeScheduleDeleteBusy} onClick={() => setIncomeScheduleToDelete(null)}><X size={19}/></button></div><div className="payment-remove-summary"><span className={`transaction-icon ${incomeScheduleToDelete.transactionType === 'income' ? 'mint' : 'blue'}`}>{incomeScheduleToDelete.transactionType === 'income' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}</span><span><strong>{incomeScheduleToDelete.name}</strong><small>Automatic {incomeScheduleToDelete.transactionType}</small></span></div><p className="confirm-remove-copy" id="delete-income-schedule-description">This stops future automatic entries. Transactions already recorded will stay in your history.</p>{incomeScheduleDeleteError && <div className="confirm-remove-error" role="alert"><CircleAlert size={16}/><span>{incomeScheduleDeleteError}</span></div>}<div className="payment-edit-actions"><button type="button" className="secondary-button" onClick={() => setIncomeScheduleToDelete(null)} disabled={incomeScheduleDeleteBusy}>Cancel</button><button type="button" className="danger-button" onClick={confirmRemoveIncomeSchedule} disabled={incomeScheduleDeleteBusy}><Trash2 size={15}/>{incomeScheduleDeleteBusy ? 'Removing…' : 'Remove schedule'}</button></div></section></div>}
    {incomeScheduleContextMenu && <div ref={incomeScheduleContextMenuRef} className="transaction-context-menu" role="menu" aria-label={`Actions for ${incomeScheduleContextMenu.schedule.name}`} style={{ left: incomeScheduleContextMenu.x, top: incomeScheduleContextMenu.y }}><button type="button" role="menuitem" onClick={() => editIncomeSchedule(incomeScheduleContextMenu.schedule.clientKey)}><Pencil size={15}/> Edit schedule</button><button type="button" role="menuitem" className="transaction-context-delete" onClick={() => removeIncomeSchedule(incomeScheduleContextMenu.schedule.clientKey)}><Trash2 size={15}/> Delete schedule</button></div>}
    {transactionContextMenu && <div ref={transactionContextMenuRef} className="transaction-context-menu" role="menu" aria-label={`Actions for ${transactionContextMenu.item.name}`} style={{ left: transactionContextMenu.x, top: transactionContextMenu.y }}>{transactionContextMenu.item.isCreditCardPayment ? <button type="button" role="menuitem" onClick={() => showCreditCardPaymentInHistory(transactionContextMenu.item)}><History size={15}/> Show in history</button> : <><button type="button" role="menuitem" onClick={() => editTransaction(transactionContextMenu.item)}><Pencil size={15}/> Edit transaction</button><button type="button" role="menuitem" className="transaction-context-delete" onClick={() => confirmDeleteTransaction(transactionContextMenu.item)}><Trash2 size={15}/> Delete transaction</button></>}</div>}
    {transactionToDelete && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !transactionDeleteBusy && setTransactionToDelete(null)}><section className="add-modal confirm-remove-modal transaction-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-transaction-title" aria-describedby="delete-transaction-description"><div className="confirm-remove-heading"><span className="confirm-remove-icon"><Trash2 size={18}/></span><div><span className="eyebrow">TRANSACTION</span><h2 id="delete-transaction-title">Delete this transaction?</h2></div><button type="button" className="icon-button" aria-label="Close" disabled={transactionDeleteBusy} onClick={() => setTransactionToDelete(null)}><X size={19}/></button></div><div className="payment-remove-summary"><span className={`transaction-icon ${transactionToDelete.color}`}>{transactionToDelete.amount > 0 ? <ArrowDownLeft size={16}/> : <ShoppingBag size={16}/>}</span><span><strong>{transactionToDelete.name}</strong><small>{transactionToDelete.category} · {transactionToDelete.date} · {transactionToDelete.amount > 0 ? '+' : '−'}{peso(transactionToDelete.amount)}</small></span></div><p className="confirm-remove-copy" id="delete-transaction-description">This will permanently remove the transaction and update your cycle totals. This action can’t be undone.</p>{transactionDeleteError && <div className="confirm-remove-error" role="alert"><CircleAlert size={16}/><span>{transactionDeleteError}</span></div>}<div className="payment-edit-actions"><button type="button" className="secondary-button" onClick={() => setTransactionToDelete(null)} disabled={transactionDeleteBusy}>Cancel</button><button type="button" className="danger-button" onClick={deleteTransaction} disabled={transactionDeleteBusy}><Trash2 size={15}/>{transactionDeleteBusy ? 'Deleting…' : 'Delete transaction'}</button></div></section></div>}
    {showMethodPicker && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowMethodPicker(false)}>
      <section ref={methodPickerRef} className="method-picker" role="dialog" aria-modal="true" aria-labelledby="method-picker-title">
        <div className="modal-title"><div><span className="eyebrow">DESIGN CATALOG</span><h2 id="method-picker-title">Choose a payment method</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setShowMethodPicker(false)}><X size={19}/></button></div>
        <p className="picker-hint">{activePaymentGroup === 'cash' ? 'Choose a style for your built-in cash method.' : activePaymentGroup === 'ewallet' ? 'Choose or search for your e-wallet.' : 'Search the complete card catalog and filter by card type.'}</p>
        {methodError && <div className="auth-alert error" role="alert">{methodError}</div>}
        <div className="catalog-filters">
          <label className="field-label catalog-search-label">{activePaymentGroup === 'cash' ? 'Search cash designs' : activePaymentGroup === 'ewallet' ? 'Search e-wallets' : 'Search banks or cards'}<span className="catalog-search"><Search size={16} aria-hidden="true"/><input type="search" value={designSearch} onChange={(event) => { setDesignSearch(event.target.value); setVisibleDesignCount(5) }} placeholder={activePaymentGroup === 'cash' ? 'Try Cash Wallet' : activePaymentGroup === 'ewallet' ? 'Try GCash or Maya' : 'Try BDO, HSBC, or Visa'} aria-label="Search banks or card designs" /></span></label>
          {isCardPaymentGroup && <label className="field-label">Card type<MenuSelect value={designTypeFilter} onChange={(value) => { setDesignTypeFilter(value); setVisibleDesignCount(5) }} ariaLabel="Filter card designs by type" options={[{ value: 'all', label: 'All card types' }, ...designTypes.map((type) => ({ value: type, label: type }))]}/></label>}
        </div>
        <div className="catalog-result-count" aria-live="polite">{activePaymentGroup === 'ewallet' ? `${filteredPaymentCatalog.length} e-wallet ${filteredPaymentCatalog.length === 1 ? 'design' : 'designs'} available` : `${referenceProductNames.size} designs total · ${filteredPaymentCatalog.length}${designSearch.trim() ? ` matching “${designSearch.trim()}” in ${selectedPaymentGroup.title.toLowerCase()}` : ` in ${selectedPaymentGroup.title.toLowerCase()}`}`}{!designSearch.trim() && isCardPaymentGroup && designTypeFilter === 'all' && ' · showing 5 at a time'}</div>
        <div className="design-options catalog-card-grid">
          {visiblePaymentCatalog.map((design) => {
            const finish = cardFinish({ category: design.category, name: design.display_name, theme_key: design.theme_key })
            const isCashDesign = finish === 'cash'
            const productType = cardTypeLabel(design)
            const network = cardNetwork(design)
            return <button key={design.slug || design.id} type="button" className="design-option catalog-design-option" onClick={() => addPaymentDesign(design)} aria-label={`Use ${design.display_name} design from ${design.issuer}`}>
              <span className={`catalog-card-preview ${design.theme_key} pattern-${finish === 'premium' ? 'grid' : design.pattern_key || 'gradient'} finish-${finish}`} style={cardVisualStyle(design)}>
                <span className="card-pattern catalog-card-pattern" aria-hidden="true"/>
                {isCashDesign ? <><span className="catalog-cash-frame"/><span className="catalog-cash-seal">₱</span><span className="catalog-card-top"><strong className="catalog-bank-mark"><Wallet size={13}/></strong><span className="catalog-cash-tag">CASH</span></span><span className="catalog-cash-balance">₱••••</span><span className="catalog-cash-title">{design.display_name}</span></> : <>
                  <span className="catalog-card-top"><strong className="catalog-bank-mark">{cardBrandMark(design.issuer)}</strong><span className="catalog-card-heading"><strong>{design.display_name}</strong><small>{productType}</small></span><svg className="catalog-nfc" viewBox="0 0 22 26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M3 5c4 5 4 11 0 16"/><path d="M8.5 3c5.5 6.5 5.5 13.5 0 20"/><path d="M14 1c7 8 7 16 0 24"/></svg></span>
                  <span className="catalog-card-chip"/><span className="catalog-card-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;••••</span><span className="catalog-card-eye" aria-hidden="true"><Eye size={13}/></span>
                  {design.category === 'credit_card' && finish !== 'standard' && <span className="catalog-card-holo"/>}
                  <span className="catalog-card-bottom"><span className="catalog-card-holder"><small>CARD HOLDER</small><strong>YOUR NAME</strong></span><span className="catalog-card-expiry"><small>VALID THRU</small><strong>MM/YY</strong></span>{network && <b className={`payment-card-network-mark ${network.toLowerCase().replace(/[^a-z]/g, '')}`}>{cardNetworkLabel(network)}</b>}</span>
                </>}
              </span>
              <span className="catalog-design-meta"><span><strong>{design.display_name}</strong><small>{[productType, network, design.issuer].filter(Boolean).join(' · ')}</small></span><span className="design-add" aria-hidden="true">＋</span></span>
            </button>
          })}
        </div>
        {!paymentCatalog.length && <p className="picker-hint">Payment designs are unavailable right now.</p>}
        {!!paymentCatalog.length && !filteredPaymentCatalog.length && <p className="picker-hint">No matching methods found. Try another search.</p>}
        {filteredPaymentCatalog.length > visiblePaymentCatalog.length && <button type="button" className="catalog-more-button" onClick={() => setVisibleDesignCount((count) => Math.min(count + 5, filteredPaymentCatalog.length))}>Show 5 more <span>({filteredPaymentCatalog.length - visiblePaymentCatalog.length} remaining)</span></button>}
        {visibleDesignCount > 5 && filteredPaymentCatalog.length > 5 && <button type="button" className="catalog-less-button" onClick={() => setVisibleDesignCount(5)}>Show fewer</button>}
        <p className="modal-hint">All {referenceProductNames.size} designs from your catalog are listed across debit, credit, and cash. Only the last four digits are saved; full card numbers and CVVs are never collected.</p>
      </section>
    </div>}
    {editingMethod && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closePaymentMethodEditor()}><form className="add-modal payment-method-editor" onSubmit={savePaymentMethodSettings}>
      <div className="modal-title"><div><span className="eyebrow">{editingMethod.groupId === 'credit' ? 'CREDIT CARD' : editingMethod.groupId === 'ewallet' ? 'E-WALLET' : editingMethod.groupId === 'debit' ? 'DEBIT CARD' : 'CASH'}</span><h2>Edit {editingMethod.groupId === 'credit' ? 'credit card' : editingMethod.groupId === 'debit' ? 'debit card' : editingMethod.groupId === 'ewallet' ? 'e-wallet' : 'payment method'}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={closePaymentMethodEditor}><X size={19}/></button></div>
      <p className="page-subtitle">Update its cardholder details or balance. Saved transactions stay linked to this method.</p>
      {editingMethod.groupId !== 'cash' && <><label className="field-label">Cardholder name <span className="field-optional">(optional)</span><input type="text" maxLength={28} autoComplete="cc-name" value={methodCardholderName} onChange={(event) => setMethodCardholderName(event.target.value)} placeholder="Name on card" /></label><div className="modal-fields"><label className="field-label">Last four digits <input type="text" inputMode="numeric" autoComplete="off" maxLength={4} value={methodLastFour} onChange={(event) => setMethodLastFour(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" /></label><label className="field-label">Expiry <input type="text" inputMode="numeric" autoComplete="cc-exp" maxLength={5} value={methodExpiry} onChange={(event) => setMethodExpiry(formatExpiryInput(event.target.value))} placeholder="MM/YY" /></label></div><p className="card-number-storage-note">Only the last four digits, cardholder name, and expiry are saved. A full card number and CVV are never collected.</p></>}
      {editingMethod.groupId === 'credit' ? <><label className="field-label">Credit limit<input required min="0" step="0.01" type="number" value={methodCreditLimit} onChange={(event) => setMethodCreditLimit(event.target.value)}/></label><label className="field-label">Current debt<input required min="0" step="0.01" type="number" value={methodDebt} onChange={(event) => setMethodDebt(event.target.value)}/></label><p className="modal-hint">Available to spend is calculated as credit limit minus debt.</p></> : <><label className="field-label">Current balance<input required min="0" step="0.01" type="number" value={methodBalance} onChange={(event) => setMethodBalance(event.target.value)}/></label><p className="modal-hint">This sets a balance snapshot. Later saved income and expenses adjust it.</p></>}
      {methodSettingsError && <div className="auth-alert error" role="alert">{methodSettingsError}</div>}
      <div className="payment-edit-actions"><button type="button" className="secondary-button" onClick={closePaymentMethodEditor}>Cancel</button><button className="primary-button" type="submit" disabled={methodSettingsBusy}>{methodSettingsBusy ? 'Saving…' : 'Save changes'}</button></div>
    </form></div>}
    {confirmRemoveMethod && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setConfirmRemoveMethod(null)}><section className="add-modal confirm-remove-modal" role="alertdialog" aria-modal="true" aria-labelledby="remove-method-title"><div className="confirm-remove-heading"><span className="confirm-remove-icon"><Trash2 size={18}/></span><div><span className="eyebrow">WALLET MANAGEMENT</span><h2 id="remove-method-title">Remove this payment method?</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setConfirmRemoveMethod(null)}><X size={19}/></button></div><div className="payment-remove-summary"><span className={`design-swatch ${confirmRemoveMethod.theme}`}>{confirmRemoveMethod.symbol}</span><span><strong>{confirmRemoveMethod.name}</strong><small>{confirmRemoveMethod.method} · {confirmRemoveMethod.issuer}</small></span></div><p className="confirm-remove-copy">It will disappear from your wallet and new entries. Your existing transactions and reports will stay intact.</p>{methodRemoveError && <div className="confirm-remove-error" role="alert"><CircleAlert size={16}/><span>{methodRemoveError}</span></div>}<div className="payment-edit-actions"><button type="button" className="secondary-button" onClick={() => setConfirmRemoveMethod(null)} disabled={methodRemoveBusy}>Keep payment method</button><button type="button" className="danger-button" onClick={removePaymentMethod} disabled={methodRemoveBusy}><Trash2 size={15}/>{methodRemoveBusy ? 'Removing…' : 'Remove method'}</button></div></section></div>}
    {dashboardDetailModal && <div className="modal-backdrop dashboard-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDashboardDetailModal(null)}><section className="add-modal dashboard-detail-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-detail-title">
      <div className="modal-title"><div><span className="eyebrow">{dashboardDetailModal === 'income' ? 'MONEY RECEIVED' : 'CREDIT CARDS'}</span><h2 id="dashboard-detail-title">{dashboardDetailModal === 'income' ? `Income sources · ${currentMonth}` : 'Credit card debt'}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setDashboardDetailModal(null)}><X size={19}/></button></div>
      {dashboardDetailModal === 'income' ? <IncomeSourcesPanel allSourceCount={incomeDetailsByDestination.length} groups={visibleIncomeDetails} filteredGroups={filteredIncomeDetails} currency={currency} search={incomeDetailSearch} currentPage={currentIncomeDetailPage} pageCount={incomeDetailPageCount} transactionPages={incomeDetailTransactionPages} onSearchChange={(value) => { setIncomeDetailSearch(value); setIncomeDetailPage(1); setIncomeDetailTransactionPages({}) }} onPageChange={setIncomeDetailPage} onTransactionPageChange={(key, page) => setIncomeDetailTransactionPages((pages) => ({ ...pages, [key]: page }))}/> : indebtedCreditCards.length ? <><div className="dashboard-debt-toolbar"><label className="dashboard-debt-search"><input type="search" aria-label="Search credit cards with debt" placeholder="Search credit cards" value={creditDebtSearch} onChange={(event) => { setCreditDebtSearch(event.target.value); setCreditDebtPage(1) }}/></label><span>{filteredIndebtedCreditCards.length} {filteredIndebtedCreditCards.length === 1 ? 'card' : 'cards'}</span></div>{visibleIndebtedCreditCards.length ? <div className="dashboard-debt-options">{visibleIndebtedCreditCards.map((method) => <button type="button" className="dashboard-debt-option" key={method.userMethodId} onClick={() => openCreditCardSettlement(method)}><span className="dashboard-debt-copy"><strong>{paymentMethodDisplayName(method)}</strong><small>{method.kind} · Available to spend {currency(paymentMethodSpendableMinor(method))}</small></span><span className="dashboard-debt-amount"><small>DEBT</small><strong>{currency(method.debtMinor)}</strong></span></button>)}</div> : <div className="dashboard-detail-empty">No credit cards match your search.</div>}{filteredIndebtedCreditCards.length > 0 && <div className="dashboard-debt-pagination"><span>Showing {(currentCreditDebtPage - 1) * 10 + 1}–{Math.min(currentCreditDebtPage * 10, filteredIndebtedCreditCards.length)} of {filteredIndebtedCreditCards.length}</span><div><button type="button" className="secondary-button" onClick={() => setCreditDebtPage((page) => Math.max(1, page - 1))} disabled={currentCreditDebtPage <= 1}>Previous</button><span>Page {currentCreditDebtPage} of {creditDebtPageCount}</span><button type="button" className="secondary-button" onClick={() => setCreditDebtPage((page) => Math.min(creditDebtPageCount, page + 1))} disabled={currentCreditDebtPage >= creditDebtPageCount}>Next</button></div></div>}</> : <div className="dashboard-detail-empty">No credit card debt to pay right now.</div>}
    </section></div>}
    {showAdd && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeTransactionForm()}><form className={`add-modal${isCreditCardPayment ? ' credit-card-payment-modal' : ''}`} onSubmit={addTransaction}>
      <div className="modal-title"><div><span className="eyebrow">QUICK ENTRY</span><h2>{editingTransaction ? 'Edit transaction' : 'Add transaction'}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={closeTransactionForm}><X size={19}/></button></div>
      <div className="type-switch"><button type="button" className={kind === 'Expense' ? 'chosen' : ''} onClick={() => setKind('Expense')}><ArrowUpRight size={16}/>Expense</button><button type="button" className={kind === 'Income' ? 'chosen income-choice' : ''} onClick={() => { const selectedMethod = savedPaymentMethods.find((method) => String(method.userMethodId) === paymentMethodId); if (selectedMethod?.groupId === 'credit') setPaymentMethodId(String(savedPaymentMethods.find((method) => method.groupId === 'cash')?.userMethodId || '')); setKind('Income') }}><ArrowDownLeft size={16}/>Income</button></div>
      <label className="field-label">{isCreditCardPayment ? 'Payment amount' : 'Amount'}<input required min="0.01" max={isCreditCardPayment && selectedCreditCardTarget ? (selectedCreditCardTarget.debtMinor / 100).toFixed(2) : undefined} step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /><span className="currency-prefix">₱</span>{isCreditCardPayment && <small className="credit-payment-limit">Maximum: {selectedCreditCardTarget ? currency(selectedCreditCardTarget.debtMinor) : '₱0.00'}</small>}</label>
      <label className="field-label">What was it for?<input type="text" value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="modal-fields"><label className="field-label">Date<input required type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} /></label><label className="field-label">Category<MenuSelect value={categoryId} onChange={(value) => {
        setCategoryId(value)
        if (value === CREDIT_CARD_PAYMENT_CATEGORY) {
          const target = creditCardPaymentTargets.find((method) => method.debtMinor > 0) || creditCardPaymentTargets[0]
          const source = creditCardPaymentSources.find((method) => method.groupId === 'cash' && method.balanceMinor > 0) || creditCardPaymentSources.find((method) => method.groupId === 'debit' && method.balanceMinor > 0) || creditCardPaymentSources.find((method) => method.groupId === 'cash') || creditCardPaymentSources[0]
          setCreditCardPaymentTargetId(String(target?.userMethodId || ''))
          setPaymentMethodId(String(source?.userMethodId || ''))
          setAmount('')
        }
      }} ariaLabel="Transaction category" options={[...categories.filter((entry) => entry.type === kind.toLowerCase()).map((entry) => ({ value: String(entry.id), label: entry.name })), ...(kind === 'Expense' && !editingTransaction ? [{ value: CREDIT_CARD_PAYMENT_CATEGORY, label: 'Credit card payment' }] : [])]}/></label></div>
      {!dismissedHelpTips.transaction && !editingTransaction && <div className="contextual-help-tip transaction-entry-tip" role="note"><span>Choose a category and payment method. Use Credit card payment for repayments.</span><button type="button" aria-label="Dismiss transaction tip" onClick={() => dismissHelpTip('transaction')}><X size={13}/></button></div>}
      {isCreditCardPayment ? <>
        <div className="modal-fields"><label className="field-label">Credit card<MenuSelect value={creditCardPaymentTargetId} onChange={(value) => {
          setCreditCardPaymentTargetId(value)
          const target = creditCardPaymentTargets.find((method) => String(method.userMethodId) === value)
          if (target && Number(amount) > target.debtMinor / 100) setAmount((target.debtMinor / 100).toFixed(2))
        }} ariaLabel="Credit card to pay" options={[{ value: '', label: 'Choose a credit card' }, ...creditCardPaymentTargets.map((method) => ({ value: String(method.userMethodId), label: paymentMethodDisplayName(method), description: `Debt ${currency(method.debtMinor)}` }))]}/></label><label className="field-label">Pay from<MenuSelect value={paymentMethodId} onChange={setPaymentMethodId} ariaLabel="Pay from" options={[{ value: '', label: 'Choose cash or debit card' }, ...availablePaymentMethodsFirst(creditCardPaymentSources).map((method) => ({ value: String(method.userMethodId), label: method.groupId === 'cash' ? 'Cash' : paymentMethodDisplayName(method), description: paymentMethodSpendableMinor(method) > 0 ? `Balance ${currency(paymentMethodSpendableMinor(method))}` : 'No balance', disabled: paymentMethodSpendableMinor(method) <= 0 }))]}/></label></div>
        {selectedCreditCardTarget?.debtMinor <= 0 && <p className="credit-payment-limit">This card has no debt to pay.</p>}
      </> : <label className="field-label">Paid with<MenuSelect value={paymentMethodId} onChange={setPaymentMethodId} ariaLabel="Paid with" options={[...(editingTransaction && paymentMethodId.startsWith('legacy:') ? [{ value: paymentMethodId, label: editingTransaction.paymentMethodName }] : []), ...availablePaymentMethodsFirst(savedPaymentMethods.filter((method) => kind !== 'Income' || method.groupId !== 'credit')).map((method) => ({ value: String(method.userMethodId), label: paymentMethodDisplayName(method), description: paymentMethodSpendableMinor(method) > 0 ? `${method.groupId === 'credit' ? 'Available' : 'Balance'} ${currency(paymentMethodSpendableMinor(method))}` : 'No balance', disabled: kind === 'Expense' && paymentMethodSpendableMinor(method) <= 0 })) , ...(!savedPaymentMethods.some((method) => method.groupId === 'cash') ? [{ value: '', label: 'Cash', description: 'No balance', disabled: true }] : [])]}/></label>}
      {transactionError && <div className="auth-alert error" role="alert">{transactionError}</div>}
      <button className="primary-button save-button" type="submit" disabled={transactionBusy || (isCreditCardPayment && (!selectedCreditCardTarget || selectedCreditCardTarget.debtMinor <= 0 || !creditCardPaymentSources.some((method) => String(method.userMethodId) === paymentMethodId)))}><Plus size={17}/> {transactionBusy ? 'Saving…' : editingTransaction ? 'Save changes' : isCreditCardPayment ? 'Pay credit card' : 'Save transaction'}</button>
    </form></div>}
    {showBudgetForm && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowBudgetForm(false)}><form className="add-modal" onSubmit={saveBudget}><div className="modal-title"><div><span className="eyebrow">BUDGET LIMIT</span><h2>Set a budget</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setShowBudgetForm(false)}><X size={19}/></button></div><p className="page-subtitle">This limit applies to {cycleLabel}.</p><label className="field-label">Expense category<MenuSelect value={budgetCategoryId} onChange={setBudgetCategoryId} ariaLabel="Budget expense category" options={[{ value: '', label: 'Overall budget' }, ...categories.filter((entry) => entry.type === 'expense').map((entry) => ({ value: String(entry.id), label: entry.name }))]}/></label><label className="field-label">Limit amount<input required min="0.01" step="0.01" type="number" value={budgetLimit} onChange={(event) => setBudgetLimit(event.target.value)} /></label>{budgetError && <div className="auth-alert error" role="alert">{budgetError}</div>}<button className="primary-button save-button" type="submit"><Plus size={17}/> Save budget</button></form></div>}
    {showTutorial && <div className="tutorial-backdrop"><section className="tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" aria-describedby="tutorial-description"><div className="tutorial-header"><span className="eyebrow">GETTING STARTED</span><button type="button" className="tutorial-skip" onClick={closeTutorial}>Skip tutorial <X size={14}/></button></div><div className="tutorial-progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin="1" aria-valuemax={tutorialSteps.length} aria-valuenow={tutorialStep + 1}><span style={{ width: `${((tutorialStep + 1) / tutorialSteps.length) * 100}%` }}/></div><div className="tutorial-icon"><Sparkles size={19}/></div><div className="tutorial-step-label">{tutorialSteps[tutorialStep].eyebrow}</div><h2 id="tutorial-title">{tutorialSteps[tutorialStep].title}</h2><p className="tutorial-description" id="tutorial-description">{tutorialSteps[tutorialStep].body}</p><div className="tutorial-tip"><strong>Quick tip</strong><span>{tutorialSteps[tutorialStep].tip}</span></div><div className="tutorial-actions"><button type="button" className="secondary-button" onClick={() => setTutorialStep((step) => Math.max(0, step - 1))} disabled={tutorialStep === 0}>Back</button><span>{tutorialStep + 1} of {tutorialSteps.length}</span><button type="button" className="primary-button" onClick={() => tutorialStep === tutorialSteps.length - 1 ? closeTutorial() : setTutorialStep((step) => Math.min(tutorialSteps.length - 1, step + 1))}>{tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'} <span aria-hidden="true">→</span></button></div></section></div>}
  </div>
}

function BudgetRow({ color, icon, name, detail, percent, value, alert }) {
  return <div className="budget-row"><div className="budget-row-top"><span className={`budget-icon ${color}`}>{icon}</span><div className="budget-copy"><strong>{name}</strong><small>{detail}</small></div><span className={`budget-percent ${alert ? 'warning' : ''}`}>{value}</span></div><div className="budget-track"><span className={color} style={{ width: `${percent}%` }}/></div></div>
}

export default App

