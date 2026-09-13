# Personal Finance Copilot

An AI-powered personal finance application that combines transaction tracking, automatic expense categorization, budgeting, financial analytics, weekly digest automation, and a grounded AI finance assistant. Built with end-to-end multi-user data isolation, secure authentication, and bilingual internationalization.

Designed as a production-minded portfolio application demonstrating modern web development, retrieval-augmented generation (RAG), deterministic financial calculations, secure API design, and workflow automation.

---

## ✨ Features

### 📊 Financial Dashboard & Analytics
- Real-time overview of total income, total expenses, and net balance.
- Monthly cash-flow trends visualized with Recharts.
- Category-based spending breakdown with percentage share.
- Largest spending category identification.
- Restrained card hover elevation and empty-state guidance.

### 💳 Transaction Management
- Record income and expense transactions with merchant, amount, category, and date.
- Real-time ledger updates reflected across summary cards and monthly charts.
- Automatic category detection on submission with manual override support.
- Scoped strictly to the authenticated user account.

### 🤖 Two-Stage AI Categorization
Transactions are categorized automatically using a hybrid two-stage pipeline:
1. **Deterministic Rule Engine**: High-speed, zero-cost keyword matching against known merchants and descriptions.
2. **Groq LLM Fallback**: When rules are inconclusive, transactions are classified via `openai/gpt-oss-20b` on Groq. Responses are validated against permitted application categories before persistence.

### 💰 Budget Management & Alerts
- Set monthly spending boundaries per category.
- Real-time tracking of current-month spending against category limits.
- Automated progress calculation with three visual health states:
  - **Healthy**: Spending below 80% of limit.
  - **Warning**: Spending between 80% and 99.9% of limit.
  - **Exceeded**: Spending at or above 100% of limit with overage amount.
- Inline edit and delete capabilities with immediate feedback.

### 💬 Grounded AI Finance Copilot (RAG)
Ask natural-language questions about your financial activity:
- *"How much did I spend on food in March?"*
- *"Where am I spending the most?"*
- *"What did I spend on groceries?"*

The Copilot uses Retrieval-Augmented Generation (RAG) to query the user's SQLite ledger before prompting the LLM, keeping answers grounded in actual transaction records:

```text
User Question
      ↓
Query Understanding (Date Range, Category, Merchant)
      ↓
User-Scoped SQLite Retrieval
      ↓
Relevant Transaction Context
      ↓
Groq LLM (openai/gpt-oss-20b)
      ↓
Grounded Financial Answer
```

### 🔐 Authentication & Multi-User Isolation
- User registration and login with input validation.
- Persistent session handling using browser `localStorage` (`finance_copilot_token`).
- Token verification on initial load via `GET /api/auth/me` with automatic session invalidation on 401 responses.
- Dynamic authenticated header displaying user name, auto-generated initials (e.g., `AM`, `PS`), and an accessible logout control.
- Strict server-side user scoping on all database queries (`user_id` derived exclusively from verified tokens).
- Dynamic greeting personalized with user identity (`GOOD MORNING, {{name}}` / `सुप्रभात, {{name}}`).

### 🌐 Internationalization (i18n)
- Full bilingual interface supporting **English** and **Hindi (हिन्दी)**.
- Localized headings, buttons, validation messages, and currency notation (`₹` INR).
- Language preference persisted locally across sessions.

### 📅 Weekly Financial Digest Automation (n8n)
- Automated check-in workflow triggered weekly in n8n.
- Calls the authenticated `GET /api/digest/weekly` endpoint using a Bearer token.
- Calculates metrics for the previous completed Monday–Sunday period:
  - Total income, expenses, and net savings
  - Transaction volume and largest single expense
  - Category spending breakdown with percentage share
  - Budget warnings and exceeded-budget alerts
- Formats figures into a readable financial summary terminating at a notification placeholder node, ready for email or webhook extension.

```text
n8n Schedule Trigger (Mondays 8:00 AM)
                ↓
HTTP Request (GET /api/digest/weekly with Bearer Token)
                ↓
Code Node (INR Formatting, Ranking & Alert Building)
                ↓
Digest Output Node (Notification Placeholder)
```

---

## 🏗️ Architecture

