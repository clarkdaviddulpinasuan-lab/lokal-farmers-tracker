import { useState } from 'react'
import { PageHeading } from '../components/ui'
import { useAppState, setMemberStatus, addMember, updateMember } from '../lib/store'
import type { Role, Member, Hub } from '../types'
import { humanDate, nowISO } from '../lib/calc'

function AddEditModal({ open, onClose, member, hubs }: { open: boolean; onClose: () => void; member?: Member; hubs: Hub[] }) {
  const [form, setForm] = useState({
    firstName: member?.firstName ?? '',
    lastName: member?.lastName ?? '',
    email: member?.email ?? '',
    password: member?.password ?? 'lokal123',
    role: (member?.role ?? 'Staff A') as Role,
    hubId: member?.hubId ?? '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (member) {
        await updateMember(member.id, { firstName: form.firstName, lastName: form.lastName, email: form.email, role: form.role, hubId: form.role === 'Admin' ? null : form.hubId || null })
      } else {
        await addMember({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, role: form.role, hubId: form.role === 'Admin' ? null : form.hubId || null })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save member.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="quick-modal" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-top">
          <div>
            <span className="eyebrow">{member ? 'Edit' : 'New'} member</span>
            <h2>{member ? 'Edit member' : 'Add a member'}</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-row">
            <label>First name<input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required /></label>
            <label>Last name<input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required /></label>
          </div>
          <label>Email<input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required /></label>
          {!member && <label>Password<input type="text" value={form.password} onChange={(e) => set('password', e.target.value)} required /></label>}
          <label>Role
            <select value={form.role} onChange={(e) => set('role', e.target.value as Role)}>
              <option value="Admin">Admin</option>
              <option value="Staff A">Staff A</option>
              <option value="Staff B">Staff B</option>
            </select>
          </label>
          {form.role !== 'Admin' && (
            <label>Assigned hub
              <select value={form.hubId} onChange={(e) => set('hubId', e.target.value)} required>
                <option value="">Select a hub</option>
                {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : member ? 'Save changes' : 'Add member'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Members() {
  const state = useAppState()
  const [editing, setEditing] = useState<Member | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  function hubName(hubId: string | null) {
    if (!hubId) return '—'
    return state.hubs.find((h) => h.id === hubId)?.name ?? '—'
  }

  async function toggleStatus(m: Member) {
    setError('')
    setBusyId(m.id)
    try {
      await setMemberStatus(m.id, m.status === 'Active' ? 'Inactive' : 'Active')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update member status.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <>
      <PageHeading
        eyebrow={`${humanDate(nowISO())} · System management`}
        title="Members"
        subtitle={`${state.members.length} accounts · ${state.members.filter((m) => m.status === 'Active').length} active.`}
        actions={
          <div className="heading-actions">
            <button className="primary-button" onClick={() => setShowAdd(true)}><span>+</span> Add member</button>
          </div>
        }
      />
      {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}
      <div className="panel">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0 22px 10px', borderBottom: '1px solid var(--border)', color: 'var(--faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.45px' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0 22px 10px', borderBottom: '1px solid var(--border)', color: 'var(--faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.45px' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '0 22px 10px', borderBottom: '1px solid var(--border)', color: 'var(--faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.45px' }}>Role</th>
              <th style={{ textAlign: 'left', padding: '0 22px 10px', borderBottom: '1px solid var(--border)', color: 'var(--faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.45px' }}>Hub</th>
              <th style={{ textAlign: 'left', padding: '0 22px 10px', borderBottom: '1px solid var(--border)', color: 'var(--faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.45px' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0 22px 10px', borderBottom: '1px solid var(--border)', color: 'var(--faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.45px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.members.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #f2f0f6' }}>
                <td style={{ padding: '14px 22px', fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{m.firstName} {m.lastName}</td>
                <td style={{ padding: '14px 22px', fontSize: 12, color: 'var(--muted)' }}>{m.email}</td>
                <td style={{ padding: '14px 22px' }}><span className={`role-badge role-${m.role.toLowerCase().replace(' ', '-')}`}>{m.role}</span></td>
                <td style={{ padding: '14px 22px', fontSize: 12, color: 'var(--muted)' }}>{hubName(m.hubId)}</td>
                <td style={{ padding: '14px 22px' }}><span className={`status ${m.status === 'Active' ? 'selling' : 'reserved'}`}><i />{m.status}</span></td>
                <td style={{ padding: '14px 22px', display: 'flex', gap: 6 }}>
                  <button className="text-button" onClick={() => setEditing(m)}>Edit</button>
                  <button className="text-button" disabled={busyId === m.id} onClick={() => toggleStatus(m)}>
                    {busyId === m.id ? 'Saving…' : m.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAdd || editing) && (
        <AddEditModal
          open
          onClose={() => { setShowAdd(false); setEditing(null) }}
          member={editing ?? undefined}
          hubs={state.hubs}
        />
      )}
    </>
  )
}
