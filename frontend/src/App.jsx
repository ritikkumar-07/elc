
import { useState } from 'react'
import './App.css'

const roles = [
  { id: 'admin', label: 'Director / Admin', icon: '⌘' },
  { id: 'teacher', label: 'Teacher', icon: '▤' },
  { id: 'student', label: 'Student', icon: '♙' },
]

function App() {
  const [role, setRole] = useState('student')
  const [notice, setNotice] = useState('')

  const isStudent = role === 'student'

  function handleSubmit(event) {
    event.preventDefault()
    setNotice(
      'Login is not connected yet. Backend authentication will be added in a later step.'
    )
  }

  function changeRole(nextRole) {
    setRole(nextRole)
    setNotice('')
  }

  return (
    <main className="login-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="site-header">
        <a className="brand" href="#home" aria-label="ELC Portal home">
          <span className="brand-mark">E</span>
          <span className="brand-copy">
            <strong>ELC Portal</strong>
            <small>EXPERT LEARNING CENTER</small>
          </span>
        </a>

        <div className="secure-label">
          <span className="secure-dot" />
          INSTITUTE PORTAL
        </div>
      </header>

      <section className="login-layout" id="home">
        <div className="intro-panel">
          <div className="intro-content">
            <span className="eyebrow">
              YOUR LEARNING JOURNEY, ORGANIZED
            </span>

            <h1>
              Everything you need.
              <br />
              <span>All in one place.</span>
            </h1>

            <p className="intro-description">
              Your institute's home for upcoming tests, academic results
              and learning resources. Simple, organized and accessible.
            </p>

            <div className="preview-card">
              <div className="preview-top">
                <div className="preview-icon">✦</div>
                <div>
                  <strong>Your academic space</strong>
                  <p>Designed around your learning</p>
                </div>
                <span className="preview-arrow">↗</span>
              </div>

              <div className="preview-divider" />

              <div className="preview-features">
                <div>
                  <span className="mini-icon mini-blue">▤</span>
                  <span>
                    <strong>Upcoming tests</strong>
                    <small>Know what's next</small>
                  </span>
                </div>

                <div>
                  <span className="mini-icon mini-purple">↗</span>
                  <span>
                    <strong>Results & progress</strong>
                    <small>Follow your growth</small>
                  </span>
                </div>

                <div>
                  <span className="mini-icon mini-green">▣</span>
                  <span>
                    <strong>Study materials</strong>
                    <small>Resources in one place</small>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="intro-footer">
            <span className="footer-star">✳</span>
            Built for focused learning.
          </div>
        </div>

        <div className="form-panel">
          <div className="login-card">
            <div className="mobile-brand-mark">E</div>

            <div className="form-heading">
              <span className="eyebrow">WELCOME TO ELC</span>
              <h2>Sign in to your portal</h2>
              <p>Choose your account type to continue.</p>
            </div>

            <div className="role-selector" aria-label="Choose account type">
              {roles.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`role-option ${role === item.id ? 'selected' : ''}`}
                  aria-pressed={role === item.id}
                  onClick={() => changeRole(item.id)}
                >
                  <span className="role-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="selected-role-label">
                <span className="selected-indicator" />
                {roles.find((item) => item.id === role)?.label} access
              </div>

              {isStudent ? (
                <>
                  <label htmlFor="rollNumber">Student roll number</label>
                  <input
                    id="rollNumber"
                    name="rollNumber"
                    type="text"
                    placeholder="Enter your roll number"
                    autoComplete="username"
                    required
                  />

                  <label htmlFor="studentPin">Security PIN</label>
                  <input
                    id="studentPin"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    placeholder="Enter your PIN"
                    autoComplete="current-password"
                    required
                  />

                  <p className="field-hint">
                    Use the credentials provided by your institute.
                  </p>
                </>
              ) : (
                <>
                  <label htmlFor="username">
                    {role === 'admin' ? 'Admin username' : 'Teacher username'}
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    autoComplete="username"
                    required
                  />

                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />

                  <p className="field-hint">
                    Access is provided by your institute administrator.
                  </p>
                </>
              )}

              <button className="sign-in-button" type="submit">
                Continue to portal
                <span aria-hidden="true">→</span>
              </button>

              {notice && (
                <p className="login-notice" role="status">
                  {notice}
                </p>
              )}
            </form>

            <div className="login-security">
              <span className="lock-icon">◇</span>
              <span>Your account access is managed by your institute.</span>
            </div>
          </div>

          <p className="form-footer">
            Need help accessing your account? Contact your institute.
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Expert Learning Center</span>
        <span>Learning with clarity. Growing with confidence.</span>
      </footer>
    </main>
  )
}

export default App