```text
                    ┌───────────────────────────────────┐
                    │      React 19 / Vite Frontend     │
                    │                                   │
                    │  AuthContext   │   AuthView       │
                    │  Dashboard     │   i18n (EN/HI)   │
                    └─────────────────┬─────────────────┘
                                      │
                                      │ REST API (Bearer Token)
                                      ▼
                    ┌───────────────────────────────────┐
                    │       Express Backend API         │
                    │                                   │
                    │  /api/auth     │  authenticate()  │
                    │  /transactions │  /budgets        │
                    │  /analytics    │  /chat (RAG)     │
                    │  /digest       │  authService     │
                    └─────────┬─────────────────┬───────┘
                              │                 │
                     ┌────────┘                 └────────┐
                     ▼                                   ▼
          ┌───────────────────────┐           ┌───────────────────────┐
          │    SQLite Database    │           │       Groq LLM        │
          │     (better-sqlite3)  │           │  (openai/gpt-oss-20b) │
          │                       │           │                       │
          │  users                │           │  Categorization       │
          │  transactions         │           │  Copilot RAG answers  │
          │  budgets              │           └───────────────────────┘
          └───────────────────────┘
                     ▲
                     │ Bearer Token
          ┌──────────┴────────────┐
          │     n8n Workflow      │
          │ (Weekly Digest Node)  │
          └───────────────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite | Fast, responsive single-page application |
| **Styling** | Vanilla CSS | Custom design tokens, responsive layout, accessible focus styles, reduced-motion support |
| **Charts** | Recharts | Financial trend and cash-flow visualizations |
| **i18n** | i18next, react-i18next | English and Hindi internationalization with dynamic interpolation |
| **Backend** | Node.js, Express 5 | REST API, authentication middleware, financial services |
| **Database** | SQLite, better-sqlite3 | Synchronous embedded relational storage with foreign keys and unique constraints |
| **Security** | Node.js `crypto` (`scrypt`, HMAC) | Salted password hashing, HMAC-SHA256 signed bearer tokens |
| **AI / LLM** | Groq SDK (`openai/gpt-oss-20b`) | Fallback transaction categorization and grounded RAG answer generation |
| **Automation**| n8n | Scheduled weekly financial digest execution |
| **Code Quality**| ESLint, Node test runner | Static analysis, linting, and automated unit/integration test suites |

---

## 🔐 Security & Data Isolation

- **Password Security**: Passwords are hashed using Node.js `crypto.scryptSync` with a unique 16-byte random salt and verified with `crypto.timingSafeEqual`.
- **Signed Bearer Tokens**: Authenticated sessions use signed tokens generated via HMAC-SHA256 signatures with a 24-hour expiration.
- **Strict Server-Side Identity**: Client-supplied `userId` values in query parameters, request bodies, or headers are never trusted. The user identity is derived strictly server-side from the verified token in `request.user.id`.
- **User-Scoped Queries**: All database queries for transactions, budgets, analytics summaries, RAG context retrieval, and weekly digests are filtered by `user_id`.
- **AI Output Validation**: Categories returned by the LLM are strictly validated against the application's allowed category list before database insertion.
- **SQL Injection Prevention**: All queries use SQLite parameterized prepared statements.

---

## 🔌 API Reference

### Public Authentication Endpoints
No credentials required.

| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create a new user account | `{ "name": "...", "email": "...", "password": "..." }` |
| `POST` | `/api/auth/login` | Authenticate and obtain bearer token | `{ "email": "...", "password": "..." }` |

### Protected Endpoints
Require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/me` | Return current authenticated user profile |
| `GET` | `/api/analytics/summary` | Financial summary, monthly trends, and category breakdown |
| `GET` | `/api/transactions` | Paginated transaction list (supports optional `page`, `limit`, `month`) |
| `POST` | `/api/transactions` | Create a transaction (auto-categorized if category omitted) |
| `GET` | `/api/budgets` | List all budgets with current-month spending and alerts |
| `POST` | `/api/budgets` | Create a new monthly category budget |
| `PUT` | `/api/budgets/:id` | Update an existing budget limit |
| `DELETE` | `/api/budgets/:id` | Delete a category budget |
| `POST` | `/api/chat` | Query Finance Copilot with natural-language question |
| `GET` | `/api/digest/weekly` | Generate weekly financial digest for date range (`startDate`, `endDate`) |

