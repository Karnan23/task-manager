from flask import Flask, request, jsonify, g
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import sqlite3
import os
import json
import smtplib
import threading
from collections import Counter
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
load_dotenv()

DATABASE = os.path.join(os.path.dirname(__file__), 'data.db')

app = Flask(__name__)
CORS(app)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# DB HELPERS

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
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            title           TEXT    NOT NULL,
            category        TEXT    DEFAULT 'General',
            difficulty      TEXT    DEFAULT 'Medium',
            estimated_time  REAL    DEFAULT 1.0,
            actual_time     REAL    DEFAULT NULL,
            status          TEXT    DEFAULT 'pending',
            ai_suggestion   TEXT    DEFAULT NULL,
            created_at      TEXT    DEFAULT (datetime('now')),
            completed_at    TEXT    DEFAULT NULL
        )
    ''')
    # migrate old DB: add new columns if they don't exist yet
    for col, definition in [
        ('category',      "TEXT DEFAULT 'General'"),
        ('difficulty',    "TEXT DEFAULT 'Medium'"),
        ('estimated_time',"REAL DEFAULT 1.0"),
        ('actual_time',   "REAL DEFAULT NULL"),
        ('status',        "TEXT DEFAULT 'pending'"),
        ('ai_suggestion', "TEXT DEFAULT NULL"),
        ('created_at',    "TEXT DEFAULT (datetime('now'))"),
        ('completed_at',  "TEXT DEFAULT NULL"),
    ]:
        try:
            conn.execute(f'ALTER TABLE tasks ADD COLUMN {col} {definition}')
        except Exception:
            pass
    conn.commit()
    conn.close()

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# AI HELPERS

def get_category_averages():
    """Basic averages used by AI prompt — per category."""
    db = get_db()
    cur = db.execute('''
        SELECT category,
               ROUND(AVG(actual_time), 2)                          as avg_actual,
               ROUND(AVG(estimated_time), 2)                       as avg_estimated,
               COUNT(*)                                            as total,
               SUM(CASE WHEN actual_time <= estimated_time
                        THEN 1 ELSE 0 END)                         as faster_count
        FROM tasks
        WHERE actual_time IS NOT NULL AND status = 'done'
        GROUP BY category
    ''')
    rows = cur.fetchall()
    result = {}
    for row in rows:
        r = dict(row)
        # accuracy ratio: actual vs estimated (< 1 means user is faster than AI guessed)
        ratio = round(r['avg_actual'] / r['avg_estimated'], 2) if r['avg_estimated'] else 1.0
        result[r['category']] = {
            'avg_actual':    r['avg_actual'],
            'avg_estimated': r['avg_estimated'],
            'total':         r['total'],
            'faster_count':  r['faster_count'],
            'accuracy_ratio': ratio,   # < 1 = faster, > 1 = slower
        }
    return result

def get_user_patterns():
    """Richer patterns data for the My Patterns UI section."""
    db = get_db()

    # Per-category stats
    cat_cur = db.execute('''
        SELECT category,
               COUNT(*)                                                      as total,
               SUM(CASE WHEN status='done'    THEN 1 ELSE 0 END)            as done,
               SUM(CASE WHEN status='partial' THEN 1 ELSE 0 END)            as partial,
               SUM(CASE WHEN status='skipped' THEN 1 ELSE 0 END)            as skipped,
               ROUND(AVG(CASE WHEN actual_time IS NOT NULL
                              THEN actual_time END), 2)                      as avg_actual,
               ROUND(AVG(estimated_time), 2)                                 as avg_estimated
        FROM tasks
        GROUP BY category
        ORDER BY total DESC
    ''')
    categories = [dict(r) for r in cat_cur.fetchall()]

    for c in categories:
        c['completion_rate'] = round((c['done'] / c['total']) * 100) if c['total'] else 0
        if c['avg_actual'] and c['avg_estimated']:
            c['accuracy_ratio'] = round(c['avg_actual'] / c['avg_estimated'], 2)
            c['time_trend'] = 'faster' if c['accuracy_ratio'] < 0.9 else 'slower' if c['accuracy_ratio'] > 1.1 else 'on-track'
        else:
            c['accuracy_ratio'] = None
            c['time_trend'] = 'no data'

    # Overall stats
    total_cur = db.execute('''
        SELECT COUNT(*)                                            as total,
               SUM(CASE WHEN status='done'    THEN 1 ELSE 0 END) as done,
               SUM(CASE WHEN status='partial' THEN 1 ELSE 0 END) as partial,
               SUM(CASE WHEN status='skipped' THEN 1 ELSE 0 END) as skipped,
               ROUND(AVG(CASE WHEN actual_time IS NOT NULL AND estimated_time IS NOT NULL
                              THEN actual_time - estimated_time END), 2) as avg_time_diff
        FROM tasks
    ''')
    overall = dict(total_cur.fetchone())
    overall['completion_rate'] = round((overall['done'] / overall['total']) * 100) if overall['total'] else 0

    # Best performing category (highest completion rate, min 2 tasks)
    best = max(
        (c for c in categories if c['total'] >= 2),
        key=lambda c: c['completion_rate'], default=None
    )
    # Weakest category
    worst = min(
        (c for c in categories if c['total'] >= 2),
        key=lambda c: c['completion_rate'], default=None
    )

    return {
        'categories':  categories,
        'overall':     overall,
        'best_category':  best['category']  if best  else None,
        'worst_category': worst['category'] if worst else None,
    }

def analyze_task_with_ai(title):
    history = get_category_averages()
    history_text = ""
    if history:
        history_text = "\n\nThis user's PERSONAL performance history (use this to personalize estimates):\n"
        for cat, data in history.items():
            trend = ""
            if data["accuracy_ratio"] < 0.9:
                trend = f" — user finishes {cat} tasks FASTER than average (ratio {data['accuracy_ratio']}x)"
            elif data["accuracy_ratio"] > 1.1:
                trend = f" — user takes LONGER on {cat} tasks than average (ratio {data['accuracy_ratio']}x)"
            else:
                trend = f" — user is ON TRACK for {cat} tasks (ratio {data['accuracy_ratio']}x)"
            history_text += (
                f"  - {cat}: avg actual {data['avg_actual']}h vs avg estimated {data['avg_estimated']}h"
                f" over {data['total']} tasks{trend}\n"
            )
        history_text += "Adjust your estimated_time based on this user's real speed, not generic averages.\n"

    prompt = f"""You are a productivity AI assistant that gives REALISTIC time estimates for a focused, efficient person.

Task: "{title}"
{history_text}
IMPORTANT ESTIMATION RULES — follow these strictly:
- Base estimates on how long a focused, efficient person actually takes — not worst case
- "Apply to X jobs" = quick apply (LinkedIn/Wellfound Easy Apply) = 3-5 min each, NOT 30 min each
- "Read X pages/chapters" = average reading speed ~25 pages/hour
- "Exercise/workout" = include warmup + cooldown, typical 30-60 min
- "Watch X videos/lectures" = actual video duration, not extra
- "Write X words/pages" = ~300 words per hour for focused writing
- "Study X topic" = 1-2 hrs max per session before diminishing returns
- Large numbers in task titles (like "apply to 20 jobs") = use per-unit efficiency, NOT (number × long duration)
- Tasks rarely take more than 4 hours in a single session — if it seems longer, cap at 4h
- Always round estimated_time to nearest 0.5

Return ONLY a valid JSON object with exactly these fields:
{{
  "category": "one of: Work, Study, Personal, Health, Creative, General",
  "difficulty": "one of: Easy, Medium, Hard",
  "estimated_time": <realistic number in hours, e.g. 0.5 or 1.5>,
  "suggestion": "<one short actionable tip to complete this task efficiently, max 15 words>"
}}

No explanation. No markdown. Only the JSON object."""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=200
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    return json.loads(raw)

# TASK ROUTES

@app.route("/")
def home():
    return "TaskFlow AI API is running."

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    db = get_db()
    cur = db.execute('''
        SELECT id, title, category, difficulty, estimated_time,
               actual_time, status, ai_suggestion, created_at, completed_at
        FROM tasks ORDER BY id DESC
    ''')
    return jsonify([dict(row) for row in cur.fetchall()]), 200

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    if len(title) > 200:
        return jsonify({'error': 'Title too long — max 200 characters'}), 400

    category, difficulty, estimated_time, ai_suggestion = 'General', 'Medium', 1.0, None

    try:
        ai = analyze_task_with_ai(title)
        category       = ai.get('category', category)
        difficulty     = ai.get('difficulty', difficulty)
        estimated_time = float(ai.get('estimated_time', estimated_time))
        ai_suggestion  = ai.get('suggestion', None)
    except Exception as e:
        print(f"[AI ERROR] {e}")

    db = get_db()
    cur = db.execute(
        'INSERT INTO tasks (title, category, difficulty, estimated_time, ai_suggestion) VALUES (?, ?, ?, ?, ?)',
        (title, category, difficulty, estimated_time, ai_suggestion)
    )
    db.commit()
    cur = db.execute('SELECT * FROM tasks WHERE id=?', (cur.lastrowid,))
    return jsonify(dict(cur.fetchone())), 201

@app.route('/api/tasks/<int:task_id>', methods=['PATCH'])
def update_task(task_id):
    data = request.get_json() or {}
    db = get_db()
    fields, values = [], []

    for field in ['title', 'status', 'actual_time', 'category', 'difficulty', 'estimated_time']:
        if field in data:
            fields.append(f'{field} = ?')
            values.append(data[field])

    if 'status' in data and data['status'] in ('done', 'partial'):
        fields.append("completed_at = datetime('now')")

    if not fields:
        return jsonify({'error': 'No fields to update'}), 400

    values.append(task_id)
    cur = db.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?", tuple(values))
    db.commit()

    if cur.rowcount == 0:
        return jsonify({'error': 'Not found'}), 404

    cur = db.execute('SELECT * FROM tasks WHERE id=?', (task_id,))
    return jsonify(dict(cur.fetchone())), 200

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

# AI DAY VALIDATION

@app.route('/api/day/validate', methods=['POST'])
def validate_day():
    data = request.get_json() or {}
    tasks = data.get('tasks', [])
    if not tasks:
        return jsonify({'error': 'No tasks provided'}), 400

    task_lines = "\n".join(
        [f"- {t['title']} ({t['category']}, {t['difficulty']}, ~{t['estimated_time']}h)" for t in tasks]
    )
    total_hours = sum(t.get('estimated_time', 1) for t in tasks)

    prompt = f"""You are a productivity coach. A user has planned these tasks for today:

{task_lines}

Total estimated time: {round(total_hours, 1)} hours.

Give a short response (3-4 sentences max) covering:
1. Is this plan realistic for one day?
2. Any risk of burnout or underload?
3. One practical suggestion to improve the plan.

Be direct and encouraging. No bullet points."""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=200
    )

    return jsonify({
        'feedback': response.choices[0].message.content.strip(),
        'total_hours': round(total_hours, 1)
    }), 200

# SHARED REPORT DATA HELPER

def get_report_data(period='daily'):
    """Single source of truth for all report stats — used by day report and email routes."""
    db = get_db()
    cur = db.execute('''
        SELECT title, category, difficulty, estimated_time,
               actual_time, status, ai_suggestion
        FROM tasks ORDER BY id ASC
    ''')
    tasks = [dict(r) for r in cur.fetchall()]

    if not tasks:
        return None

    total   = len(tasks)
    done    = [t for t in tasks if t['status'] == 'done']
    partial = [t for t in tasks if t['status'] == 'partial']
    skipped = [t for t in tasks if t['status'] == 'skipped']
    pending = [t for t in tasks if t['status'] == 'pending']

    completion_rate = round((len(done) / total) * 100) if total else 0
    time_logged     = [t for t in done if t['actual_time'] and t['estimated_time']]
    faster          = [t for t in time_logged if t['actual_time'] <= t['estimated_time']]
    slower          = [t for t in time_logged if t['actual_time'] >  t['estimated_time']]
    total_estimated = round(sum(t['estimated_time'] or 0 for t in tasks), 1)
    total_actual    = round(sum(t['actual_time']    or 0 for t in done),  1)
    cat_counts      = Counter(t['category'] for t in tasks)
    done_cats       = Counter(t['category'] for t in done)

    task_lines = "\n".join([
        f"- [{t['status'].upper()}] {t['title']} (est: {t['estimated_time']}h, actual: {t['actual_time'] or 'not logged'}h)"
        for t in tasks
    ])

    prompt = f"""You are a productivity coach generating a {period} report.

Today's tasks:
{task_lines}

Stats: {total} total, {len(done)} done ({completion_rate}%), {len(partial)} partial, {len(skipped)} skipped.
Time: {total_estimated}h estimated, {total_actual}h actual. {len(faster)} tasks faster, {len(slower)} slower.

Write a short encouraging productivity report (4-5 sentences). Be specific and motivating. No bullet points."""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.6,
        max_tokens=300
    )

    return {
        'narrative':       response.choices[0].message.content.strip(),
        'total':           total,
        'done':            len(done),
        'partial':         len(partial),
        'skipped':         len(skipped),
        'pending':         len(pending),
        'completion_rate': completion_rate,
        'total_estimated': total_estimated,
        'total_actual':    total_actual,
        'faster_count':    len(faster),
        'slower_count':    len(slower),
        'tasks':           tasks,
        'category_counts': dict(cat_counts),
        'done_categories': dict(done_cats),
    }

# DAY REPORT

@app.route('/api/day/report', methods=['GET'])
def get_day_report():
    data = get_report_data('daily')
    if not data:
        return jsonify({'error': 'No tasks found'}), 404
    return jsonify(data), 200

# USER PATTERNS ROUTE

@app.route('/api/patterns', methods=['GET'])
def get_patterns():
    try:
        data = get_user_patterns()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# EMAIL HELPERS

def build_email_html(report_data, period='daily'):
    done_pct     = report_data['completion_rate']
    color        = '#2e7d32' if done_pct >= 70 else '#f57f17' if done_pct >= 40 else '#c62828'
    period_label = 'Weekly' if period == 'weekly' else 'Daily'

    task_rows = ''
    for t in report_data['tasks']:
        status_colors = {
            'done':    ('#e8f5e9', '#2e7d32'),
            'partial': ('#fff3e0', '#e65100'),
            'skipped': ('#fce4ec', '#b71c1c'),
            'pending': ('#f5f5f5', '#616161'),
        }
        bg, fg  = status_colors.get(t['status'], ('#f5f5f5', '#616161'))
        actual  = f"{t['actual_time']}h" if t['actual_time'] else '—'
        task_rows += f"""
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a2e">{t["title"]}<br>
            <span style="font-size:11px;color:#aaa">{t["category"]} • est {t["estimated_time"]}h</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#888;text-align:center;white-space:nowrap">{actual}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;white-space:nowrap">
            <span style="display:inline-block;background:{bg};color:{fg};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap">{t["status"].capitalize()}</span>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TaskFlow AI Report</title>
</head>
<body style="margin:0;padding:0;background:#f7f8fc;font-family:Arial,Helvetica,sans-serif">
  <center>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fc;padding:24px 0">
    <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">

      <!-- HEADER -->
      <tr>
        <td style="background:#1a1a2e;padding:28px 32px">
          <div style="font-size:22px;font-weight:700;color:#ffffff">&#9889; TaskFlow AI</div>
          <div style="font-size:13px;color:#9b9bc8;margin-top:6px">{period_label} Productivity Report &mdash; {datetime.now().strftime("%B %d, %Y")}</div>
        </td>
      </tr>

      <!-- STATS — table layout, works on all email clients -->
      <tr>
        <td style="background:#f7f8fc;padding:20px 24px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="25%" style="padding:4px">
                <table width="100%" cellpadding="12" cellspacing="0" style="background:#ffffff;border-radius:10px;text-align:center">
                  <tr><td>
                    <div style="font-size:26px;font-weight:700;color:{color}">{done_pct}%</div>
                    <div style="font-size:11px;color:#888;margin-top:4px">Done Rate</div>
                  </td></tr>
                </table>
              </td>
              <td width="25%" style="padding:4px">
                <table width="100%" cellpadding="12" cellspacing="0" style="background:#ffffff;border-radius:10px;text-align:center">
                  <tr><td>
                    <div style="font-size:26px;font-weight:700;color:#2e7d32">{report_data["done"]}</div>
                    <div style="font-size:11px;color:#888;margin-top:4px">Done</div>
                  </td></tr>
                </table>
              </td>
              <td width="25%" style="padding:4px">
                <table width="100%" cellpadding="12" cellspacing="0" style="background:#ffffff;border-radius:10px;text-align:center">
                  <tr><td>
                    <div style="font-size:26px;font-weight:700;color:#e65100">{report_data["partial"]}</div>
                    <div style="font-size:11px;color:#888;margin-top:4px">Partial</div>
                  </td></tr>
                </table>
              </td>
              <td width="25%" style="padding:4px">
                <table width="100%" cellpadding="12" cellspacing="0" style="background:#ffffff;border-radius:10px;text-align:center">
                  <tr><td>
                    <div style="font-size:26px;font-weight:700;color:#b71c1c">{report_data["skipped"]}</div>
                    <div style="font-size:11px;color:#888;margin-top:4px">Skipped</div>
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- AI NARRATIVE -->
      <tr>
        <td style="padding:20px 32px">
          <table width="100%" cellpadding="16" cellspacing="0" style="background:#e8eaf6;border-left:4px solid #3f51b5;border-radius:0 8px 8px 0">
            <tr><td>
              <div style="font-size:12px;font-weight:700;color:#3f51b5;margin-bottom:8px">&#129302; AI Productivity Coach</div>
              <div style="font-size:14px;color:#333333;line-height:1.7">{report_data["narrative"]}</div>
            </td></tr>
          </table>
        </td>
      </tr>

      <!-- TASK BREAKDOWN -->
      <tr>
        <td style="padding:0 32px 24px">
          <div style="font-size:13px;font-weight:700;color:#555555;margin-bottom:12px">&#128203; Task Breakdown</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:10px 8px;text-align:left;color:#888;font-weight:500;font-size:12px">Task</th>
                <th style="padding:10px 8px;text-align:center;color:#888;font-weight:500;font-size:12px;white-space:nowrap">Actual</th>
                <th style="padding:10px 8px;text-align:center;color:#888;font-weight:500;font-size:12px">Status</th>
              </tr>
            </thead>
            <tbody>{task_rows}</tbody>
          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#f7f8fc;padding:16px 32px;text-align:center">
          <div style="font-size:12px;color:#aaaaaa">Generated by TaskFlow AI &bull; Keep building &#128640;</div>
        </td>
      </tr>

    </table>
    </td></tr>
  </table>
  </center>
</body>
</html>"""


def send_email(to_email, subject, html_body):
    sender   = os.getenv("EMAIL_SENDER")
    password = os.getenv("EMAIL_PASSWORD")

    if not sender or not password:
        raise ValueError("EMAIL_SENDER and EMAIL_PASSWORD not set in .env")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = sender
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender, password)
        server.sendmail(sender, to_email, msg.as_string())

# EMAIL ROUTES

@app.route('/api/email/send', methods=['POST'])
def send_report_email():
    data     = request.get_json() or {}
    to_email = data.get('email', '').strip()
    period   = data.get('period', 'daily')

    if not to_email or '@' not in to_email:
        return jsonify({'error': 'Valid email address is required'}), 400

    report_data = get_report_data(period)
    if not report_data:
        return jsonify({'error': 'No tasks to report on'}), 404

    period_label = 'Weekly' if period == 'weekly' else 'Daily'
    subject      = f"⚡ TaskFlow AI — Your {period_label} Report ({datetime.now().strftime('%B %d, %Y')})"
    html_body    = build_email_html(report_data, period)

    try:
        send_email(to_email, subject, html_body)
        return jsonify({'message': f'Report sent to {to_email}'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Email failed: {str(e)}'}), 500

# AUTO WEEKLY EMAIL SCHEDULER

def schedule_weekly_email():
    """Runs in background thread — checks every hour if it is Sunday and sends email."""
    while True:
        now = datetime.now()
        #Sunday = weekday 6,send at 8 PM IST
        if now.weekday() == 6 and now.hour == 20 and now.minute < 5:
            receiver = os.getenv("EMAIL_RECEIVER")
            if receiver:
                try:
                    import requests as req
                    req.post(
                        "http://127.0.0.1:5000/api/email/send",
                        json={"email": receiver, "period": "weekly"},
                        timeout=60
                    )
                    print(f"[AUTO EMAIL] Weekly report sent to {receiver}")
                except Exception as e:
                    print(f"[AUTO EMAIL ERROR] {e}")
        #Sleep 55 minutes then check again
        threading.Event().wait(55 * 60)

#start background scheduler
_scheduler_thread = threading.Thread(target=schedule_weekly_email, daemon=True)
_scheduler_thread.start()

with app.app_context():
    try:
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print("Database initialization failed:", e)

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)