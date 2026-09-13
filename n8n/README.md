# Personal Finance Copilot — n8n Weekly Digest Automation

This directory contains the automation workflow for generating and formatting weekly financial digests from the Personal Finance Copilot backend.

---

## 📋 Overview

The **Weekly Financial Digest** workflow automates financial check-ins without requiring manual dashboard visits:

```text
┌──────────────────────────────┐
│       Schedule Trigger       │  (Fires every Monday at 8:00 AM)
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     HTTP Request Node        │  (Calls GET http://localhost:3001/api/digest/weekly)
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│         Code Node            │  (Formats financial figures in INR ₹,
│    (Digest Formatter)        │   ranks categories, and builds alerts)
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   Digest Output Node (NoOp)  │  (Emits structured digest & subject,
│  (Notification Placeholder)  │   ready for Email/Slack/Telegram)
└──────────────────────────────┘
```

---

## ⚙️ Prerequisites

1. **Node.js** (v18+ installed on your host machine)
2. **Personal Finance Copilot Backend** running on `http://localhost:3001`
3. **No Groq API key is required** by this workflow. The digest service and route perform 100% deterministic calculations directly from the SQLite ledger.

---

## 🚀 Quick Start Guide

### 1. Start the Backend API

From the project root:
```bash
npm run start:backend
# or for live reload during development:
npm run dev:backend
```

Verify that the backend is healthy:
```bash
curl http://localhost:3001/api/health
# Returns: {"status":"ok","service":"finance-copilot-api"}
```

---

### 2. Start n8n using `npx`

Run n8n natively on your host machine (no global installation or Docker required):

```bash
npx n8n
```

Once started, open your browser at:
👉 **[http://localhost:5678](http://localhost:5678)**

> **Note on Networking (`localhost:3001`)**:
> Because n8n runs natively via `npx` on the host machine, it shares the `localhost` network namespace with the Express backend. The HTTP Request node can directly access `http://localhost:3001/api/digest/weekly`.
> *(If you ever choose to run n8n inside Docker Desktop on Windows instead, change the URL to `http://host.docker.internal:3001/api/digest/weekly`)*.

---

### 3. Import the Workflow

1. In the n8n UI, navigate to **Workflows**.
2. Click **Add Workflow** (top right) or open the workflow menu (`...`).
3. Select **Import from File...**.
4. Choose [`n8n/weekly-financial-digest.json`](./weekly-financial-digest.json).
5. The workflow **"Weekly Financial Digest"** will open on your canvas.

---

### 4. Testing the Workflow Manually

1. Click **Test step** or **Execute workflow** in n8n.
2. The workflow will:
   - Compute the previous completed Monday–Sunday date range dynamically.
   - Query `http://localhost:3001/api/digest/weekly`.
   - Format the results into a clear, formatted summary.
3. Inspect the final node (**Digest Output (Notification Placeholder)**) to view the formatted summary output.

#### Testing Against Mock Data (March 2026)
If your ledger currently contains the seeded mock dataset (October 2025 – March 2026), you can test with specific dates by opening the **HTTP Request** node and temporarily setting query parameters:
- `startDate`: `2026-03-25`
- `endDate`: `2026-03-31`

Then click **Test step** to observe real mock transactions, largest expense (`Cash Withdrawal ₹2,600`), category percentages, and budget alerts (`Travel: 117.2% exceeded`, `Food: 84.6% warning`).

---

## 🗓️ Dynamic Date Range Calculation

When triggered on a Monday, the HTTP Request node calculates the **previous completed calendar week** (Monday through Sunday) using standard date math:

- **Current Run Day**: Monday (`day = 1`)
- **End Date (Sunday)**: `now - 1 day`
- **Start Date (Monday)**: `now - 7 days` (or `endDate - 6 days`)

Expression used in node parameters:
```javascript
// Start Date:
={{ (() => { const now = new Date(); const day = now.getDay(); const diff = day === 0 ? 7 : day; const end = new Date(now.getTime() - diff * 86400000); const start = new Date(end.getTime() - 6 * 86400000); return start.toISOString().slice(0, 10); })() }}

// End Date:
={{ (() => { const now = new Date(); const day = now.getDay(); const diff = day === 0 ? 7 : day; const end = new Date(now.getTime() - diff * 86400000); return end.toISOString().slice(0, 10); })() }}
```

---

## 📬 Formatted Digest Output

The **Format Financial Digest** Code node parses the API response and produces a clean, readable text report with INR (`₹`) formatting:

```text
📊 WEEKLY FINANCIAL DIGEST
Period: 2026-03-25 to 2026-03-31 (7 days)
Account: Aarav Mehta (INR)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 SUMMARY
• Total Income:    ₹0
• Total Expenses:  ₹7,510
• Net Savings:     -₹7,510
• Transactions:    7

🏷️ LARGEST EXPENSE
• Merchant: Cash Withdrawal
• Amount:   ₹2,600
• Category: Other
• Date:     2026-03-30

📂 SPENDING BY CATEGORY
1. Other           ₹3,850  (51.3%)
2. Shopping        ₹1,760  (23.4%)
3. Transport       ₹1,360  (18.1%)
4. Food              ₹540  (7.2%)

⚠️ BUDGET ALERTS (2026-03)
[🚨 EXCEEDED] Travel: ₹14,060 / ₹12,000 (117.2% used)
[⚠️ WARNING ] Food: ₹10,155 / ₹12,000 (84.6% used)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated automatically by Personal Finance Copilot
```

---

## 🔔 Adding Future Notification Channels

In this version, the workflow terminates at a safe placeholder node so it can be demonstrated without external credentials. To route the digest to a real notification channel:

1. **Email (SMTP / Gmail / SendGrid)**:
   - Add a **Send Email** node after the Code node.
   - Set **Subject** to `={{ $json.subject }}`.
   - Set **Text** to `={{ $json.text }}`.
2. **Discord / Slack / Telegram**:
   - Replace or connect the final node to a **Discord / Slack / Telegram** webhook node.
   - Send the message content: `={{ $json.text }}`.
