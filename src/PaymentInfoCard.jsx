import { Banknote, CreditCard, Wallet } from 'lucide-react'

const formatPeso = (minorUnits) => {
  const value = Number(minorUnits)
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue / 100)
}

const textValue = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback
  const text = String(value).trim()
  return text && text !== 'undefined' && text !== 'null' ? text : fallback
}

const accountName = (item) => textValue(item.issuer, textValue(item.name, 'E-wallet'))
const bankName = (item) => textValue(item.issuer, textValue(item.name, 'Bank'))
const spentThisCycle = (item) => formatPeso(item.cycleSpendMinor)

const paymentInfoConfig = {
  ewallet: (item) => ({
    title: `${accountName(item)} wallet`,
    lines: [
      { text: `Available balance ${formatPeso(item.balanceMinor)}` },
      { text: `Spent this cycle ${spentThisCycle(item)} · Last activity: ${textValue(item.lastActivity, 'No transactions yet')}` },
    ],
    icon: Wallet,
  }),
  debit: (item) => ({
    title: `${bankName(item)} debit`,
    lines: [
      {
        text: `Ending in ${textValue(item.lastFour, 'Not added')}`,
        title: 'Only the last four digits are stored; full card numbers are never collected.',
      },
      { text: `Spent this cycle ${spentThisCycle(item)} · Linked account: ${textValue(item.linkedAccount ?? item.linked_account, 'Not linked')}` },
    ],
    icon: CreditCard,
  }),
  credit: (item) => ({
    title: `${bankName(item)} credit`,
    lines: [
      {
        text: `Ending in ${textValue(item.lastFour, 'Not added')}`,
        title: 'Only the last four digits are stored; full card numbers are never collected.',
      },
      { text: `Used ${formatPeso(item.debtMinor)} of ${formatPeso(item.creditLimitMinor)} · Due ${textValue(item.dueDate ?? item.due_date, 'No due date')}` },
    ],
    icon: CreditCard,
  }),
  cash: (item) => ({
    title: 'Cash on hand',
    lines: [
      { text: `Balance ${formatPeso(item.balanceMinor)}` },
      { text: `Spent this cycle ${spentThisCycle(item)}` },
    ],
    icon: Banknote,
  }),
}

export default function PaymentInfoCard({ type, item }) {
  const getInfo = paymentInfoConfig[type]
  if (!item || !getInfo) return null

  const { title, lines, icon: Icon } = getInfo(item)

  return (
    <div className="wallet-note">
      <span className="wallet-note-icon"><Icon size={15} /></span>
      <p>
        <strong>{title}</strong>
        {lines.map((line) => (
          <span key={line.text} title={line.title}>{line.text}</span>
        ))}
      </p>
    </div>
  )
}