---

## ⚙️ Local Development Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- *(Optional)* A free **Groq API key** for LLM features (rule-based categorization works without an API key).

---

### 1. Clone the Repository
```bash
git clone https://github.com/Psj1234/Personal-Finance-Copilot.git
cd Personal-Finance-Copilot
```

### 2. Install Dependencies

Install root and frontend dependencies:
```bash
npm install
```

Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

### 3. Configure Environment Variables

Create `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
PORT=3001
GROQ_API=your_groq_api_key_here
JWT_SECRET=your_custom_secret_key_here
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `PORT` | Optional | Server port (defaults to `3001`). |
| `GROQ_API` | Optional | Groq API key for LLM categorization and Copilot answers (falls back to `GROQ_API_KEY`). If omitted, rule-based categorization and fallback chat responses are used. |
| `JWT_SECRET` | Optional | Secret key for HMAC-SHA256 token signing (falls back to `AUTH_SECRET` or a default development secret if omitted). |

### 4. Initialize and Seed the Database

Run the database seed script to set up tables, initial constraints, and the demo account with historical transactions:
```bash
npm --prefix backend run db:seed
```

### 5. Start the Application

**Option A: Native Node Development**

In terminal 1 — Start the Express backend:
```bash
npm run dev:backend
# API available at http://localhost:3001
```

In terminal 2 — Start the Vite frontend:
```bash
npm run dev
# Dashboard available at http://localhost:5173
```

**Option B: Docker Compose (Unified Production Container)**

Build and start the unified container with persistent SQLite volume:
```bash
docker compose up -d --build
# Application & API available at http://localhost:3001
```

To seed the demo database inside the container:
```bash
docker compose exec app npm --prefix backend run db:seed
```

SQLite data is persisted across container restarts on the named volume `finance_data:/app/backend/data`.
To stop the container: `docker compose down`.

---

## 👤 Demo Account Credentials

For local testing and portfolio evaluation, a seeded demo account is available:

| Field | Demo Credential |
| :--- | :--- |
| **Email** | `aarav@example.com` |
| **Password** | `password123` |

> **Note**: These are local development credentials only. You can also use the **Create Account** tab to register a new account, which starts with a completely private, clean ledger at ₹0.

---

## 📅 Running the n8n Weekly Digest Workflow

1. Start n8n locally using `npx` (no Docker required):
   ```bash
   npx n8n
   ```
2. Open n8n in your browser at `http://localhost:5678`.
3. In n8n, navigate to **Workflows** → **Import from File...** and select `n8n/weekly-financial-digest.json`.
4. Set the authentication token for the HTTP Request node via an environment variable before starting n8n:
   ```bash
   export FINANCE_COPILOT_API_TOKEN="<your_bearer_token>"
   npx n8n
   ```
   *(Or enter `Bearer <your_token>` directly in the HTTP Request node headers).*
5. Click **Test step** or **Execute workflow** to verify the report generation.
6. Detailed workflow instructions are available in [`n8n/README.md`](n8n/README.md).

---

## 🧪 Testing & Quality Assurance

### Backend Automated Test Suites
Run individual test suites from the root using `--prefix backend`:

```bash
# Authentication service unit tests and route integration
npm --prefix backend run test:auth

# Cross-user isolation and security (transactions, budgets, analytics, RAG, 401 gating)
npm --prefix backend run test:security

# Budget management API and conflict handling
npm --prefix backend run test:budgets

# Chat route integration and error handling
npm --prefix backend run test:chat

# RAG transaction retrieval tests
npm --prefix backend run test:rag-retrieval

# RAG grounded answer generation tests
npm --prefix backend run test:rag-answer

# Transaction categorizer and rule fallback tests
npm --prefix backend run test:categorizer

# Weekly digest calculation logic
npm --prefix backend run test:digest

# Weekly digest API endpoint tests
npm --prefix backend run test:digest-api
```

### Frontend Quality Checks
```bash
# ESLint static analysis
npm run lint

# Production bundle compilation
npm run build
```

---

## 📁 Project Structure

