# 🎓 Campus-to-Career

### AI-Powered Placement Management & Student Skill Assessment Platform

Campus-to-Career is an AI-powered placement management platform designed to help students assess their technical skills, practice interviews, and track their placement readiness through a centralized application.

The platform combines AI-driven mock interviews, programming assessments, resume processing, and camera-based proctoring with a dedicated dashboard for placement officers to review student performance.
---

## ✨ Key Features

### 👨‍🎓 Student Portal

- **Student Registration & Login** — Dedicated student access to the platform.
- **Resume Upload & Parsing** — Upload PDF or DOCX resumes and extract text for profile processing.
- **AI Mock Interviews** — Practice technical interviews with AI-generated questions and feedback.
- **Voice-Based Interview Experience** — Speak answers through browser speech recognition and hear questions using speech synthesis in supported browsers.
- **Coding Assessments** — Solve dynamically generated Python programming problems.
- **Automated Test-Case Evaluation** — Execute submitted solutions against test cases and calculate assessment scores.
- **Camera-Based Proctoring** — Capture webcam frames for the configured computer vision checks.
- **Performance Dashboard** — Review coding scores, interview performance, and assessment status.
- **Placement Readiness Tracking** — View assessment completion and readiness information.

### 🏢 Placement Officer Portal

- **Officer Dashboard** — View student assessment information in one place.
- **Student Management** — Browse and review student profiles.
- **Performance Analysis** — Review coding and interview scores.
- **Interview Feedback** — Inspect recorded answers, scores, and AI-generated feedback.
- **Resume Review** — Access available resume information.
- **CSV Export** — Export student data for reporting and further analysis.

### 🤖 AI & Computer Vision

- AI-powered interview question generation and answer evaluation.
- LLM integration using Ollama and Llama 3 through LangChain.
- YOLO-based object detection, depending on the configured model and detection logic.
- MediaPipe and OpenCV-based camera-frame processing.
- Browser-based speech recognition and speech synthesis.

---

## 🖼️ Application Screenshots



### 1. Student Login
<img width="1406" height="865" alt="image" src="https://github.com/user-attachments/assets/df554997-a167-48e1-aa5d-f3b32606464d" />

### 2. Student Dashboard
<img width="1653" height="871" alt="image" src="https://github.com/user-attachments/assets/46944ba3-27fc-4963-a55a-bd620e0f5aa1" />

### 3. Resume Upload
<img width="1698" height="867" alt="image" src="https://github.com/user-attachments/assets/857d8d22-2d21-4897-818c-1d09321607c3" />


### 4. AI Mock Interview
<img width="1034" height="637" alt="image" src="https://github.com/user-attachments/assets/3831bc2c-7358-490a-8395-8abe378633f6" />

### 5. Coding Assessment
<img width="1416" height="645" alt="image" src="https://github.com/user-attachments/assets/d0d91700-dbd3-4101-aed9-3704b3fa2474" />

### 6. Student Results
<img width="1398" height="867" alt="image" src="https://github.com/user-attachments/assets/f0098422-dfec-45f1-a8be-d946ba3295bc" />

### 7. Placement Officer Dashboard
<img width="1530" height="685" alt="image" src="https://github.com/user-attachments/assets/cf82c58d-6d5c-46bd-a2e0-659b40fefa10" />

---

### Architecture Overview

The application follows a client-server architecture.

1. **Frontend:** React and Vite provide the user interface for students and placement officers.
2. **Backend:** FastAPI exposes REST API endpoints and coordinates application logic.
3. **Database:** MySQL stores user profiles, assessments, interview sessions, answers, and scores.
4. **Caching and Session State:** Redis, accessed locally through Memurai, supports temporary state and caching.
5. **AI Engine:** Ollama runs Llama 3 locally for interview-related generation and evaluation.
6. **Resume Processing:** `pypdf` and `python-docx` extract text from supported resume formats.
7. **Computer Vision:** OpenCV, YOLO, and MediaPipe support the implemented proctoring functionality.
8. **Coding Assessment:** A Python execution module runs submitted functions against test cases.

### High-Level Workflow

```text
Student / Placement Officer
            |
            v
     React + Vite
            |
            v
       FastAPI API
            |
     +------+-------+----------------+
     |      |       |                |
     v      v       v                v
  MySQL   Redis   Ollama       Vision Processing
     |      |       |           YOLO / MediaPipe
     |      |       |
     +------+-------+
            |
            v
   Assessment Results
            |
            v
   Student / Officer UI
```

---

## 🧰 Technology Stack

| Category          | Technologies                                    |
| ----------------- | ----------------------------------------------- |
| Frontend          | React.js, Vite, JavaScript                      |
| Backend           | Python, FastAPI                                 |
| API Communication | REST APIs, HTTP, JSON                           |
| Database          | MySQL, SQLAlchemy                               |
| Caching           | Redis, Memurai                                  |
| LLM               | Ollama, Llama 3                                 |
| LLM Integration   | LangChain                                       |
| Resume Parsing    | pypdf, python-docx                              |
| Computer Vision   | OpenCV, YOLO, MediaPipe                         |
| Voice Interface   | Browser Speech Recognition and Speech Synthesis |
| Code Execution    | Python subprocess                               |
| Development Tools | Git, GitHub, VS Code                            |

