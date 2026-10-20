import { ArrowUpRight, Check, CreditCard, Eye, EyeOff, LockKeyhole, Moon, Sun, Wallet } from 'lucide-react'
import resiboLogo from '../logo1.png'

export function validateEmail(value) {
  const email = String(value || '').trim()
  if (!email) return 'Email address is required.'
  if (email.length > 254 || !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(email)) return 'Enter a valid email address.'
  return ''
}

export function validatePassword(value) {
  if (String(value || '').length < 12) return 'Use at least 12 characters.'
  if (String(value || '').length > 128) return 'Password must be 128 characters or fewer.'
  return ''
}

export function passwordsMatch(password, confirmation) {
  return Boolean(confirmation) && password === confirmation
}

/**
 * @param {{ id: string, inputRef?: import('react').RefObject<HTMLInputElement>, label: string, labelAccessory?: import('react').ReactNode, value: string, onChange: (event: import('react').ChangeEvent<HTMLInputElement>) => void, onBlur?: () => void, disabled?: boolean, autoComplete: string, visible: boolean, onToggleVisibility: () => void, error?: string, requirement?: boolean, requirementMet?: boolean, feedback?: { kind: 'match' | 'mismatch', text: string } | null }} props
 */
export function PasswordField({
  id,
  inputRef,
  label,
  labelAccessory,
  value,
  onChange,
  onBlur,
  disabled = false,
  autoComplete,
  visible,
  onToggleVisibility,
  error = '',
  requirement = false,
  requirementMet = false,
  feedback,
}) {
  const errorId = `${id}-error`
  const requirementId = `${id}-requirement`
  const feedbackId = `${id}-feedback`
  const describedBy = [requirement && requirementId, feedback && feedbackId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="auth-field">
      <div className="auth-field-label-row"><label htmlFor={id}>{label}</label>{labelAccessory}</div>
      <span className="password-wrap">
        <input
          id={id}
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          maxLength={128}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error || feedback?.kind === 'mismatch')}
        />
        <button
          type="button"
          className="password-visibility"
          onClick={onToggleVisibility}
          disabled={disabled}
          aria-label={visible ? 'Hide passwords' : 'Show passwords'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
          <span>{visible ? 'Hide' : 'Show'}</span>
        </button>
      </span>
      {requirement && <small id={requirementId} className={`password-requirement${requirementMet ? ' met' : ''}`} aria-live="polite">
        {requirementMet && <Check size={13} aria-hidden="true" />}
        <span>At least 12 characters</span>
      </small>}
      {feedback && <small id={feedbackId} className={`password-feedback ${feedback.kind}`} aria-live="polite">
        {feedback.kind === 'match' && <Check size={13} aria-hidden="true" />}{feedback.text}
      </small>}
      {error && <small id={errorId} className="auth-field-error">{error}</small>}
    </div>
  )
}

/** @param {{ theme: 'dark' | 'light', onToggleTheme: () => void, showDeveloperCredit: boolean, onShowDeveloperCredit: () => void, children: import('react').ReactNode }} props */
export function AuthLayout({ theme, onToggleTheme, showDeveloperCredit, onShowDeveloperCredit, children }) {
  return (
    <main className="auth-screen">
      <section className="auth-story">
        <a className="brand auth-brand" href="#home" aria-label="Resibo home">
          <span className="brand-mark"><img src={resiboLogo} alt="" /></span><span>Resibo</span>
        </a>
        <div className="auth-story-copy">
          <div className="eyebrow">A LITTLE MORE CLARITY</div>
          <h1>Your money,<br /><em>in view.</em></h1>
          <p>A calmer way to track everyday spending, plan your budget, and see where your money goes.</p>
          <ul className="auth-benefits" aria-label="Resibo benefits">
            <li><span className="auth-benefit-icon"><CreditCard size={15} aria-hidden="true" /></span><span>Track everyday spending</span></li>
            <li><span className="auth-benefit-icon"><Wallet size={15} aria-hidden="true" /></span><span>Plan budgets that fit</span></li>
            <li><span className="auth-benefit-icon"><ArrowUpRight size={15} aria-hidden="true" /></span><span>See where your money goes</span></li>
          </ul>
        </div>
        <div className="auth-story-foot">
          <button type="button" className="auth-story-credit" aria-expanded={showDeveloperCredit} onClick={onShowDeveloperCredit}>
            {showDeveloperCredit ? 'Developer: carinokarlos' : 'Made in the Philippines'}
          </button>
        </div>
      </section>
      <section className="auth-form-side">
        <button className="theme-toggle auth-theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}<span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><span className="brand-mark"><img src={resiboLogo} alt="" /></span><span>Resibo</span></div>
          {children}
        </div>
      </section>
    </main>
  )
}

export function AuthSecureFooter() {
  return <div className="auth-security"><LockKeyhole size={13} aria-hidden="true" /><span>Your account is protected with a secure session.</span></div>
}
