import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Check, Star } from 'lucide-react'
import { login } from '../lib/store'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  async function quickLogin(acctEmail: string, pw: string) {
    setError('')
    setLoading(true)
    try {
      await login(acctEmail, pw)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  function googleDisabled() {
    setError('Google sign-in is not configured for this project. Use email/password or a demo account below.')
  }

  const features = [
    { text: 'Track farmer consignments across hubs in real time' },
    { text: 'Automated market pricing and settlement reports' },
    { text: 'Role-based access for Admin, Staff A, and Staff B' },
  ]

  return (
    <div className="login-split">
      <div className="login-left">
        <div className="login-form-wrap">
          <div className="login-brand">
            <div className="login-brand-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="12" r="2.5" />
                <circle cx="18" cy="6" r="2.5" />
                <circle cx="18" cy="18" r="2.5" />
                <path d="M8.5 12h3l5-4.5" />
                <path d="M8.5 12h3l5 5.5" />
              </svg>
            </div>
            <span className="login-brand-name">LokalLink</span>
          </div>

          <div className="login-header">
            <h1>Log in to your account</h1>
            <p>Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={submit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <div className="login-input-wrap">
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="login-checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember for 30 days</span>
              </label>
              <button type="button" className="login-forgot">Forgot password?</button>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? <Loader2 size={18} className="spin" /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="login-divider"><span>or</span></div>

          <button type="button" className="login-google-btn" onClick={googleDisabled}>
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div className="login-demo-accounts" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Test accounts (password: lokal123)</p>
            <button type="button" className="secondary-button" disabled={loading} onClick={() => quickLogin('admin@example.com', 'lokal123')}>
              Demo Admin
            </button>
            <button type="button" className="secondary-button" disabled={loading} onClick={() => quickLogin('staffa@example.com', 'lokal123')}>
              Demo Staff A (Hub A)
            </button>
            <button type="button" className="secondary-button" disabled={loading} onClick={() => quickLogin('staffb@example.com', 'lokal123')}>
              Demo Staff B (Hub B)
            </button>
          </div>

          <p className="login-footer">
            Accounts are created by an Admin in Members.
          </p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-feature-card">
          <div className="login-feature-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2>LokalLink Hub Operations</h2>
          <p className="login-feature-subtitle">Manage your farmer-to-market workflow from a single dashboard.</p>

          <ul className="login-feature-list">
            {features.map((f, i) => (
              <li key={i}>
                <span className="login-feature-check"><Check size={14} /></span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>

          <div className="login-testimonial">
            <div className="login-testimonial-stars">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
            </div>
            <p>&ldquo;LokalLink cut our settlement time from 3 days to same-day. The hub workflow is seamless.&rdquo;</p>
            <div className="login-testimonial-author">
              <div className="login-testimonial-avatar">CS</div>
              <div>
                <strong>Clark Suan</strong>
                <span>Hub A Staff, General Luna</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
