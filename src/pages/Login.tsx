import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Check, Star } from 'lucide-react'
import { createAccount, login, needsSetup, INVITE_ONLY_MESSAGE } from '../lib/store'

type LoginView = 'login' | 'create'
type SetupProbe = 'checking' | 'open' | 'invite' | 'error'

export default function Login() {
  const navigate = useNavigate()
  const [view, setView] = useState<LoginView>('login')
  const [probe, setProbe] = useState<SetupProbe>('checking')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setProbe('checking')
      const needed = await needsSetup()
      if (cancelled) return
      if (needed === true) {
        setProbe('open')
        setView('create')
      } else if (needed === null) {
        setProbe('error')
      } else {
        setProbe('invite')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function showCreate() {
    setError('')
    setView('create')
    void (async () => {
      setProbe('checking')
      const needed = await needsSetup()
      if (needed === true) setProbe('open')
      else if (needed === null) setProbe('error')
      else setProbe('invite')
    })()
  }

  function showLogin() {
    setError('')
    setView('login')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (view === 'create') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }
        await createAccount({ email, password, firstName, lastName })
      } else {
        await login(email, password)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : view === 'create' ? 'Could not create account.' : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { text: 'Track farmer consignments across hubs in real time' },
    { text: 'Automated market pricing and settlement reports' },
    { text: 'Role-based access for Admin, Staff A, and Staff B' },
  ]

  const createDisabled = loading || probe === 'checking' || probe === 'invite' || probe === 'error'
  const isSetupCreate = view === 'create' && probe === 'open'

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
            <h1>
              {view === 'create'
                ? isSetupCreate
                  ? 'Create first Admin'
                  : 'Create an account'
                : 'Log in to your account'}
            </h1>
            <p>
              {view === 'create'
                ? isSetupCreate
                  ? 'No members yet. Create the Admin account to start adding staff.'
                  : 'Set up your name, email, and password.'
                : 'Welcome back! Please enter your details.'}
            </p>
          </div>

          <form onSubmit={submit} className="login-form">
            {probe === 'error' && (
              <p className="login-notice login-notice--warn">
                Could not check setup. Run supabase/reset_demo_data.sql (or lokalink_full_setup.sql), then reload.
              </p>
            )}

            {view === 'create' && probe === 'invite' && (
              <p className="login-notice">{INVITE_ONLY_MESSAGE}</p>
            )}

            {view === 'create' && probe === 'open' && (
              <div className="modal-row">
                <div className="login-field">
                  <label htmlFor="login-first">First name</label>
                  <div className="login-input-wrap">
                    <input
                      id="login-first"
                      type="text"
                      placeholder="Admin"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="login-field">
                  <label htmlFor="login-last">Last name</label>
                  <div className="login-input-wrap">
                    <input
                      id="login-last"
                      type="text"
                      placeholder="User"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {!(view === 'create' && probe === 'invite') && (
              <>
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
                      placeholder={view === 'create' ? 'At least 8 characters' : 'Enter your password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={view === 'create' ? 8 : undefined}
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

                {view === 'create' && (
                  <div className="login-field">
                    <label htmlFor="login-confirm">Confirm password</label>
                    <div className="login-input-wrap">
                      <input
                        id="login-confirm"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                    </div>
                  </div>
                )}

                {view === 'login' && (
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
                )}
              </>
            )}

            {error && <p className="login-error">{error}</p>}

            {view === 'create' && probe === 'invite' && (
              <button type="button" className="login-submit" onClick={showLogin}>
                Back to sign in
              </button>
            )}

            {!(view === 'create' && probe === 'invite') && (
              <button
                type="submit"
                className="login-submit"
                disabled={loading || probe === 'checking' || (view === 'create' && createDisabled)}
              >
                {loading || (view === 'create' && probe === 'checking') ? <Loader2 size={18} className="spin" /> : null}
                {loading
                  ? view === 'create' ? 'Creating account…' : 'Signing in...'
                  : view === 'create'
                    ? probe === 'checking'
                      ? 'Checking…'
                      : isSetupCreate
                        ? 'Create Admin account'
                        : 'Create account'
                    : 'Sign in'}
              </button>
            )}
          </form>

          <div className="login-mode-switch">
            {view === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button type="button" onClick={showCreate}>Create an account</button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={showLogin}>Sign in</button>
              </>
            )}
          </div>

          <p className="login-footer">
            {view === 'create'
              ? isSetupCreate
                ? 'After creating Admin, add Staff A / Staff B from Members.'
                : 'Self-serve signup is invite-only — your Admin adds you in Members.'
              : 'First visit? Create the Admin account. Otherwise sign in.'}
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
