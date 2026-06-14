# 🧠 DTx Cognitive SaaS: AI-Powered Digital Therapeutics Platform

> **Built for the AWS Databases & Vercel Hackathon (Track 2: Monetizable B2B App)** > A production-ready, closed-loop Digital Therapeutics (DTx) platform designed for clinical cognitive assessment and ADHD intervention.

![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)
![AWS Aurora](https://img.shields.io/badge/Database-AWS%20Aurora%20PostgreSQL-232F3E?logo=amazon-aws&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployment-Vercel-000000?logo=vercel&logoColor=white)

---

## 🎯 Overview
Cognitive assessments traditionally rely on paper-based tests or outdated, localized software. **DTx Cognitive SaaS** modernizes this process by providing a multi-tenant, cloud-native ecosystem. 

It splits into two strictly isolated portals (RBAC):
1. **The Patient Terminal:** An immersive, distraction-free environment for cognitive stress-testing.
2. **The Provider Console:** An analytical dashboard featuring pure data filtering and an **AI-Powered Copilot** that generates instant clinical diagnostic reports based on AWS raw data.

## 🚀 Key Features

* **Multi-Tenant Clinical Profile Management:** Dynamic patient profile creation (`PatientProfile` model with name, age, gender, ADHD type, and severity) persisted in AWS Aurora PostgreSQL and hot-reloaded into synchronized memory dictionaries.
* **3-Track ADHD Presentation Customization:** 
    * *Inattentive Type:* Calibrates game sequence to focus on sustained attention: `["CLASSIC", "CLASSIC", "INCONGRUENT"]`.
    * *Hyperactive-Impulsive Type:* Calibrates game sequence to prioritize motor inhibition: `["SHAPE_COUNT", "SHAPE_COUNT", "INCONGRUENT"]`.
    * *Combined Type:* Calibrates game sequence to a balanced curriculum: `["CLASSIC", "INCONGRUENT", "SHAPE_COUNT"]`.
* **Severity-Based Adaptive Pacing (Severity):**
    * *Mild:* Faster stimulus window (`1500ms`), rapid trial intervals (`1000 - 3000ms`), and lenient error limit (`7`).
    * *Moderate:* Standard stimulus window (`2000ms`), medium intervals (`1500 - 4500ms`), and standard error limit (`5`).
    * *Severe:* Tolerant stimulus window (`2500ms`), slower pacing intervals (`2000 - 6000ms`) to reduce cognitive overload, and strict error limit (`3`) to avoid database pollution from severely distracted actions.
* **Clinical-Grade Data Safety & Batch Synchronization:** Logs are cached locally in the patient terminal and uploaded in a single transaction via `POST /api/logs` to prevent concurrency connection storms and database locks.
* **Asynchronous Race Condition Isolation:** Async state updates on the doctor dashboard are protected using the `active` cleanup hook pattern, preventing stale API responses from corrupting active visualizations.
* **AI Medical Copilot with Comparative Progress Trends:** Dynamically compares the earliest and latest sequence segments (Reaction Time change `rtTrend` and Accuracy change `accTrend`) to render structural insights on neurofeedback efficacy and cognitive fatigue.
* **4-Language Localization & Global Selector:** Supports Chinese (zh), English (en), Tamil (ta), and Malay (ms) instantly via an absolute-positioned glassmorphism dropdown language selector situated at the top-right corner of all portals.

## 🏗️ Architecture & AWS Integration

This monorepo project proves that you can ship quickly without sacrificing enterprise-grade data infrastructure.

* **Frontend:** React + Vite, deployed on **Vercel** for edge-optimized delivery.
* **Backend:** Python + FastAPI. Employs threadpool execution (via synchronous `def` routing) for heavy database actions to avoid blocking the asyncio event loop.
* **Database (The Core):** **AWS Aurora PostgreSQL** clustered database. Persists `TrialLog` (EHR telemetry logs) and `PatientProfile` (clinical patient characteristics) with IAM-token authorization security.

*(Include your Architecture Diagram screenshot here)*

## 🛠️ Quick Start (Monorepo One-Click Run)

We use `concurrently` to orchestrate both the FastAPI backend and Vite frontend from the root directory.

### Prerequisites
* Python 3.9+
* Node.js 18+
* An active AWS Aurora PostgreSQL connection string

### Setup
```bash
# 1. Clone the repository
git clone [https://github.com/your-username/dtx-cognitive-training.git](https://github.com/your-username/dtx-cognitive-training.git)
cd dtx-cognitive-training

# 2. Install root dependencies
npm install

# 3. Setup Backend (FastAPI)
cd dtx-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# 4. Setup Frontend (Vite/React)
cd dtx-frontend
npm install
cd ..