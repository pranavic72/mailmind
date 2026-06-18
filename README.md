# MailMind
An AI-powered email client that connects to your Gmail inbox, triages emails by priority, summarizes long threads, and drafts context-aware replies — so you only review and approve.

![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)
![Clerk](https://img.shields.io/badge/Auth-Clerk-purple)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-orange?logo=google)

---

## What It Does

Most people open their inbox and feel overwhelmed — everything looks equally important. MailMind reads everything, flags what matters, ignores what doesn't, and drafts replies so you just review and send.

- **Priority triage** — every email is classified as 🔴 High, 🟡 Low, or ⚪ Noise by Gemini 2.0 Flash
- **AI summaries** — 2–3 sentence summaries so you understand emails without reading them fully
- **Reply drafts** — context-aware draft replies in your chosen tone (Formal / Friendly / Brief)
- **Newsletter separation** — newsletters and promos are routed to their own tab, out of your way
- **Snooze** — hide an email and bring it back exactly when you need it
- **Thread view** — full conversation history with AI summaries that cover the whole thread

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Auth | Clerk (Google OAuth with Gmail scope) |
| Email | Gmail API (`googleapis`) |
| AI | Gemini 2.0 Flash (`@google/generative-ai`) |
| Database | MongoDB Atlas |
| Hosting | DigitalOcean App Platform |
| Secrets | Doppler |
| Error Tracking | Sentry |
| Monitoring | New Relic |
| Analytics | SimpleAnalytics |

---
 

## Getting Started

### Prerequisites

- Node.js 20+
- A Google Cloud project with the Gmail API enabled
- A Clerk account with Google OAuth configured (Gmail scope: `https://mail.google.com/`)
- A MongoDB Atlas cluster
- A Google AI Studio account for your Gemini API key

### 1. Clone the repo

```bash
git clone https://github.com/pranavic72/mailmind.git
cd mailmind
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/inbox
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/inbox

# Google / Gmail
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mailmind
```

> In production, these are managed via Doppler and synced to DigitalOcean App Platform.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google, and you'll land on your triaged inbox.

---

## Project Structure

```
mailmind/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── inbox/
│   │   └── page.tsx              # Main inbox dashboard
│   ├── email/
│   │   └── [id]/page.tsx         # Email detail + reply draft
│   ├── settings/
│   │   └── page.tsx              # User preferences
│   └── api/
│       ├── emails/
│       │   ├── fetch/route.ts    # Fetch + classify inbox from Gmail
│       │   ├── [id]/route.ts     # Single email detail
│       │   ├── send/route.ts     # Send reply via Gmail
│       │   ├── read/route.ts     # Mark as read
│       │   └── snooze/route.ts   # Snooze / unsnooze
│       ├── ai/
│       │   ├── classify/route.ts # Run Gemini classification
│       │   └── reply/route.ts    # Generate reply draft
│       └── user/
│           └── settings/route.ts # Get / update preferences
├── components/
│   ├── EmailRow.tsx              # Inbox list item
│   └── ReplyDraft.tsx            # AI reply draft UI
├── lib/
│   ├── gmail.ts                  # Gmail API helpers
│   ├── ai.ts                     # Gemini classification + reply generation
│   └── mongodb.ts                # MongoDB connection + caching
└── middleware.ts                 # Clerk auth middleware
```

---

## How AI Classification Works

Every email is sent to Gemini 2.0 Flash with a strict rule-based prompt. Results are cached in MongoDB so each email is only classified once.

| Priority | When |
|---|---|
| 🔴 High | Real person, action required, deadline keywords, recruiter/client/professor |
| 🟡 Low | Informational, automated alerts (GitHub, CI), no response needed |
| ⚪ Noise | Newsletters, marketing, noreply senders, subscription emails |

Classification is deterministic (`temperature: 0.1`) and returns structured JSON. Reply drafts use a higher temperature (`0.7`) for natural-sounding output.

---

## Email Flow

```
User visits /inbox
  → Clerk verifies session
  → GET /api/emails/fetch
  → Gmail API returns last 50 messages
  → Each email: check MongoDB cache
      → Cached? Return immediately
      → Not cached? Send to Gemini → store result → return
  → Frontend renders inbox with priority badges + summaries
```

---

## Deployment

The app is designed to deploy to **DigitalOcean App Platform** from a GitHub repo.

```bash
# Build
npm run build

# Start
npm start
```

Set your build command to `npm run build` and run command to `npm start` in the DigitalOcean dashboard. Environment variables are synced from Doppler automatically.

---

## Roadmap

Phases completed:

- [x] Phase 1 — Google auth via Clerk
- [x] Phase 2 — Gmail inbox fetch + display
- [x] Phase 3 — AI classification with Gemini + MongoDB caching
- [ ] Phase 4 — Email detail view + AI reply drafts
- [ ] Phase 5 — Unread section, snooze, newsletter tab
- [ ] Phase 6 — Settings page + thread view
- [ ] Phase 7 — Sentry, New Relic, SimpleAnalytics
- [ ] Phase 8 — Production deployment to mailmind.me

---

## Out of Scope (v1)

- Multi-inbox / multiple Google accounts
- Outlook / Microsoft 365
- Mobile app
- Calendar integration
- Attachment preview
- AI-composed new emails (replies only)
- Paid plans or team features

---

## Privacy Note

Email content is processed by the Gemini API (Google AI Studio free tier). Google may use free-tier requests for model improvement. Email content is not stored by MailMind beyond your own MongoDB cache. If this is a concern, the codebase includes a guide for switching to Claude Haiku (`lib/ai.ts`).

---

## License

MIT