---

## 🔄 Core Workflows

### AI Mock Interview

1. The student starts an interview.
2. The backend initializes or retrieves the interview session.
3. The AI generates an interview question.
4. The browser presents the question to the student.
5. The student responds using the supported voice interface.
6. The backend evaluates the answer and returns feedback and the next question.
7. Interview answers and scores are persisted in MySQL.
8. The student can review the available results.

### Coding Assessment

1. The backend requests a programming problem from the LLM.
2. The generated problem is checked by the validation module.
3. The student writes and submits a Python function.
4. The execution module runs the function against the configured test cases.
5. The backend calculates and stores the assessment result.
6. The result is made available to the relevant dashboard.

### Resume Processing

1. The student uploads a supported resume file.
2. FastAPI receives the uploaded file.
3. The backend extracts text from the PDF or DOCX.
4. Available profile information is stored for later use.

### Placement Officer Review

1. The officer opens the officer dashboard.
2. The backend retrieves available student records.
3. The officer reviews resumes, assessment status, scores, and interview feedback.
4. Student information can be exported to CSV where supported.

---

## 📁 Project Structure

```text
campus-to-career/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── coding/
│   │   ├── __init__.py
│   │   ├── generator.py
│   │   ├── validator.py
│   │   └── executor.py
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   └── uploads/
│
├── docs/
│   └── images/
│       ├── project-banner.png
│       ├── system-architecture.png
│       ├── student-login.png
│       ├── student-dashboard.png
│       ├── resume-upload.png
│       ├── ai-interview.png
│       ├── coding-assessment.png
│       ├── student-results.png
│       └── officer-dashboard.png
│
├── .gitignore
└── README.md
```

> This is a representative structure. Adjust the file and directory names to match the actual repository.

---

## ⚙️ Prerequisites

Install or configure the following before running the project:

- Python
- Node.js and npm
- MySQL Server
- Redis-compatible service such as Memurai on Windows
- Ollama with the required Llama 3 model
- Git (optional, for version control)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd campus-to-career
```

If you already have the project on your computer, navigate directly to its root directory.

### 2. Configure the MySQL database

Create a database in MySQL:

```sql
CREATE DATABASE campus_to_career;
```

Configure the database connection through environment variables or a local environment file that is excluded from Git. Do not commit database credentials or secret keys.

### 3. Start the backend

Open a terminal:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install fastapi "uvicorn[standard]" sqlalchemy pymysql bcrypt pypdf python-multipart python-docx redis opencv-python mediapipe langchain-ollama
```

If your existing environment uses additional packages, install those from your project's dependency file as well.

Start the API:

```powershell
fastapi dev main.py
```

Backend URL:

`http://localhost:8000`

API documentation:

`http://localhost:8000/docs`

### 4. Start MySQL, Redis/Memurai, and Ollama

Ensure MySQL and Memurai are running.

If Ollama is not already running, start it:

```bash
ollama serve
```

Download the model if needed:

```bash
ollama pull llama3
```

The application must be configured to connect to the correct database, Redis service, and Ollama instance.

### 5. Start the frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

`http://localhost:5173`

### 6. Open the application

Visit `http://localhost:5173` in your browser.

Use the relevant login page for the student or placement officer workflow.

---

## 🔐 Security Considerations

- Store passwords as secure hashes, never as plaintext.
- Keep database credentials and other secrets out of source control.
- Enforce student and officer permissions on the backend.
- Add proper authenticated sessions or token-based authentication.
- Treat uploaded files as untrusted input.
- Run submitted code inside a securely isolated sandbox before public deployment.
- Use HTTPS and configure CORS for the deployed frontend origin.
- Store uploaded resumes in persistent, access-controlled storage for production.
- Avoid exposing private student information in API responses or CSV exports.

**Important:** The current local code-execution implementation uses subprocesses and should not be exposed to arbitrary public submissions without isolation and resource limits.

---

## 🔮 Future Enhancements

Potential future improvements include:

- [ ] Secure sandboxed code execution
- [ ] More robust role-based access control
- [ ] Persistent cloud file storage
- [ ] Improved assessment analytics and reporting
- [ ] Interview workflow orchestration using LangGraph
- [ ] AI evaluation testing with DeepEval
- [ ] LLM tracing and debugging using LangSmith
- [ ] Docker-based deployment
- [ ] Automated testing and CI/CD
- [ ] More comprehensive model evaluation and proctoring metrics

These are planned enhancements, not claims that every item is already implemented.

---

## 🎯 Project Objective

The objective of Campus-to-Career is to centralize student placement preparation and assessment in one platform. By combining coding evaluations, AI-assisted interview practice, resume processing, camera-based monitoring, and officer-facing performance reports, the platform aims to make skill assessment and placement preparation more organized and accessible.

---

## 👨‍💻 Author

**Maneeth Vigneswaran A**

Integrated M.Tech — Software Engineering

VIT Chennai

---

## 📄 License

Choose and add an appropriate open-source license before distributing this project. If no license has been added, all rights remain reserved by default.

---

⭐ If you find this project interesting, feel free to explore the code and follow its development.
