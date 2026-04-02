import React, { useState } from 'react'

const API = import.meta.env.VITE_API_URL + '/api'

const CATEGORY_EMOJI = {
  Work: '💼', Study: '📚', Personal: '🏠',
  Health: '💪', Creative: '🎨', General: '📌'
}

const STATUS_COLOR = {
  done:    { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
  partial: { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  skipped: { bg: '#fce4ec', text: '#b71c1c', border: '#f48fb1' },
  pending: { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0' },
}

function StatCard({ value, label, color, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center'
    }}>
      <div style={{ fontSize: '32px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '16px', color: '#888', marginTop: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '17px', color: '#aaa', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

function Report() {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [email, setEmail]     = useState('')
  const [period, setPeriod]   = useState('daily')
  const [emailStatus, setEmailStatus] = useState(null)
  const [emailSending, setEmailSending] = useState(false)
  const [patterns, setPatterns]         = useState(null)
  const [patternsLoading, setPatternsLoading] = useState(false)


  async function sendEmail() {
    if (!email.trim() || !email.includes('@')) {
      setEmailStatus({ ok: false, msg: 'Please enter a valid email address.' })
      return
    }
    setEmailSending(true)
    setEmailStatus(null)
    try {
      const res  = await fetch(`${API}/email/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, period })
      })
      const data = await res.json()
      if (res.ok) {
        setEmailStatus({ ok: true,  msg: data.message })
      } else {
        setEmailStatus({ ok: false, msg: data.error })
      }
    } catch (e) {
      setEmailStatus({ ok: false, msg: 'Failed to send email. Check backend.' })
    } finally {
      setEmailSending(false)
    }
  }


  async function fetchPatterns() {
    setPatternsLoading(true)
    try {
      const res  = await fetch(`${API}/patterns?t=${Date.now()}`)
      const data = await res.json()
      setPatterns(data)
    } catch (e) { console.error(e) }
    finally { setPatternsLoading(false) }
  }

  async function generateReport() {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const res = await fetch(`${API}/day/report?t=${Date.now()}`)
      if (res.status === 404) {
        setError('No tasks found for today. Add and complete some tasks first.')
        return
      }
      const data = await res.json()
      setReport(data)
    } catch (e) {
      setError('Failed to generate report. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  //Simple bar chart using divs
  function CategoryBar({ category, count, maxCount, doneCount }) {
    const pct     = Math.round((count / maxCount) * 100)
    const donePct = count > 0 ? Math.round((doneCount / count) * 100) : 0
    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', marginBottom: '4px' }}>
          <span>{CATEGORY_EMOJI[category] || '📌'} {category}</span>
          <span style={{ color: '#888' }}>{doneCount}/{count} done</span>
        </div>
        <div style={{ height: '10px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
          {/* total bar */}
          <div style={{ position: 'relative', height: '100%', width: `${pct}%`, background: '#e8eaf6', borderRadius: '999px' }}>
            {/* done portion */}
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              width: `${donePct}%`, background: '#3f51b5', borderRadius: '999px'
            }}/>
          </div>
        </div>
        <div style={{ fontSize: '17px', color: '#aaa', marginTop: '2px' }}>{donePct}% completion rate</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '20px 32px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>📊 Day Report</h2>
        <p style={{ margin: '4px 0 0', fontSize: '17px', color: '#9b9bc8' }}>
          AI-generated productivity summary for today
        </p>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Generate button */}
        {!report && !loading && (
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '40px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px' }}>
              Ready to review your day?
            </div>
            <div style={{ fontSize: '16px', color: '#888', marginBottom: '24px' }}>
              AI will analyze all your tasks from today and generate a detailed productivity report.
            </div>
            <button onClick={generateReport} style={{
              padding: '12px 32px', background: '#3f51b5', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '17px',
              fontWeight: 600, cursor: 'pointer'
            }}>
              🤖 Generate Today's Report
            </button>
            {error && (
              <div style={{ marginTop: '16px', color: '#c62828', fontSize: '17px' }}>{error}</div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '60px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>🤖</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#3f51b5' }}>
              AI is analyzing your day...
            </div>
            <div style={{ fontSize: '17px', color: '#888', marginTop: '8px' }}>
              Reviewing your tasks, time accuracy, and productivity patterns
            </div>
          </div>
        )}

        {/* Report */}
        {report && (
          <>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
              <StatCard value={`${report.completion_rate}%`} label="Completion rate" color="#3f51b5" />
              <StatCard value={report.done}    label="Tasks done"    color="#2e7d32" sub={`of ${report.total} total`} />
              <StatCard value={report.partial} label="Partial"       color="#e65100" />
              <StatCard value={report.skipped} label="Skipped"       color="#b71c1c" />
            </div>

            {/* Time accuracy */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: '17px', fontWeight: 600, color: '#555', marginBottom: '12px' }}>⏱ Time Summary</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '17px', color: '#888' }}>Total estimated</span>
                  <span style={{ fontSize: '17px', fontWeight: 600 }}>{report.total_estimated}h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '17px', color: '#888' }}>Total actual</span>
                  <span style={{ fontSize: '17px', fontWeight: 600, color: report.total_actual <= report.total_estimated ? '#2e7d32' : '#c62828' }}>
                    {report.total_actual}h
                  </span>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '8px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '16px', color: '#2e7d32' }}>🚀 Faster than estimate</span>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#2e7d32' }}>{report.faster_count} tasks</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '16px', color: '#c62828' }}>⏳ Slower than estimate</span>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#c62828' }}>{report.slower_count} tasks</span>
                  </div>
                </div>
              </div>

              {/* Category breakdown */}
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: '17px', fontWeight: 600, color: '#555', marginBottom: '12px' }}>📂 By Category</div>
                {Object.keys(report.category_counts).length === 0 ? (
                  <div style={{ fontSize: '17px', color: '#aaa' }}>No category data yet</div>
                ) : (() => {
                  const maxCount = Math.max(...Object.values(report.category_counts))
                  return Object.entries(report.category_counts).map(([cat, count]) => (
                    <CategoryBar
                      key={cat}
                      category={cat}
                      count={count}
                      maxCount={maxCount}
                      doneCount={report.done_categories[cat] || 0}
                    />
                  ))
                })()}
              </div>
            </div>

            {/* AI Narrative */}
            <div style={{
              background: '#fff', borderRadius: '12px', padding: '20px',
              marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              borderLeft: '4px solid #3f51b5'
            }}>
              <div style={{ fontSize: '17px', fontWeight: 600, color: '#3f51b5', marginBottom: '10px' }}>
                🤖 AI Productivity Coach
              </div>
              <div style={{ fontSize: '17px', color: '#333', lineHeight: '1.8' }}>
                {report.narrative}
              </div>
            </div>

            {/* Task breakdown */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '17px', fontWeight: 600, color: '#555', marginBottom: '12px' }}>📋 Task Breakdown</div>
              {report.tasks.map((task, i) => {
                const sc = STATUS_COLOR[task.status] || STATUS_COLOR.pending
                const faster = task.actual_time && task.estimated_time && task.actual_time <= task.estimated_time
                const slower = task.actual_time && task.estimated_time && task.actual_time > task.estimated_time
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: i < report.tasks.length - 1 ? '1px solid #f5f5f5' : 'none',
                    flexWrap: 'wrap', gap: '8px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '16px', fontWeight: 500 }}>
                        {CATEGORY_EMOJI[task.category] || '📌'} {task.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {task.actual_time && (
                        <span style={{ fontSize: '16px', color: faster ? '#2e7d32' : slower ? '#c62828' : '#888' }}>
                          {faster ? '🚀' : slower ? '⏳' : ''} {task.actual_time}h actual
                        </span>
                      )}
                      <span style={{ fontSize: '16px', color: '#aaa' }}>est {task.estimated_time}h</span>
                      <span style={{
                        fontSize: '17px', padding: '2px 10px', borderRadius: '999px',
                        background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                        fontWeight: 600, textTransform: 'capitalize'
                      }}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Regenerate */}
            <div style={{ textAlign: 'center' }}>
              <button onClick={generateReport} style={{
                padding: '10px 24px', background: 'none',
                border: '1.5px solid #e0e0e0', borderRadius: '8px',
                color: '#888', fontSize: '17px', cursor: 'pointer'
              }}>
                ↺ Regenerate Report
              </button>
            </div>


            {/* MY PATTERNS*/}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginTop: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ fontWeight: 600, fontSize: '17px' }}>🧠 My Productivity Patterns</div>
                <button onClick={fetchPatterns} disabled={patternsLoading} style={{
                  padding: '6px 14px', background: patternsLoading ? '#9fa8da' : '#3f51b5',
                  color: '#fff', border: 'none', borderRadius: '6px',
                  fontSize: '16px', fontWeight: 600, cursor: patternsLoading ? 'not-allowed' : 'pointer'
                }}>
                  {patternsLoading ? 'Loading...' : 'Load Patterns'}
                </button>
              </div>
              <div style={{ fontSize: '16px', color: '#888', marginBottom: '16px' }}>
                AI learns from your actual completion data to give smarter estimates
              </div>

              {patterns && (
                <>
                  {/* Overall summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
                    {[
                      { label: 'Overall completion', value: `${patterns.overall.completion_rate}%`,
                        color: patterns.overall.completion_rate >= 70 ? '#2e7d32' : patterns.overall.completion_rate >= 40 ? '#f57f17' : '#c62828' },
                      { label: 'Best category',  value: patterns.best_category  || '—', color: '#3f51b5' },
                      { label: 'Needs work',     value: patterns.worst_category || '—', color: '#e65100' },
                    ].map(s => (
                      <div key={s.label} style={{
                        background: '#f7f8fc', borderRadius: '10px', padding: '12px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '17px', color: '#888', marginTop: '4px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Per-category pattern bars */}
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#555', marginBottom: '10px' }}>
                    Category Performance
                  </div>
                  {patterns.categories.map(cat => {
                    const trendColor = cat.time_trend === 'faster' ? '#2e7d32' : cat.time_trend === 'slower' ? '#c62828' : '#f57f17'
                    const trendLabel = cat.time_trend === 'faster' ? '🚀 Faster than estimated'
                                     : cat.time_trend === 'slower' ? '⏳ Takes longer than estimated'
                                     : cat.time_trend === 'on-track' ? '✅ On track'
                                     : '📊 No time data yet'
                    return (
                      <div key={cat.category} style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', marginBottom: '5px', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ fontWeight: 500 }}>
                            {cat.category}
                            <span style={{ fontSize: '17px', color: '#aaa', marginLeft: '6px' }}>({cat.total} tasks)</span>
                          </span>
                          <span style={{ fontSize: '17px', color: trendColor, fontWeight: 600 }}>{trendLabel}</span>
                        </div>
                        {/* Completion bar */}
                        <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '3px' }}>
                          <div style={{
                            height: '100%', borderRadius: '999px',
                            width: `${cat.completion_rate}%`,
                            background: cat.completion_rate >= 70 ? '#2e7d32' : cat.completion_rate >= 40 ? '#f57f17' : '#e57373'
                          }}/>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', color: '#aaa' }}>
                          <span>{cat.completion_rate}% completion</span>
                          {cat.avg_actual && <span>avg actual: {cat.avg_actual}h vs est: {cat.avg_estimated}h</span>}
                        </div>
                      </div>
                    )
                  })}

                  {patterns.overall.avg_time_diff !== null && (
                    <div style={{
                      marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
                      background: patterns.overall.avg_time_diff <= 0 ? '#e8f5e9' : '#fce4ec',
                      fontSize: '17px',
                      color: patterns.overall.avg_time_diff <= 0 ? '#2e7d32' : '#c62828'
                    }}>
                      {patterns.overall.avg_time_diff <= 0
                        ? `🚀 On average you finish tasks ${Math.abs(patterns.overall.avg_time_diff)}h faster than AI estimates — AI will now use your real speed!`
                        : `⏳ On average tasks take ${patterns.overall.avg_time_diff}h longer than estimated — AI will now adjust upward for you!`
                      }
                    </div>
                  )}
                </>
              )}
            </div>

            {/* EMAIL REPORT */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginTop: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ fontWeight: 600, fontSize: '17px', marginBottom: '4px' }}>📧 Email This Report</div>
              <div style={{ fontSize: '16px', color: '#888', marginBottom: '16px' }}>
                Enter any email address to receive a beautifully formatted HTML report
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="email"
                  placeholder="Enter email address..."
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    flex: 1, minWidth: '200px', padding: '10px 14px',
                    borderRadius: '8px', border: '1.5px solid #e0e0e0',
                    fontSize: '16px', outline: 'none'
                  }}
                />
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  style={{
                    padding: '10px 14px', borderRadius: '8px',
                    border: '1.5px solid #e0e0e0', fontSize: '16px',
                    background: '#fff', cursor: 'pointer'
                  }}
                >
                  <option value="daily">Daily Report</option>
                  <option value="weekly">Weekly Report</option>
                </select>
                <button
                  onClick={sendEmail}
                  disabled={emailSending}
                  style={{
                    padding: '10px 20px',
                    background: emailSending ? '#9fa8da' : '#3f51b5',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    fontSize: '16px', fontWeight: 600,
                    cursor: emailSending ? 'not-allowed' : 'pointer',
                    minWidth: '120px'
                  }}
                >
                  {emailSending ? '📤 Sending...' : '📧 Send Report'}
                </button>
              </div>
              {emailStatus && (
                <div style={{
                  marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
                  background: emailStatus.ok ? '#e8f5e9' : '#fce4ec',
                  color:      emailStatus.ok ? '#2e7d32' : '#c62828',
                  fontSize: '17px', fontWeight: 500
                }}>
                  {emailStatus.ok ? '✅ ' : '❌ '}{emailStatus.msg}
                </div>
              )}
              <div style={{ marginTop: '12px', fontSize: '16px', color: '#aaa' }}>
                💡 Weekly reports are also auto-sent every Sunday at 8 PM to the email set in your backend .env file
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Report