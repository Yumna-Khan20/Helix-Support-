# Helix Support — Autonomous AI Support & Escalation System

Helix Support is an end-to-end customer support chatbot system that answers questions accurately from your knowledge base, creates tickets in Supabase Postgres, and escalates unresolved or sensitive issues in real-time to your team via Discord webhooks.

---

## 🌟 Key Features

- **Embeddable Chat Widget (`widget.js`)**: Pure HTML/CSS/JS, zero build dependencies, responsive (380x560 desktop, fullscreen mobile), session persistence via `sessionStorage`, animated typing indicator, ticket banners.
- **AI Agent Backend (Gemini 1.5 Flash)**: Answers customer queries strictly based on the `/server/kb/faqs.json` knowledge base with a warm, concise tone.
- **Smart Escalation Engine**: Instantly flags escalation keywords (e.g. *refund*, *cancel*, *broken*, *human*), detects repeated queries (2+ times), and catches customer frustration/negative sentiment.
- **Supabase Ticketing**: Persists ticket records (`id`, `session_id`, `transcript`, `reason`, `status`, `created_at`) with graceful in-memory fallback for local testing.
- **Discord Webhook Alerts**: Sends rich embeds with formatted conversation transcripts straight to your Discord support channel.
- **Admin Dashboard (`/admin.html`)**: Password-protected dashboard with metrics, search/filtering, transcript accordion, and "Mark as Resolved" actions.
- **100% Free-Tier Architecture**: Runs entirely on free tiers of Gemini, Supabase, Discord, and Render.com.

---

## 🚀 Quick Start (Local Setup)

### 1. Install Dependencies
```bash
cd helix-support
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your free tier API keys:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_or_service_role_key
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
ADMIN_PASSWORD=admin123
```

> **Note:** The server includes an intelligent mock/in-memory fallback. You can start and test the application immediately even before inserting third-party keys!

### 3. Start the Server
```bash
npm start
```
- 💬 **Live Demo & Test Suite**: [http://localhost:3000/](http://localhost:3000/)
- 🛡️ **Admin Dashboard**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html) *(Password: `admin123`)*
- 📦 **Embeddable Script**: `http://localhost:3000/widget.js`
- 🩺 **Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 🔑 How to Get Free-Tier API Keys

### 1. Google Gemini API Key (Free)
1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with any Google account.
3. Click **Create API key** and copy the generated key.
4. Paste into `GEMINI_API_KEY` in `.env`.

### 2. Supabase Postgres Database (Free)
1. Sign up at [Supabase.com](https://supabase.com).
2. Click **New Project** (free tier includes 500MB storage and 50,000 MAU).
3. In your Supabase project dashboard, open **SQL Editor** on the left menu.
4. Open the file `supabase_schema.sql` from this repository, copy its contents, paste them into the SQL Editor, and click **Run**.
5. Go to **Project Settings** -> **API**, copy:
   - `Project URL` -> `SUPABASE_URL` in `.env`
   - `anon` or `service_role` key -> `SUPABASE_KEY` in `.env`

### 3. Discord Webhook URL (Free)
1. Open your Discord server (or create a free private server).
2. Right-click the channel where you want alerts (e.g. `#support-escalations`) -> **Edit Channel**.
3. Go to **Integrations** -> **Webhooks** -> **New Webhook**.
4. Name it "Helix Support" and click **Copy Webhook URL**.
5. Paste into `DISCORD_WEBHOOK_URL` in `.env`.

---

## 🌐 How to Embed on Any Website

Add this single script tag right before the closing `</body>` tag of any webpage:

```html
<script 
  src="https://your-domain.com/widget.js" 
  data-company="Acme Corp" 
  data-endpoint="https://your-domain.com/api/chat">
</script>
```

### Configuration Options

| Attribute | Description | Default |
| :--- | :--- | :--- |
| `data-company` | Name of your company displayed in widget header | `"Helix Support"` |
| `data-endpoint` | URL of the `/api/chat` backend endpoint | `"/api/chat"` |
| `data-greeting` | Optional custom greeting message | `"Hi there! 👋 How can I help you today?"` |

---

## ☁️ Free Deployment on Render.com

1. Push this repository to GitHub or GitLab.
2. Sign up / log in to [Render.com](https://render.com) (Free Tier).
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Set the build settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Plan**: `Free`
6. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `DISCORD_WEBHOOK_URL`
   - `ADMIN_PASSWORD`
7. Click **Deploy Web Service**.
8. Render will provide a live URL (e.g., `https://helix-support.onrender.com`).
9. Embed on any website using `<script src="https://helix-support.onrender.com/widget.js" data-endpoint="https://helix-support.onrender.com/api/chat"></script>`.

---

## 📂 Project Structure

```
helix-support/
├── package.json               # Node project configuration
├── .env.example               # Template for environment variables
├── .env                       # Local active environment variables
├── supabase_schema.sql        # Supabase SQL table & policy creation
├── README.md                  # Documentation and deployment guide
├── server/
│   ├── index.js               # Express application entry point
│   ├── kb/
│   │   └── faqs.json          # FAQ Knowledge Base (editable)
│   ├── routes/
│   │   ├── chat.js            # POST /api/chat endpoint
│   │   └── tickets.js         # GET/PATCH /api/tickets endpoints
│   └── services/
│       ├── escalation.js      # Keyword, repetition & sentiment engine
│       ├── gemini.js          # Google Gemini AI integration
│       ├── supabase.js        # Supabase client with in-memory fallback
│       └── discord.js         # Discord webhook rich embed sender
├── public/
│   └── admin.html             # Support Team Admin Dashboard
└── widget/
    ├── widget.js              # Standalone embeddable chat widget
    └── demo.html              # Live testing page with interactive suites
```

---

## 🧪 Testing Scenarios

You can verify all features on the [Demo Page](http://localhost:3000/):
1. **FAQ Queries**: Ask *"What are your business hours?"* or *"How long does shipping take?"* -> Helix answers accurately from `faqs.json`.
2. **Keyword Escalation**: Type *"I need a refund, the item is broken"* -> Helix creates a Supabase ticket, shows the amber banner, and posts a notification to Discord.
3. **Repetition Escalation**: Ask the same question twice in a row -> Helix detects repetition and escalates.
4. **Sentiment Escalation**: Type *"This is terrible service, useless!"* -> Helix flags frustration and connects to a human.
5. **Admin Management**: Go to `/admin.html` to inspect transcripts and mark tickets as resolved.
