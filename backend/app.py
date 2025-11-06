from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sqlite3
import os

DATABASE = os.path.join(os.path.dirname(__file__), 'data.db')

app = Flask(__name__)
CORS(app) 
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

def init_db():
    conn = sqlite3.connect(DATABASE)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            completed INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    db = get_db()
    cur = db.execute('SELECT id, title, completed FROM tasks ORDER BY id DESC')
    rows = cur.fetchall()
    tasks = [dict(row) for row in rows]
    return jsonify(tasks), 200

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    db = get_db()
    cur = db.execute('INSERT INTO tasks (title, completed) VALUES (?, ?)', (title, 0))
    db.commit()
    task_id = cur.lastrowid
    cur = db.execute('SELECT id, title, completed FROM tasks WHERE id=?', (task_id,))
    task = dict(cur.fetchone())
    return jsonify(task), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def replace_task(task_id):
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    completed = 1 if data.get('completed') else 0
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    db = get_db()
    cur = db.execute('UPDATE tasks SET title=?, completed=? WHERE id=?', (title, completed, task_id))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({'error': 'Not found'}), 404
    cur = db.execute('SELECT id, title, completed FROM tasks WHERE id=?', (task_id,))
    task = dict(cur.fetchone())
    return jsonify(task), 200

@app.route('/api/tasks/<int:task_id>', methods=['PATCH'])
def update_task(task_id):
    data = request.get_json() or {}
    db = get_db()
    fields = []
    values = []
    if 'title' in data:
        fields.append('title = ?')
        values.append(data['title'])
    if 'completed' in data:
        fields.append('completed = ?')
        values.append(1 if data['completed'] else 0)
    if not fields:
        return jsonify({'error': 'No fields to update'}), 400
    values.append(task_id)
    query = f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?"
    cur = db.execute(query, tuple(values))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({'error': 'Not found'}), 404
    cur = db.execute('SELECT id, title, completed FROM tasks WHERE id=?', (task_id,))
    task = dict(cur.fetchone())
    return jsonify(task), 200

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    db = get_db()
    cur = db.execute('DELETE FROM tasks WHERE id=?', (task_id,))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'message': 'Deleted'}), 200

@app.route('/api/tasks/clear', methods=['POST'])
def clear_tasks():
    db = get_db()
    db.execute('DELETE FROM tasks')
    db.commit()
    return jsonify({'message': 'cleared'}), 200

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='127.0.0.1', port=5000)
