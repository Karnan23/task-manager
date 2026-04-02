# ⚡ TaskFlow AI

An AI-powered productivity platform that analyzes your tasks, builds your daily schedule, tracks your performance, and learns from your habits over time.

Built with **Flask + React + Groq AI (Llama 3.3 70B)**.

---

## 🚀 Live Features

### 📋 AI Task Analysis
Add any task in plain English. The AI instantly returns:
- **Category** — Work, Study, Personal, Health, Creative, General
- **Difficulty** — Easy, Medium, Hard
- **Realistic time estimate** — based on task context, not generic guesses
- **Actionable tip** — one short suggestion to complete it efficiently

### 🗓 Day Schedule Builder
- Drag and reorder your tasks before locking in the day
- Pick your start time — the AI builds a time-blocked schedule automatically
- 10-minute breaks added between tasks
- Live "NOW" indicator shows where you are in your day
- AI Coach validates your plan: *"This is overloaded — here's how to fix it"*

### 📊 Day Report
- Completion rate, done/partial/skipped breakdown
- Time accuracy: estimated vs actual per task
- Category performance charts
- AI-generated narrative: honest, specific, encouraging

### 📧 Email Reports
- Type any email to receive a beautifully formatted HTML report
- Choose Daily or Weekly
- Auto weekly report every Sunday at 8 PM

### 🧠 AI Learns From You
- Tracks your actual completion time per category
- Calculates your personal speed ratio (faster/slower than estimated)
- Feeds your history back into every new estimate — gets smarter with use
- "My Patterns" dashboard shows your strongest and weakest categories

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, Flask, Flask-CORS |
| AI | Groq API — Llama 3.3 70B Versatile |
| Database | SQLite |
| Frontend | React 18, Vite |
| Email | smtplib, Gmail SMTP |
| Scheduling | Python threading |

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)
- Gmail account with [App Password](https://myaccount.google.com/apppasswords) enabled

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/taskflow-ai.git
cd taskflow-ai
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```
GROQ_API_KEY=your_groq_key_here
EMAIL_SENDER=yourgmail@gmail.com
EMAIL_PASSWORD=your_16_char_app_password
EMAIL_RECEIVER=yourgmail@gmail.com
```

Start the backend:
```bash
python app.py
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 📁 Project Structure

```
taskflow-ai/
├── backend/
│   ├── app.py              # Flask API — all routes and AI logic
│   ├── requirements.txt
│   └── .env                # secrets — never committed
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Tasks tab
│   │   ├── Schedule.jsx    # Day schedule timeline
│   │   └── Report.jsx      # Day report + email + patterns
│   ├── .env                # VITE_API_URL
│   └── package.json
└── README.md
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Fetch all tasks |
| POST | `/api/tasks` | Add task — triggers AI analysis |
| PATCH | `/api/tasks/:id` | Update status, actual time |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/day/validate` | AI validates day plan |
| GET | `/api/day/report` | Generate day report |
| GET | `/api/patterns` | Fetch user productivity patterns |
| POST | `/api/email/send` | Send email report |

---

## 💡 How the AI Learning Works

Every time you complete a task and log the actual time taken, the app stores it. On the next task you add in the same category, the AI receives your personal history:

```
Study tasks: avg actual 1.2h vs estimated 2h — user finishes FASTER (ratio 0.6x)
```

The AI uses this to give you tighter, personalized estimates — not generic ones.

---

## 🗺 Roadmap

- [ ] User authentication — multi-user support
- [ ] Weekly trend charts
- [ ] Mobile app (React Native)
- [ ] Pomodoro timer integration
- [ ] Calendar export (.ics)

---

## 👤 Author

**Karnan G**
Full-Stack & AI Developer
[GitHub](https://github.com/Karnan23) • [LinkedIn](https://linkedin.com/in/karnan-g-771a43287) • karnang417@gmail.com