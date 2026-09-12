````markdown
# Personal Finance Copilot

An AI-powered personal finance dashboard that combines transaction management, automatic expense categorization, budgeting, analytics, and a grounded AI finance assistant.

The project is designed as a full-stack portfolio application demonstrating modern web development, AI integration, retrieval-augmented generation (RAG), data analysis, and practical financial workflows.

---

## ✨ Features

### 📊 Financial Dashboard
- Overview of financial activity
- Transaction tracking
- Income and expense analysis
- Visual analytics using Recharts
- Monthly spending insights

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

The model receives only the relevant transaction records retrieved from the database.

The system prompt explicitly instructs the model to:

* Use retrieved transactions as the source of financial facts
* Avoid inventing transactions or amounts
* Perform simple arithmetic when necessary
* Acknowledge insufficient data
* Return concise financial answers

No vector database is required for the current implementation.

---

## 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │      React + Vite    │
                    │      Frontend        │
                    └──────────┬───────────┘
                               │
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │    Node.js + Express │
                    │       Backend        │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
       │   SQLite    │  │ Categorizer  │  │  RAG Service │
       │  Database   │  │              │  │              │
       └─────────────┘  └──────┬───────┘  └──────┬───────┘
                                │                 │
                                ▼                 ▼
                         ┌────────────────────────────┐
                         │         Groq API            │
                         │     gpt-oss-20b             │
                         └────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* CSS
* Recharts

### Backend

* Node.js
* Express
* better-sqlite3

### AI

* Groq API
* `openai/gpt-oss-20b`

### Database

* SQLite

### Development

* ESLint
* Git
* GitHub Copilot

---

## 📁 Project Structure

```text
finance-copilot/
│
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   ├── seed.js
│   │   │   └── categorize-existing.js
│   │   │
│   │   ├── routes/
│   │   │   ├── transactions.js
│   │   │   ├── budgets.js
│   │   │   ├── analytics.js
│   │   │   └── chat.js
│   │   │
│   │   ├── services/
│   │   │   ├── categorizer.js
│   │   │   ├── groqService.js
│   │   │   ├── ragService.js
│   │   │   └── ragAnswerService.js
│   │   │
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── data/
│   │   └── finance.db     # generated locally by the seed script
│   │
│   └── package.json
│
├── src/
│   ├── components/
│   │   ├── FinanceCopilot.jsx
│   │   ├── Budgets.jsx
│   │   └── ...
│   │
│   ├── services/
│   │   └── api.js
│   │
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
│
├── mock_transactions.csv
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

* Node.js installed
* npm installed
* A Groq API key

---

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd finance-copilot
```

---

### 2. Install backend dependencies

```bash
cd backend
npm install
```

---

### 3. Configure environment variables

Create:

```text
backend/.env
```

Add your Groq API key:

```env
GROQ_API=your_groq_api_key_here
```

**Never commit your `.env` file or API key to GitHub.**

---

### 4. Seed the database

From the `backend` directory:

```bash
npm run db:seed
```

This initializes the SQLite database and creates the demo financial data.

---

### 5. Start the backend

```bash
npm start
```

The backend runs on:

```text
http://localhost:3001
```

---

### 6. Start the frontend

Open another terminal:

```bash
cd finance-copilot
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

Open the displayed Vite URL in your browser.

---

## 🔌 API Overview

### Transactions

```text
GET  /api/transactions
POST /api/transactions
```

### Analytics

```text
GET /api/analytics/summary
GET /api/analytics/forecast
```

### Budgets

```text
GET    /api/budgets
POST   /api/budgets
PUT    /api/budgets/:id
DELETE /api/budgets/:id
```

### AI Finance Chat

```text
POST /api/chat
```

Request:

```json
{
  "question": "How much did I spend on food in March?"
}
```

Response contains the generated answer, retrieval count, and safe retrieval filters.

---

## 🧠 How the AI Assistant Works

The application does not simply send the user's question directly to the LLM.

Instead:

### Step 1 — Understand the question

The backend identifies useful filters such as:

* Category
* Merchant
* Description keywords
* Relative date ranges
* Specific months

### Step 2 — Retrieve transactions

SQLite is queried using parameterized queries.

Only relevant transactions are returned, with a maximum retrieval limit to keep the context focused.

### Step 3 — Generate the answer

The retrieved transactions and the user's question are passed to the Groq model.

The model is instructed to use the retrieved transactions as the source of financial facts.

### Step 4 — Return a grounded answer

The API returns the generated response to the React frontend.

This provides a lightweight RAG implementation without introducing the complexity of a vector database.

---

## 🧮 Budget Calculation

Budgets are recurring monthly limits.

For each category:

```text
Remaining = Monthly Limit - Current Month Expenses

Percentage Used =
(Current Month Expenses / Monthly Limit) × 100
```

Only transactions with:

```text
type = expense
```

are included in budget spending calculations.

Income transactions are excluded.

The progress bar is capped visually at 100%, while the actual percentage remains visible so overspending is not hidden.

---

## 🔐 Security Considerations

* Groq API credentials are stored server-side.
* API keys are never exposed to the React frontend.
* Database queries use parameterized SQL.
* User input is validated before database operations.
* LLM-generated categories are validated against an allowed category list.
* The chat assistant is instructed not to invent financial facts.
* `.env` files should never be committed to the repository.

---

## 🧪 Testing

The project includes focused tests for the core backend services.

Current test coverage includes:

* Transaction categorization
* Groq categorization fallback
* RAG retrieval
* RAG answer generation
* Chat API
* Budget CRUD and calculations

Example commands:

```bash
cd backend

npm run test:categorizer
npm run test:rag-retrieval
npm run test:rag-answer
npm run test:chat
npm run test:budgets

npx eslint .
```

Frontend checks:
```bash
npm run lint
npm run build
```

The application has also been manually verified through the browser for:

* Transaction flows
* AI chat
* Budget creation
* Budget editing
* Budget deletion
* Budget progress states
* Responsive mobile layout
* Browser console errors

---

## 📌 Current Status

### Completed

* [x] React + Vite frontend
* [x] Node.js + Express backend
* [x] SQLite database
* [x] Seed financial data
* [x] Transaction management
* [x] Financial analytics
* [x] Rule-based categorization
* [x] Groq LLM categorization fallback
* [x] RAG transaction retrieval
* [x] Groq-powered finance assistant
* [x] Finance Copilot chat UI
* [x] Budget CRUD API
* [x] Budget dashboard UI
* [x] Responsive budget interface
* [x] Automated regression testing

### Planned

* [ ] English + Hindi internationalization
* [ ] n8n financial digest automation
* [ ] Final UI polish
* [ ] Improved documentation/demo
* [ ] Authentication and multi-user support
* [ ] Docker/deployment

---

## 🎯 Project Goals

This project was built as a practical full-stack + AI portfolio project rather than a simple CRUD application.

The main goals are to demonstrate:

* Full-stack application development
* REST API design
* Relational data modeling
* Financial analytics
* Rule-based and LLM-assisted classification
* Retrieval-Augmented Generation
* Grounded AI responses
* External API integration
* Responsive frontend development
* Automated testing
* Clean separation between frontend, backend, database, and AI services

---

## 🔮 Future Improvements

Potential future improvements include:

* User authentication
* Multi-user financial accounts
* Persistent conversation history
* More advanced financial insights
* Recurring transaction detection
* Automatic budget recommendations
* Notification and alert systems
* Scheduled financial summaries
* Dockerized deployment
* Cloud deployment
* More sophisticated ML-based transaction classification
```