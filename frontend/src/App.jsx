import React, { useEffect, useState } from 'react'
import Schedule from './Schedule'
import Report from './Report'

const API = import.meta.env.VITE_API_URL + '/api'

const DIFFICULTY_COLOR = {
  Easy:   { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
  Medium: { bg: '#fff8e1', text: '#f57f17', border: '#ffe082' },
  Hard:   { bg: '#fce4ec', text: '#c62828', border: '#f48fb1' },
}

const CATEGORY_EMOJI = {
  Work: '💼', Study: '📚', Personal: '🏠',
  Health: '💪', Creative: '🎨', General: '📌'
}

const STATUS_CONFIG = {
  pending: { label: 'Pending',  bg: '#f5f5f5', text: '#616161' },
  done:    { label: 'Done',     bg: '#e8f5e9', text: '#2e7d32' },
  partial: { label: 'Partial',  bg: '#fff3e0', text: '#e65100' },
  skipped: { label: 'Skipped',  bg: '#fce4ec', text: '#b71c1c' },
}

function Badge({ text, style }) {
  return (
    <span style={{
      fontSize: '13px', fontWeight: 600, padding: '2px 8px',
      borderRadius: '999px', border: '1px solid', ...style
    }}>{text}</span>
  )
}

function Tasks() {
  const [tasks, setTasks]             = useState([])
  const [title, setTitle]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [adding, setAdding]           = useState(false)
  const [aiLoading, setAiLoading]     = useState(false)
  const [dayFeedback, setDayFeedback] = useState(null)
  const [totalHours, setTotalHours]   = useState(0)
  const [filter, setFilter]           = useState('all')
  const [actualTimeInputs, setActualTimeInputs] = useState({})

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/tasks`)
      setTasks(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`${API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      if (res.ok) {
        const newTask = await res.json()
        setTasks(prev => [newTask, ...prev])
        setTitle('')
      }
    } catch (e) { console.error(e) }
    finally { setAdding(false) }
  }

  async function handleStatusChange(task, newStatus) {
    const body = { status: newStatus }
    const actualTime = actualTimeInputs[task.id]
    if (actualTime && newStatus !== 'pending') {
      body.actual_time = parseFloat(actualTime)
    }
    try {
      const res = await fetch(`${API}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        const updated = await res.json()
        setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
        setActualTimeInputs(prev => { const n = {...prev}; delete n[task.id]; return n })
      }
    } catch (e) { console.error(e) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this task?')) return
    const res = await fetch(`${API}/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function validateDay() {
    const pendingTasks = tasks.filter(t => t.status === 'pending')
    if (!pendingTasks.length) return alert('No pending tasks to validate.')
    setAiLoading(true)
    setDayFeedback(null)
    try {
      const res = await fetch(`${API}/day/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: pendingTasks })
      })
      const data = await res.json()
      setDayFeedback(data.feedback)
      setTotalHours(data.total_hours)
    } catch (e) { console.error(e) }
    finally { setAiLoading(false) }
  }

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const stats = {
    total:   tasks.length,
    done:    tasks.filter(t => t.status === 'done').length,
    partial: tasks.filter(t => t.status === 'partial').length,
    skipped: tasks.filter(t => t.status === 'skipped').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total',   value: stats.total,   color: '#3f51b5' },
          { label: 'Done',    value: stats.done,    color: '#2e7d32' },
          { label: 'Partial', value: stats.partial, color: '#e65100' },
          { label: 'Skipped', value: stats.skipped, color: '#b71c1c' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: '12px', padding: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '16px', color: '#888', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add task */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Add a new task — AI will analyze it instantly..."
            disabled={adding}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '8px',
              border: '1.5px solid #e0e0e0', fontSize: '16px', outline: 'none',
              background: adding ? '#fafafa' : '#fff'
            }}
          />
          <button type="submit" disabled={adding} style={{
            padding: '10px 20px', background: adding ? '#9fa8da' : '#3f51b5',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '16px', fontWeight: 600, cursor: adding ? 'not-allowed' : 'pointer',
            minWidth: '110px'
          }}>
            {adding ? '🤖 Analyzing...' : '+ Add Task'}
          </button>
        </form>
        {adding && (
          <p style={{ margin: '10px 0 0', fontSize: '16px', color: '#7986cb' }}>
            AI is reading your task — detecting category, difficulty & time estimate...
          </p>
        )}
      </div>

      {/* Day validator */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '17px' }}>🗓 Validate Today's Plan</div>
            <div style={{ fontSize: '16px', color: '#888', marginTop: '2px' }}>
              AI checks if your pending tasks are realistic for one day
            </div>
          </div>
          <button onClick={validateDay} disabled={aiLoading} style={{
            padding: '10px 20px', background: aiLoading ? '#80cbc4' : '#00897b',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '16px', fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer'
          }}>
            {aiLoading ? '🤖 Analyzing...' : 'Ask AI to Review'}
          </button>
        </div>
        {dayFeedback && (
          <div style={{ marginTop: '16px', padding: '14px 16px', background: '#e8f5e9', borderRadius: '8px', borderLeft: '4px solid #2e7d32' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#2e7d32', marginBottom: '6px' }}>
              🤖 AI Coach — {totalHours}h total planned
            </div>
            <div style={{ fontSize: '16px', color: '#333', lineHeight: '1.6' }}>{dayFeedback}</div>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'done', 'partial', 'skipped'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: '999px', border: '1.5px solid',
            borderColor: filter === f ? '#3f51b5' : '#e0e0e0',
            background: filter === f ? '#3f51b5' : '#fff',
            color: filter === f ? '#fff' : '#555',
            fontSize: '17px', fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize'
          }}>
            {f} {f !== 'all' ? `(${stats[f] ?? 0})` : `(${stats.total})`}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>No tasks here yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTasks.map(task => {
            const diff   = DIFFICULTY_COLOR[task.difficulty] || DIFFICULTY_COLOR.Medium
            const status = STATUS_CONFIG[task.status]        || STATUS_CONFIG.pending
            const emoji  = CATEGORY_EMOJI[task.category]    || '📌'

            return (
              <div key={task.id} style={{
                background: '#fff', borderRadius: '12px', padding: '16px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                borderLeft: `4px solid ${diff.border}`,
                opacity: task.status === 'skipped' ? 0.65 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '17px', fontWeight: 600, color: '#1a1a2e',
                        textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                        {emoji} {task.title}
                      </span>
                      <Badge text={task.category}  style={{ background: '#e8eaf6', color: '#283593', borderColor: '#c5cae9' }} />
                      <Badge text={task.difficulty} style={{ background: diff.bg, color: diff.text, borderColor: diff.border }} />
                      <Badge text={status.label}    style={{ background: status.bg, color: status.text, borderColor: status.bg }} />
                    </div>
                    {task.ai_suggestion && (
                      <div style={{ marginTop: '6px', fontSize: '16px', color: '#7986cb', fontStyle: 'italic' }}>
                        💡 {task.ai_suggestion}
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '16px', color: '#888', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span>⏱ Estimated: <strong>{task.estimated_time}h</strong></span>
                      {task.actual_time && <span>✅ Actual: <strong>{task.actual_time}h</strong></span>}
                      {task.actual_time && task.estimated_time && (
                        <span style={{ color: task.actual_time <= task.estimated_time ? '#2e7d32' : '#c62828' }}>
                          {task.actual_time <= task.estimated_time ? '🚀 Faster than estimated!' : '⏳ Took longer than expected'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(task.id)} style={{
                    background: 'none', border: 'none', color: '#ccc',
                    cursor: 'pointer', fontSize: '20px', padding: '0 4px', lineHeight: 1, flexShrink: 0
                  }}>✕</button>
                </div>

                {task.status === 'pending' && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="number" min="0.1" step="0.1"
                      placeholder="Actual hrs (optional)"
                      value={actualTimeInputs[task.id] || ''}
                      onChange={e => setActualTimeInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '16px', width: '160px' }}
                    />
                    {['done', 'partial', 'skipped'].map(s => (
                      <button key={s} onClick={() => handleStatusChange(task, s)} style={{
                        padding: '6px 14px', borderRadius: '6px', border: 'none',
                        fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                        background: s === 'done' ? '#2e7d32' : s === 'partial' ? '#e65100' : '#b71c1c',
                        color: '#fff'
                      }}>
                        {s === 'done' ? '✓ Done' : s === 'partial' ? '◑ Partial' : '✗ Skip'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tasks.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button onClick={async () => {
            if (!confirm('Clear all tasks?')) return
            await fetch(`${API}/tasks/clear`, { method: 'POST' })
            setTasks([])
          }} style={{
            padding: '8px 20px', background: 'none', border: '1px solid #e0e0e0',
            borderRadius: '8px', color: '#888', fontSize: '17px', cursor: 'pointer'
          }}>
            Clear All Tasks
          </button>
        </div>
      )}
    </div>
  )
}

//MAIN APP WITH TABS
function App() {
  const [activeTab, setActiveTab] = useState('tasks')

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '40px 32px 0' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 32px', fontSize: '42px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            ⚡ TaskFlow AI ⚡
          </h1>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'tasks',    label: '📋 Tasks' },
              { id: 'schedule', label: '🗓 Schedule' },
              { id: 'report',   label: '📊 Day Report' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '10px 98px', border: 'none', cursor: 'pointer',
                fontSize: '16px', fontWeight: 600, borderRadius: '8px 8px 0 0',
                background: activeTab === tab.id ? '#f7f8fc' : 'transparent',
                color:      activeTab === tab.id ? '#1a1a2e' : '#9b9bc8',
                transition: 'all 0.2s'
              }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'tasks'    && <Tasks />}
      {activeTab === 'schedule' && <Schedule />}
      {activeTab === 'report'   && <Report />}
    </div>
  )
}

export default App