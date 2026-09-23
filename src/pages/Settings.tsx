import { useState } from 'react'

type SettingsSection = 'general' | 'display' | 'notifications' | 'data'

export default function Settings() {
  const [section, setSection] = useState<SettingsSection>('general')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sections: { key: SettingsSection; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'display', label: 'Display' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'data', label: 'Data & export' },
  ]

  return (
    <>
      <div className="settlement-header">
        <div>
          <h1>Settings</h1>
          <p>Fine-tune how LokalLink works. Changes are stored on this device.</p>
        </div>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {sections.map((s) => (
            <button key={s.key} className={`settings-nav-item ${section === s.key ? 'active' : ''}`} onClick={() => setSection(s.key)}>{s.label}</button>
          ))}
        </nav>

        <div className="panel" style={{ padding: 24 }}>
          {section === 'general' && (
            <>
              <div className="settings-section">
                <h3>Reporting defaults</h3>
                <p>Core settings that affect calculations and reports.</p>
                <div className="settings-grid">
                  <div className="setting-item">
                    <label>Marketing week start</label>
                    <select defaultValue="monday">
                      <option value="monday">Monday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <label>Currency</label>
                    <select defaultValue="php">
                      <option value="php">PHP (₱)</option>
                      <option value="usd">USD ($)</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <label>Farmer share (%)</label>
                    <input type="number" defaultValue={70} min={0} max={100} />
                  </div>
                  <div className="setting-item">
                    <label>Attention threshold (days)</label>
                    <input type="number" defaultValue={21} min={0} />
                  </div>
                </div>
              </div>
            </>
          )}

          {section === 'display' && (
            <>
              <div className="settings-section">
                <h3>Appearance</h3>
                <p>Customize how the app looks and feels.</p>
                <div className="settings-grid">
                  <div className="setting-item">
                    <label>Theme</label>
                    <select defaultValue="light">
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <label>Language</label>
                    <select defaultValue="en">
                      <option value="en">English</option>
                      <option value="tl">Tagalog</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {section === 'notifications' && (
            <>
              <div className="settings-section">
                <h3>Alerts</h3>
                <p>Control what triggers notifications.</p>
                <div className="settings-grid">
                  <div className="setting-item">
                    <label>Low stock alerts</label>
                    <select defaultValue="on">
                      <option value="on">Enabled</option>
                      <option value="off">Disabled</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <label>Settlement reminders</label>
                    <select defaultValue="on">
                      <option value="on">Enabled</option>
                      <option value="off">Disabled</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <label>Attention farmer alerts</label>
                    <select defaultValue="on">
                      <option value="on">Enabled</option>
                      <option value="off">Disabled</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <label>Daily summary</label>
                    <select defaultValue="off">
                      <option value="on">Enabled</option>
                      <option value="off">Disabled</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {section === 'data' && (
            <>
              <div className="settings-section">
                <h3>Data management</h3>
                <p>Export or reset your local data.</p>
                <div className="settings-grid">
                  <div className="setting-item">
                    <label>Export data</label>
                    <button className="secondary-button" style={{ width: 'fit-content' }} onClick={() => alert('Export feature coming soon.')}>Export as JSON <span>↓</span></button>
                  </div>
                  <div className="setting-item">
                    <label>Reset demo data</label>
                    <button className="secondary-button" style={{ width: 'fit-content', color: 'var(--red)' }} onClick={() => { if (confirm('Reset all data to demo defaults?')) location.reload() }}>Reset <span>↺</span></button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="primary-button" onClick={handleSave}>
              {saved ? 'Saved ✓' : 'Save preferences'} <span>{saved ? '✓' : '→'}</span>
            </button>
            <span className="text-xs text-muted">Settings persist locally — no account needed.</span>
          </div>
        </div>
      </div>
    </>
  )
}
