import React, { useEffect, useState } from 'react'

const API = 'http://127.0.0.1:5000/api/tasks'

function App() {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setLoading(true)
    try {
      const res = await fetch(API)
      const data = await res.json()
      setTasks(data)
    } catch (err) {
      console.error('Fetch tasks error', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      if (res.ok) {
        const newTask = await res.json()
        setTasks(prev => [newTask, ...prev])
        setTitle('')
      } else {
        console.error('Add failed', await res.json())
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this task?')) return
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (res.ok) setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err) { console.error(err) }
  }

  function startEdit(task) {
    setEditing(task.id)
    setEditTitle(task.title)
  }

  async function submitEdit(id) {
    if (!editTitle.trim()) return
    try {
      const res = await fetch(`${API}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle })
      })
      if (res.ok) {
        const updated = await res.json()
        setTasks(prev => prev.map(t => (t.id === id ? updated : t)))
        setEditing(null)
        setEditTitle('')
      }
    } catch (err) { console.error(err) }
  }

  async function toggleComplete(task) {
    try {
      const res = await fetch(`${API}/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      })
      if (res.ok) {
        const updated = await res.json()
        setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)))
      }
    } catch (err) { console.error(err) }
  }

  async function clearAll() {
    if (!confirm('Clear all tasks?')) return
    try {
      const res = await fetch(`${API}/clear`, { method: 'POST' })
      if (res.ok) setTasks([])
    } catch (err) { console.error(err) }
  }

  return (
    <div className="container">
      <h1>TASK MANAGER</h1>

      <form onSubmit={handleAdd} className="form">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter new task"
        />
        <button type="submit">Add</button>
        <button type="button" onClick={clearAll} className="danger">Clear All</button>
      </form>

      {loading ? <p>Loading...</p> : (
        <ul className="task-list">
          {tasks.length === 0 && <li className="empty">No tasks yet</li>}
          {tasks.map(task => (
            <li key={task.id} className={task.completed ? 'completed' : ''}>
              <div className="left">
                <input
                  type="checkbox"
                  checked={!!task.completed}
                  onChange={() => toggleComplete(task)}
                />
                {editing === task.id ? (
                  <>
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                    />
                    <button onClick={() => submitEdit(task.id)}>Save</button>
                    <button onClick={() => setEditing(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="title">{task.title}</span>
                    <div className="actions">
                      <button onClick={() => startEdit(task)}>Edit</button>
                      <button onClick={() => handleDelete(task.id)} className="danger">Delete</button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