```text
finance-copilot/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.js               # SQLite connection & schema migrations
│   │   │   ├── schema.sql                # Table schemas & constraints
│   │   │   └── seed.js                   # Demo user & transaction seed script
│   │   ├── middleware/
│   │   │   └── auth.js                   # Bearer token verification middleware
│   │   ├── routes/
│   │   │   ├── analytics.js              # Summary and cash-flow endpoints
│   │   │   ├── auth.js                   # Login, register, me endpoints
│   │   │   ├── budgets.js                # Budget CRUD endpoints
│   │   │   ├── chat.js                   # Copilot RAG chat route
│   │   │   ├── digest.js                 # Weekly digest route
│   │   │   └── transactions.js           # Transaction CRUD endpoints
│   │   ├── services/
│   │   │   ├── authService.js            # scrypt hashing & HMAC token signing
│   │   │   ├── categorizer.js            # Hybrid rule-based + Groq classification
│   │   │   ├── digestService.js          # Weekly metrics calculation
│   │   │   ├── ragAnswerService.js       # Grounded prompt generation
│   │   │   └── ragService.js             # User-scoped transaction retrieval
│   │   ├── tests/
│   │   │   └── crossUserIsolation.test.js # Security & cross-user isolation tests
│   │   ├── app.js                        # Express application configuration
│   │   └── server.js                     # HTTP server entry point
│   ├── data/                             # SQLite database directory (git-ignored)
│   ├── .env.example
│   └── package.json
│
├── src/
│   ├── components/
│   │   ├── AuthView.jsx                  # Sign in / Register tabbed view
│   │   ├── Budgets.jsx                   # Budget management panel
│   │   ├── CategoryBreakdown.jsx         # Category spending breakdown
│   │   ├── DashboardHeader.jsx           # Dynamic user initials, nav, logout
│   │   ├── FinanceCopilot.jsx            # Interactive AI chat interface
│   │   ├── LanguageSwitcher.jsx          # English / Hindi selector
│   │   ├── SpendChart.jsx                # Monthly cash flow Recharts
│   │   ├── SummaryCards.jsx              # Income, expense, balance metrics
│   │   ├── TransactionForm.jsx           # Transaction creation form
│   │   └── TransactionList.jsx           # Recent transactions list
│   ├── context/
│   │   └── AuthContext.jsx               # AuthProvider, useAuth hook, 401 handling
│   ├── i18n/
│   │   ├── locales/
│   │   │   ├── en.json                   # English locale dictionary
│   │   │   └── hi.json                   # Hindi locale dictionary
│   │   └── index.js                      # i18next configuration
│   ├── services/
│   │   ├── api.js                        # Centralized API client & token injection
│   │   └── formatters.js                 # INR currency & date formatting
│   ├── App.jsx                           # Auth gating & dashboard shell
│   ├── App.css                           # Design system, layout, responsive styles
│   └── main.jsx                          # Root React entry point
│
├── n8n/
│   ├── weekly-financial-digest.json      # n8n workflow definition
│   └── README.md                         # Workflow setup & testing guide
│
├── .dockerignore                         # Docker build context exclusions
├── Dockerfile                            # Multi-stage production container build
├── docker-compose.yml                    # Local container orchestration & volume
├── package.json
└── README.md
```

---

## 🚀 Project Status & Roadmap

### ✅ Completed
- [x] Financial dashboard with Recharts analytics and responsive layout
- [x] Transaction management with income/expense tracking
- [x] Two-stage transaction categorization (deterministic rules + Groq LLM fallback)
- [x] RAG-powered Finance Copilot grounded in user transaction data
- [x] Category budget management with warning and exceeded alerts
- [x] English / Hindi internationalization with dynamic name greeting
- [x] Weekly financial digest calculation engine
- [x] n8n automated weekly digest workflow with Bearer token authentication
- [x] Secure backend authentication (scrypt hashing, HMAC-SHA256 signed bearer tokens)
- [x] Server-enforced multi-user data isolation across all routes and services
- [x] Frontend authentication interface (login, register, session persistence, 401 expiration handling)
- [x] Automated test suites covering auth, cross-user isolation, budgets, chat, RAG, and digests
- [x] Containerized deployment configuration (Docker & Docker Compose)

### 🔄 Roadmap
- [ ] Production environment cloud deployment and monitoring
- [ ] Optional automated notification webhooks (Email/Discord/Slack) for the digest workflow