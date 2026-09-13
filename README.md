````markdown
# Personal Finance Copilot

An AI-powered personal finance dashboard that combines transaction management, automatic expense categorization, budgeting, analytics, weekly financial digests, and a grounded AI finance assistant.

The project is designed as a full-stack portfolio application demonstrating modern web development, AI integration, retrieval-augmented generation (RAG), data analysis, workflow automation, and practical financial workflows.

---

## ✨ Features

### 📊 Financial Dashboard

- Overview of financial activity
- Transaction tracking
- Income and expense analysis
- Visual analytics using Recharts
- Monthly spending insights
- Category-based spending breakdown

### 💳 Transaction Management

- Add and view transactions
- Supports income and expense transactions
- Merchant and description tracking
- Automatic category detection
- Manual category override

### 🤖 AI-Powered Categorization

Transactions can be categorized automatically using a two-stage approach:

1. **Rule-based categorization**
   - Fast and deterministic
   - Uses merchant and transaction description keywords

2. **Groq LLM fallback**
   - Used when a transaction cannot be confidently categorized by local rules
   - Uses `openai/gpt-oss-20b`
   - Backend validates the returned category against the application's allowed categories

This keeps common transactions fast while allowing the system to handle unfamiliar merchants.

### 💰 Budget Management

- Create monthly budgets by category
- Edit existing budgets
- Delete budgets
- Track current-month spending
- See remaining budget
- Percentage-used calculation
- Visual progress indicators
- Warning and exceeded-budget states
- Overspending detection

### 💬 AI Finance Copilot

Ask natural-language questions about your finances.

Examples:

- "How much did I spend on food in March?"
- "How much did I spend on transport?"
- "What did I spend on groceries?"
- "How much did I spend last month?"

The assistant retrieves relevant transaction data from SQLite before generating an answer.

### 🔎 Retrieval-Augmented Generation (RAG)

The finance assistant uses a lightweight RAG architecture:

```text
User Question
      ↓
Query Understanding
      ↓
SQLite Retrieval
      ↓
Relevant Transactions
      ↓
Groq LLM
      ↓
Grounded Financial Answer
````

The retrieval layer helps keep AI responses grounded in the user's actual transaction data rather than relying only on the language model's general knowledge.

### 🌐 Internationalization

The dashboard supports:

* English
* Hindi (हिन्दी)

The selected language is persisted locally so it remains available across sessions.

### 📅 Weekly Financial Digest

The application includes an automated weekly financial digest powered by a backend digest service and n8n.

The digest includes:

* Total income
* Total expenses
* Net savings
* Transaction count
* Largest expense
* Spending by category
* Budget warnings
* Exceeded-budget alerts

The workflow calculates the previous completed Monday–Sunday period and formats the results into a human-readable financial summary.

```text
n8n Schedule Trigger
        ↓
Fetch Weekly Digest API
        ↓
Format Financial Digest
        ↓
Digest Output
```

The workflow is currently designed without external credentials, making it easy to run locally and extend later with email, Slack, Telegram, or other notification channels.

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │     React / Vite    │
                    │      Frontend       │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │   Express Backend   │
                    │                     │
                    │ Transactions        │
                    │ Budgets             │
                    │ Analytics           │
                    │ Digest              │
                    │ AI / RAG            │
                    └───────┬───────┬─────┘
                            │       │
                   ┌────────┘       └────────┐
                   ▼                         ▼
            ┌──────────────┐          ┌──────────────┐
            │    SQLite    │          │   Groq LLM   │
            │   Database   │          │              │
            └──────────────┘          └──────────────┘

                         ┌──────────────┐
                         │     n8n      │
                         │   Workflow   │
                         └──────┬───────┘
                                │
                                ▼
                       Weekly Digest API
```

---

## 🧰 Tech Stack

### Frontend

* React
* Vite
* Recharts
* i18next
* react-i18next

### Backend

