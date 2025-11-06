# ✅ Task Manager — Full Stack Web Application

A complete **Full Stack Task Manager** built with **React (Vite)** for the frontend and **Flask (Python)** for the backend.  
This app allows users to create, edit, mark complete, and delete tasks, storing everything persistently in a **SQLite** database.

---

## 🚀 Features

- 🔹 Add, edit, and delete tasks  
- 🔹 Mark tasks as completed or pending  
- 🔹 Real-time UI updates without page reload  
- 🔹 Persistent data storage using SQLite  
- 🔹 RESTful API with Flask  
- 🔹 CORS-enabled frontend-backend communication  
- 🔹 Clean modular code structure (production-friendly)

---

## 🧠 Tech Stack

**Frontend**
- React (Vite)
- JavaScript (Fetch API)
- CSS (custom + responsive)
- Node.js + npm

**Backend**
- Flask (Python)
- Flask-CORS
- SQLite3 (lightweight DB)

**Development Tools**
- VS Code
- Virtual Environment (venv)
- npm & pip for dependency management

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Karnan23/task-manager.git
cd task-manager
```

### 2️⃣ Backend Setup (Flask + SQLite)
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # On Windows
# or
source venv/bin/activate     # On macOS/Linux

pip install -r requirements.txt
python app.py
```

✅ Backend runs on [http://127.0.0.1:5000](http://127.0.0.1:5000)

### 3️⃣ Frontend Setup (React + Vite)
```bash
cd ../frontend
npm install
npm run dev
```

✅ Frontend runs on [http://localhost:5173](http://localhost:5173)

### 4️⃣ Project Flow

| Step | Component | Description |
|------|------------|-------------|
| 1 | 🧠 **React UI** | User interacts with input fields and buttons |
| 2 | 🌐 **Fetch API** | Sends requests to Flask API endpoints |
| 3 | 🔥 **Flask Backend** | Handles requests and performs database operations |
| 4 | 💾 **SQLite Database** | Stores and retrieves persistent task data |
| 5 | ⚡ **React (Re-render)** | Updates the UI instantly with new data |

---

## 🧩 API Endpoints

| Method | Endpoint | Description |
|---------|-----------|-------------|
| `GET` | `/api/tasks` | Fetch all tasks |
| `POST` | `/api/tasks` | Create a new task |
| `PATCH` | `/api/tasks/<id>` | Update specific task fields |
| `PUT` | `/api/tasks/<id>` | Replace a task completely |
| `DELETE` | `/api/tasks/<id>` | Delete a specific task |
| `POST` | `/api/tasks/clear` | Delete all tasks |


Example JSON Response:
```bash
{
  "id": 1,
  "title": "Buy milk",
  "completed": false
}
```
---

## 🧰 Folder Structure
```bash
task_app/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── data.db
│   └── venv/
│
└── frontend/
    ├── public/
    │   ├── bg.jpeg
    │   └── task_icon.png
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── package.json
    └── vite.config.js
```
---

## 🧪 Testing the Application

1. Run Flask backend (python app.py)

2. Run React frontend (npm run dev)

3. Open [http://localhost:5173]

4. Add tasks and verify data in SQLite (using VS Code SQLite Viewer)

---

## 📦 Deployment

- **Frontend**: Deploy to Vercel / Netlify

- **Backend**: Deploy to Render / Railway

- **Database**: SQLite auto-hosted with backend

Example production structure:

[https://your-task-app.vercel.app]  → frontend
[https://your-task-api.onrender.com] → backend

---

## 🧑‍💻 Author

Karnan G
[LinkedIn](https://www.linkedin.com/in/karnan-g-771a43287) | [GitHub](https://github.com/Karnan23)

“Code like a scientist, debug like a detective, and deploy like a boss.” ⚡