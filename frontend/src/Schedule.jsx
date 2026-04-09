import React, { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL + '/api'

const CATEGORY_EMOJI = {
  Work: '💼', Study: '📚', Personal: '🏠',
  Health: '💪', Creative: '🎨', General: '📌'
}

const DIFFICULTY_COLOR = {
  Easy:   '#2e7d32',
  Medium: '#f57f17',
  Hard:   '#c62828',
}

const CATEGORY_BG = {
  Work:     '#e3f2fd',
  Study:    '#f3e5f5',
  Personal: '#e8f5e9',
  Health:   '#fce4ec',
  Creative: '#fff8e1',
  General:  '#f5f5f5',
}

const CATEGORY_BORDER = {
  Work:     '#1565c0',
  Study:    '#6a1b9a',
  Personal: '#2e7d32',
  Health:   '#c62828',
  Creative: '#f57f17',
  General:  '#616161',
}

function Schedule() {
  const [tasks, setTasks]             = useState([])
  const [schedule, setSchedule]       = useState([])
  const [startHour, setStartHour]     = useState(9)
  const [finalized, setFinalized]     = useState(false)
  const [aiFeedback, setAiFeedback]   = useState(null)
  const [totalHours, setTotalHours]   = useState(0)
  const [loading, setLoading]         = useState(false)
  const [validating, setValidating]   = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [orderList, setOrderList]     = useState([])
  const [dragIdx, setDragIdx]         = useState(null)

  useEffect(() => {
    fetchPendingTasks()
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  async function fetchPendingTasks() {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/tasks`)
      const data = await res.json()
      const pending = data.filter(t => t.status === 'pending')
      setTasks(pending)
      setOrderList(pending.map(t => t.id))
      setFinalized(false)
      setSchedule([])
      setAiFeedback(null)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function buildSchedule(orderedTasks, startH) {
    let cursor = startH * 60 // minutes from midnight
    return orderedTasks.map(task => {
      const durationMins = Math.round((task.estimated_time || 1) * 60)
      const block = {
        ...task,
        startMin:    cursor,
        endMin:      cursor + durationMins,
        startLabel:  minsToTime(cursor),
        endLabel:    minsToTime(cursor + durationMins),
        durationMins,
      }
      cursor += durationMins + 10 // 10 min break between tasks
      return block
    })
  }

  function minsToTime(mins) {
    const h = Math.floor(mins / 60) % 24
    const m = mins % 60
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12  = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  function getOrderedTasks() {
    return orderList
      .map(id => tasks.find(t => t.id === id))
      .filter(Boolean)
  }

  async function handleFinalize() {
    const ordered = getOrderedTasks()
    if (!ordered.length) return alert('No pending tasks to schedule.')
    setValidating(true)
    setAiFeedback(null)

    const built = buildSchedule(ordered, startHour)
    setSchedule(built)
    setTotalHours(built.reduce((s, t) => s + t.estimated_time, 0))
    setFinalized(true)

    // Ask AI to validate
    try {
      const res = await fetch(`${API}/day/validate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tasks: ordered })
      })
      const data = await res.json()
      setAiFeedback(data.feedback)
    } catch (e) { console.error(e) }
    finally { setValidating(false) }
  }

  function handleReset() {
    setFinalized(false)
    setSchedule([])
    setAiFeedback(null)
  }

  //Drag to reorder
  function onDragStart(idx) { setDragIdx(idx) }
  function onDragOver(e, idx) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const newOrder = [...orderList]
    const [moved]  = newOrder.splice(dragIdx, 1)
    newOrder.splice(idx, 0, moved)
    setOrderList(newOrder)
    setDragIdx(idx)
  }
  function onDragEnd() { setDragIdx(null) }

  // Progress: what % of the day is done
  const nowMins       = currentTime.getHours() * 60 + currentTime.getMinutes()
  const dayStartMins  = startHour * 60
  const dayEndMins    = schedule.length ? schedule[schedule.length - 1].endMin : dayStartMins + 480
  const dayProgress   = finalized
    ? Math.min(100, Math.max(0, Math.round(((nowMins - dayStartMins) / (dayEndMins - dayStartMins)) * 100)))
    : 0

  const orderedTasks = getOrderedTasks()

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc', fontFamily: 'system-ui, sans-serif' }}>

      {/* HEADER */}
      <div className="app-header">
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>🗓 Day Schedule</h2>
        <p style={{ margin: '4px 0 0', fontSize: '17px', color: '#9b9bc8' }}>
          Plan and visualize your day — AI validates your workload
        </p>
      </div>

      <div className="page-content">

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px', color: '#aaa' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#555' }}>No pending tasks</div>
            <div style={{ fontSize: '17px', marginTop: '6px' }}>Go to Tasks tab and add some tasks first.</div>
          </div>
        ) : (
          <>
            {/* CONTROLS */}
            {!finalized && (
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '17px', marginBottom: '4px' }}>⚙️ Schedule Settings</div>
                    <div style={{ fontSize: '16px', color: '#888' }}>Drag tasks below to reorder them</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '17px', color: '#555', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Start time:
                      <select
                        value={startHour}
                        onChange={e => setStartHour(Number(e.target.value))}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '17px' }}
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 5).map(h => (
                          <option key={h} value={h}>
                            {h === 12 ? '12:00 PM' : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button onClick={handleFinalize} disabled={validating} style={{
                      padding: '10px 24px',
                      background: validating ? '#9fa8da' : '#3f51b5',
                      color: '#fff', border: 'none', borderRadius: '8px',
                      fontSize: '16px', fontWeight: 600,
                      cursor: validating ? 'not-allowed' : 'pointer',
                      minWidth: '180px'
                    }}>
                      {validating ? '🤖 AI Reviewing...' : '✅ Finalize Day Plan'}
                    </button>
                  </div>
                </div>

                {/* DRAG TO REORDER */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '16px', color: '#888', marginBottom: '8px', fontWeight: 600 }}>
                    TASK ORDER — drag to rearrange
                  </div>
                  {orderedTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => onDragStart(idx)}
                      onDragOver={e => onDragOver(e, idx)}
                      onDragEnd={onDragEnd}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 14px', marginBottom: '8px',
                        background: dragIdx === idx ? '#e8eaf6' : '#fafafa',
                        borderRadius: '8px', border: '1px solid #e0e0e0',
                        cursor: 'grab', transition: 'background 0.15s'
                      }}
                    >
                      <span style={{ color: '#aaa', fontSize: '16px', userSelect: 'none' }}>⠿</span>
                      <span style={{ fontSize: '17px', fontWeight: 500, flex: 1 }}>
                        {CATEGORY_EMOJI[task.category] || '📌'} {task.title}
                      </span>
                      <span style={{ fontSize: '16px', color: '#888' }}>{task.estimated_time}h</span>
                      <span style={{
                        fontSize: '17px', padding: '2px 8px', borderRadius: '999px',
                        background: CATEGORY_BG[task.category] || '#f5f5f5',
                        color: CATEGORY_BORDER[task.category] || '#616161',
                        border: `1px solid ${CATEGORY_BORDER[task.category] || '#ccc'}`
                      }}>{task.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FINALIZED SCHEDULE */}
            {finalized && (
              <>
                {/* Summary bar */}
                <div className="grid-3">
                  {[
                    { label: 'Tasks planned', value: schedule.length, color: '#3f51b5' },
                    { label: 'Total hours',   value: `${totalHours.toFixed(1)}h`, color: '#00897b' },
                    { label: 'Day progress',  value: `${dayProgress}%`, color: '#f57f17' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: '#fff', borderRadius: '12px', padding: '16px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '16px', color: '#888', marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Day progress bar */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#888', marginBottom: '8px' }}>
                    <span>Day starts: {minsToTime(dayStartMins)}</span>
                    <span style={{ fontWeight: 600, color: '#3f51b5' }}>{dayProgress}% of day elapsed</span>
                    <span>Day ends: {minsToTime(dayEndMins)}</span>
                  </div>
                  <div style={{ height: '10px', background: '#e8eaf6', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${dayProgress}%`,
                      background: 'linear-gradient(90deg, #3f51b5, #7986cb)',
                      borderRadius: '999px', transition: 'width 0.5s'
                    }}/>
                  </div>
                </div>

                {/* AI Feedback */}
                {validating && (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', color: '#7986cb', fontSize: '16px' }}>
                    🤖 AI is reviewing your day plan...
                  </div>
                )}
                {aiFeedback && (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: '4px solid #2e7d32' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#2e7d32', marginBottom: '8px' }}>🤖 AI Coach Feedback</div>
                    <div style={{ fontSize: '16px', color: '#333', lineHeight: '1.7' }}>{aiFeedback}</div>
                  </div>
                )}

                {/* ── TIMELINE ── */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <div style={{ fontWeight: 600, fontSize: '17px', marginBottom: '16px' }}>📅 Your Day Timeline</div>

                  {schedule.map((block, idx) => {
                    const widthPct  = Math.min(100, Math.max(8, (block.durationMins / ((dayEndMins - dayStartMins) || 480)) * 100))
                    const offsetPct = ((block.startMin - dayStartMins) / ((dayEndMins - dayStartMins) || 480)) * 100
                    const isNow     = nowMins >= block.startMin && nowMins < block.endMin
                    const isPast    = nowMins >= block.endMin

                    return (
                      <div key={block.id} style={{ marginBottom: '16px' }}>
                        {/* Label row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '16px', color: '#888', minWidth: '80px' }}>
                            {block.startLabel}
                          </span>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e' }}>
                            {CATEGORY_EMOJI[block.category] || '📌'} {block.title}
                          </span>
                          <span style={{ fontSize: '17px', color: '#888' }}>→ {block.endLabel}</span>
                          {isNow && (
                            <span style={{ fontSize: '17px', background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                              🟢 NOW
                            </span>
                          )}
                          {isPast && (
                            <span style={{ fontSize: '17px', color: '#aaa' }}>completed window</span>
                          )}
                        </div>

                        {/* Timeline bar */}
                        <div style={{ position: 'relative', height: '36px', background: '#f5f5f5', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{
                            position: 'absolute',
                            left: `${offsetPct}%`,
                            width: `${widthPct}%`,
                            height: '100%',
                            background: isPast
                              ? '#e0e0e0'
                              : isNow
                                ? `linear-gradient(90deg, ${CATEGORY_BORDER[block.category] || '#3f51b5'}, ${CATEGORY_BG[block.category] || '#e8eaf6'})`
                                : CATEGORY_BG[block.category] || '#e8eaf6',
                            borderLeft: `4px solid ${CATEGORY_BORDER[block.category] || '#3f51b5'}`,
                            borderRadius: '0 6px 6px 0',
                            display: 'flex', alignItems: 'center', paddingLeft: '10px',
                            transition: 'all 0.3s'
                          }}>
                            <span style={{
                              fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap',
                              color: CATEGORY_BORDER[block.category] || '#3f51b5',
                              overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                              {block.estimated_time}h
                            </span>
                          </div>

                          {/* Indicator line */}
                          {isNow && (
                            <div style={{
                              position: 'absolute',
                              left: `${((nowMins - dayStartMins) / (dayEndMins - dayStartMins)) * 100}%`,
                              top: 0, bottom: 0, width: '2px',
                              background: '#f44336', zIndex: 2
                            }}/>
                          )}
                        </div>

                        {/* Difficulty dot + break indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: DIFFICULTY_COLOR[block.difficulty] || '#888', display: 'inline-block' }}/>
                          <span style={{ fontSize: '17px', color: '#aaa' }}>{block.difficulty} difficulty</span>
                          {idx < schedule.length - 1 && (
                            <span style={{ fontSize: '17px', color: '#ccc', marginLeft: '8px' }}>+ 10 min break</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Reset button */}
                <div style={{ textAlign: 'center' }}>
                  <button onClick={handleReset} style={{
                    padding: '10px 24px', background: 'none',
                    border: '1.5px solid #e0e0e0', borderRadius: '8px',
                    color: '#888', fontSize: '17px', cursor: 'pointer'
                  }}>
                    ↺ Re-plan Day
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Schedule