* Node.js
* Express
* SQLite
* better-sqlite3

### AI

* Groq
* `openai/gpt-oss-20b`
* Retrieval-Augmented Generation (RAG)

### Automation

* n8n

### Testing & Quality

* Node.js test runner
* ESLint
* Production build verification

---

## 🔌 API Overview

### Transactions

```text
GET    /api/transactions
POST   /api/transactions
```

### Budgets

```text
GET    /api/budgets
POST   /api/budgets
PUT    /api/budgets/:id
DELETE /api/budgets/:id
```

### Weekly Digest

```text
GET /api/digest/weekly?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

The digest endpoint returns structured financial information including spending totals, largest expenses, category breakdowns, and budget alerts.

---

## ⚙️ Local Development

### 1. Clone the repository

```bash
git clone <repository-url>
cd finance-copilot
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Configure environment variables

Create the required environment files using the provided examples.

Do not commit API keys or other secrets to the repository.

### 5. Start the backend

```bash
cd backend
npm run dev
```

The backend runs on:

```text
http://localhost:3001
```

### 6. Start the frontend

In another terminal:

```bash
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

### 7. Run n8n

The weekly financial digest workflow can be run locally using n8n.

Import:

```text
n8n/weekly-financial-digest.json
```

The workflow expects the backend to be available at:

```text
http://localhost:3001
```

See `n8n/README.md` for workflow-specific instructions.

---

## 🧪 Testing

The project includes automated tests for core backend functionality.

Examples:

```bash
cd backend

npm run test:budgets
npm run test:digest
npm run test:digest-api
npm run test:categorizer
npm run test:rag
npm run test:chat
```

Frontend quality checks:

```bash
npm run lint
npm run build
```

The project is designed so that backend functionality can be tested independently from the frontend.

---

## 🔐 Security Notes

* API keys are stored in environment variables.
* Environment files are excluded from Git.
* SQLite runtime database files are excluded from Git.
* AI-generated categories are validated against the application's allowed categories.
* API inputs are validated before database operations.
* User-scoped database queries are used by the finance APIs.

Authentication and full multi-user support are planned as a subsequent project phase.

---

## 🚀 Project Roadmap

### ✅ Completed

* [x] Financial dashboard
* [x] Transaction management
* [x] Automatic transaction categorization
* [x] Groq LLM fallback
* [x] RAG-powered finance assistant
* [x] Budget management
* [x] Budget alerts
* [x] English / Hindi internationalization
* [x] Weekly financial digest API
* [x] n8n weekly financial digest automation

### 🔄 Remaining

* [ ] Final UI polish
* [ ] Improved documentation and project demo
* [ ] Authentication
* [ ] Full multi-user support
* [ ] Docker configuration
* [ ] Production deployment
* [ ] Final end-to-end verification

---

## 🎯 Portfolio Goals

This project demonstrates:

* Full-stack application development
* REST API design
* Relational data modeling with SQLite
* AI/LLM integration
* Retrieval-Augmented Generation
* Rule-based + LLM hybrid classification
* Financial data analytics
* Budget tracking and alerting
* Internationalization
* Workflow automation with n8n
* Automated testing
* Production-oriented engineering practices

The goal is to demonstrate not just an AI chatbot, but a practical AI-powered financial application with real data retrieval, deterministic business logic, automation, and a usable dashboard.

---

## 📁 Project Structure

```text
finance-copilot/
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── ...
│   └── data/
│
├── src/
│   ├── components/
│   ├── i18n/
│   └── ...
│
├── n8n/
│   ├── weekly-financial-digest.json
│   └── README.md
│
├── .gitignore
├── package.json
└── README.md
```

---

## 📌 Current Status

**Active development**

The core finance application, AI/RAG functionality, budgeting system, internationalization, and weekly n8n financial digest automation are implemented and tested.

The remaining development focuses on UI refinement, portfolio documentation/demo, authentication and multi-user architecture, and containerized production deployment.

```