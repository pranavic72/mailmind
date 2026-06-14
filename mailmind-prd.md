# MailMind — Product Requirements Document

**Version:** 1.1  
**Date:** June 2026  
**Status:** Ready for Development  
**Changelog:** v1.1 — Switched AI engine from Claude Haiku to Gemini 2.0 Flash (free, no credit card). Added switching guide in Section 10.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [Tech Stack & Tools](#4-tech-stack--tools)
5. [System Architecture](#5-system-architecture)
6. [Features & Functional Requirements](#6-features--functional-requirements)
7. [Pages & UI Specification](#7-pages--ui-specification)
8. [Data Models](#8-data-models)
9. [API Routes](#9-api-routes)
10. [AI Integration Details](#10-ai-integration-details)
11. [Build Order](#11-build-order)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Out of Scope](#13-out-of-scope)

---

## 1. Project Overview

**MailMind** is a fully deployed, AI-powered email assistant that connects to a user's Gmail inbox, intelligently triages emails by priority, surfaces unread emails that need attention, summarizes long threads, and generates context-aware reply drafts that users can accept and send in one click.

The core problem it solves: email overload. Most people open their inbox and feel overwhelmed because everything looks equally important. MailMind applies AI to do what a good human assistant would — read everything, flag what matters, ignore what doesn't, and draft replies so you just review and approve.

**Target users:** Developers, students, freelancers, and professionals who use Gmail and want to manage their inbox more efficiently without switching to a paid tool like Superhuman.

**Deployment:** Fully public. Anyone can visit the URL, log in with their Google account, and use the app immediately.

---

## 2. Goals & Success Metrics

### Goals
- Let users connect their Gmail account in under 60 seconds
- Automatically triage inbox emails into priority levels without manual configuration
- Generate usable AI reply drafts for at least 80% of emails that require a response
- Keep the app free to operate using student pack credits and free tiers

### Success Metrics
- Time from login to seeing a triaged inbox: under 10 seconds
- AI reply acceptance rate (user sends without editing): target 40%+
- Zero cost to run for the first 12 months using available credits
- Uptime: 99%+ via DigitalOcean + monitoring tools

---

## 3. User Personas

**Persona 1 — The Overwhelmed Student**  
Uses Gmail for university, internship applications, and project collaboration. Gets 30-50 emails/day. Misses important deadlines because they're buried under newsletters and automated notifications.

**Persona 2 — The Freelancer**  
Communicates with multiple clients over email. Needs to respond quickly to client messages but wastes time on low-priority admin emails. Wants AI-drafted replies to save time without sounding robotic.

**Persona 3 — The Developer**  
Receives GitHub notifications, CI alerts, team Slack digests, and occasional important business emails. Wants to filter out noise and only act on what matters.

---

## 4. Tech Stack & Tools

All tools listed below are either free via the GitHub Student Developer Pack or have a permanent free tier that does not require a credit card.

---

### 4.1 Frontend & Backend Framework

**Next.js 14+ (App Router)**
- Free, open source
- Handles both the frontend UI and backend API routes in one codebase
- App Router enables server components, which reduces client-side bundle size
- API routes replace the need for a separate Express/FastAPI backend
- Why: You already know it, it's the industry standard for full-stack React apps

---

### 4.2 Authentication — Clerk

- **Source:** GitHub Student Developer Pack (free Pro plan)
- **What it does:**
  - Handles the entire authentication flow including Google OAuth
  - Google OAuth is critical here because Clerk will request the Gmail API scope (`https://mail.google.com/`) during login, giving the app permission to read and send emails on behalf of the user
  - Manages sessions, JWTs, and user records automatically
  - Provides pre-built UI components (sign-in, user button, profile page)
  - Stores the Google OAuth access token which is passed to the Gmail API
- **How it's used in MailMind:**
  - User clicks "Sign in with Google"
  - Clerk handles OAuth flow and requests Gmail scope
  - On success, Clerk stores the access token
  - Every API route is protected with Clerk's `auth()` middleware
  - The access token is retrieved server-side via `clerkClient.users.getUserOauthAccessToken()`

---

### 4.3 Email Integration — Gmail API

- **Source:** Google Cloud Console (permanently free tier, no cost for reading/sending within quota)
- **What it does:**
  - Reads emails from the user's inbox
  - Sends emails on behalf of the user (via the send endpoint)
  - Fetches thread history for context
  - Supports label-based filtering (INBOX, UNREAD, etc.)
- **How it's used in MailMind:**
  - After auth, the app calls `gmail.users.messages.list` to fetch the inbox
  - Each email is fetched with `gmail.users.messages.get` to get subject, sender, body, date
  - Email bodies are decoded from base64 (Gmail API encodes all content)
  - Sending replies uses `gmail.users.messages.send` with a properly formatted RFC 2822 message
  - Thread IDs are preserved so replies appear in the correct thread
- **Quota:** Gmail API allows 1 billion quota units per day. Reading a message costs 5 units. Sending costs 100 units. For personal use this is effectively unlimited.

---

### 4.4 Database — MongoDB Atlas

- **Source:** GitHub Student Developer Pack ($50 Atlas credit)
- **What it does:**
  - Stores cached email metadata so the app doesn't re-fetch from Gmail on every page load
  - Stores AI-generated priority labels, summaries, and reply drafts
  - Stores user preferences (tone preference, digest settings, snooze times)
  - Stores snooze schedules for emails the user has snoozed
- **Collections:**
  - `users` — user profile and preferences
  - `emails` — cached email metadata + AI labels
  - `drafts` — AI-generated reply drafts linked to email IDs
  - `snoozes` — emails snoozed with a resurface timestamp
- **Why MongoDB over SQL:**
  - Email data is semi-structured (different fields per email type)
  - No complex relational joins needed
  - Flexible schema fits well with email metadata that varies by sender/thread

---

### 4.5 AI Engine — Google Gemini API (Gemini 2.0 Flash)

- **Source:** Google AI Studio — permanently free tier, no credit card required
- **Free tier limits:** 1,500 requests/day, 15 RPM, resets every 24 hours, never expires
- **What it does:**
  - Classifies each email as High Priority, Low Priority, or Noise using strict rule-based prompting
  - Generates a 2-3 sentence summary of the email body
  - Drafts a contextually appropriate reply based on the email content and thread history
  - Detects if an email is a newsletter/promo/automated notification
- **Why Gemini Flash specifically:**
  - 100% free with no expiry — no billing account needed
  - 1M token context window even on free tier (handles long email threads easily)
  - Fast enough for inbox-scale classification (sub-2s per email)
  - Already in the Google ecosystem alongside Gmail API — one less external dependency
- **Known caveat:** Google may use free-tier API requests to improve their models. Email content is processed but not stored by Google beyond the request. Acceptable for a personal/portfolio project; if this is a concern for future users, switching to Claude Haiku is straightforward (see Section 11 — Switching AI Provider)
- **SDK:** `@google/generative-ai` (official Node.js SDK)
- **Prompt strategy:** Covered in detail in Section 10

---

### 4.6 Secret Management — Doppler

- **Source:** GitHub Student Developer Pack (free Team plan)
- **What it does:**
  - Stores all environment variables and API keys securely
  - Syncs secrets to the DigitalOcean deployment environment automatically
  - Prevents API keys from being hardcoded or accidentally committed to GitHub
- **Secrets it manages:**
  - `MONGODB_URI`
  - `CLERK_SECRET_KEY`
  - `CLERK_PUBLISHABLE_KEY`
  - `GEMINI_API_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `NEXT_PUBLIC_CLERK_*` variables

---

### 4.7 Error Tracking — Sentry

- **Source:** GitHub Student Developer Pack (free student tier — 50K errors/month)
- **What it does:**
  - Captures and reports runtime errors on both frontend and backend
  - Groups similar errors to avoid noise
  - Shows stack traces, affected users, and frequency
  - Alerts when a new error type occurs
- **Integration points in MailMind:**
  - Gmail API failures (rate limits, token expiry)
  - Gemini API errors (timeouts, model errors)
  - MongoDB connection failures
  - Client-side JS errors in the inbox UI

---

### 4.8 Monitoring — New Relic

- **Source:** GitHub Student Developer Pack (free while student, $300/month value)
- **What it does:**
  - Monitors server response times for every API route
  - Tracks throughput (how many requests per minute)
  - Alerts if response time exceeds a threshold
  - Provides a dashboard showing app health over time
- **Key metrics to monitor in MailMind:**
  - `/api/emails/fetch` response time (Gmail API calls can be slow)
  - `/api/ai/classify` response time (Gemini API latency)
  - `/api/emails/send` success/failure rate

---

### 4.9 Analytics — SimpleAnalytics

- **Source:** GitHub Student Developer Pack (free Starter plan, 100K page views/month for 1 year)
- **What it does:**
  - Privacy-friendly page view tracking (no cookies, no GDPR banner needed)
  - Shows which pages users visit and how long they stay
  - Tracks feature usage without collecting personal data
- **Why not Google Analytics:**
  - Requires a cookie consent banner (adds friction)
  - SimpleAnalytics is cookieless and GDPR-compliant by default
  - Simpler dashboard, less noise

---

### 4.10 Hosting — DigitalOcean App Platform

- **Source:** GitHub Student Developer Pack ($200 credit, valid 1 year)
- **What it does:**
  - Hosts the Next.js application as a web service
  - Automatically builds from GitHub on every push (CI/CD built in)
  - Handles SSL termination, load balancing, and auto-restarts
  - Scales horizontally if traffic increases
- **Plan used:** Basic plan ($5/month equivalent) — $200 credit covers 40 months of this tier
- **Deployment config:**
  - Connect GitHub repo to DigitalOcean App Platform
  - Set build command: `npm run build`
  - Set run command: `npm start`
  - Environment variables pulled from Doppler via DigitalOcean's env var integration

---

### 4.11 Domain & SSL — Namecheap

- **Source:** GitHub Student Developer Pack (free `.me` domain for 1 year + free SSL certificate)
- **Domain:** `mailmind.me` (or similar)
- **SSL:** Free certificate included — enables HTTPS which is required for OAuth flows
- **DNS:** Point Namecheap nameservers to DigitalOcean's DNS records
- **Why this matters:** Google OAuth requires a verified HTTPS domain. Without a real domain + SSL, the Google OAuth consent screen won't work in production.

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                     User Browser                     │
│              Next.js Frontend (React)                │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│           Next.js App (DigitalOcean)                 │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Clerk Auth   │    │    API Routes             │   │
│  │ Middleware   │───▶│  /api/emails/fetch        │   │
│  └──────────────┘    │  /api/emails/send         │   │
│                      │  /api/ai/classify         │   │
│                      │  /api/ai/reply            │   │
│                      │  /api/snooze              │   │
│                      └────────────┬─────────────┘   │
└───────────────────────────────────┼─────────────────┘
                                    │
              ┌─────────────────────┼──────────────────┐
              │                     │                   │
              ▼                     ▼                   ▼
    ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐
    │   Gmail API     │  │  Gemini API      │  │  MongoDB     │
    │  (Google Cloud) │  │  (Flash model)   │  │  Atlas       │
    └─────────────────┘  └──────────────────┘  └──────────────┘
              │                     │                   │
              └─────────────────────┴───────────────────┘
                                    │
              ┌─────────────────────┼──────────────────┐
              │                     │                   │
              ▼                     ▼                   ▼
    ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐
    │    Sentry       │  │   New Relic      │  │SimpleAnalytics│
    │ (error tracking)│  │  (monitoring)    │  │ (analytics)  │
    └─────────────────┘  └──────────────────┘  └──────────────┘
```

### Data Flow — Fetching & Classifying Emails

```
1. User visits /inbox
2. Clerk middleware verifies session
3. Frontend calls GET /api/emails/fetch
4. API route retrieves Google access token from Clerk
5. Calls Gmail API → gets list of message IDs
6. For each message: fetch full email data from Gmail
7. Check MongoDB cache — if email already classified, return cached result
8. If not cached: send email to Gemini API for classification
9. Gemini returns: priority level + summary + reply draft
10. Store result in MongoDB
11. Return classified emails to frontend
12. Frontend renders inbox with labels, summaries, reply drafts
```

### Data Flow — Sending a Reply

```
1. User views email, sees AI-suggested reply
2. User clicks "Send" (or edits then sends)
3. Frontend calls POST /api/emails/send
4. API route retrieves Google access token from Clerk
5. Constructs RFC 2822 formatted email with correct thread headers
6. Calls Gmail API send endpoint
7. On success: marks email as replied in MongoDB
8. Frontend updates UI to show "Replied" status
```

---

## 6. Features & Functional Requirements

### 6.1 Google Authentication

**Description:** Users log in exclusively via Google OAuth. No username/password. The OAuth flow requests Gmail API scope so the app can read and send emails.

**Requirements:**
- One-click "Sign in with Google" on the landing page
- Clerk handles the OAuth flow and stores the access token
- If the access token expires, Clerk automatically refreshes it
- On first login, user is taken directly to `/inbox`
- On subsequent visits, user is auto-redirected to `/inbox` if session is active
- Logout clears the session and revokes Gmail access

---

### 6.2 Inbox Triage — Priority Classification

**Description:** Every email in the inbox is classified into one of three priority levels by Gemini. The classification is cached in MongoDB so it doesn't re-run on every page load.

**Priority Levels:**

| Level | Label | Criteria |
|---|---|---|
| 🔴 High | High Priority | Requires action, from a real person, deadline-sensitive, or contains keywords like "urgent", "deadline", "invoice", "offer" |
| 🟡 Low | Low Priority | Informational, from a known contact but no action needed, automated alerts |
| ⚪ Noise | Noise / Skip | Newsletters, marketing, automated notifications, subscription emails |

**Requirements:**
- Classification runs on inbox fetch, not on-demand
- Results are cached — re-classification only happens if user manually triggers it
- User can manually override a classification (drag to different category)
- Classification label is shown as a colored badge on each email row
- Unread emails get an additional "Unread" badge regardless of priority

---

### 6.3 Unread Email Highlighting

**Description:** Unread emails are visually distinguished from read ones and surfaced in a dedicated section at the top of the inbox.

**Requirements:**
- Unread emails shown in a separate "Unread" section above the main inbox
- Bold sender name and subject for unread emails (standard email convention)
- Unread count shown in the page title and browser tab (`(3) Inbox — MailMind`)
- Marking an email as read updates the UI without a full page reload
- Bulk "Mark all as read" button available

---

### 6.4 Email Summary

**Description:** Long emails are automatically summarized into 2-3 sentences so users can understand the key point without reading the full body.

**Requirements:**
- Summary shown as a preview beneath the subject line in the inbox list view
- Full email body still accessible when the email is opened
- Summary is generated by Gemini and stored in MongoDB
- For short emails (under 100 words), the body itself is shown instead of a summary
- Thread emails summarize the entire thread, not just the latest message

---

### 6.5 AI Reply Drafts

**Description:** For each email that appears to require a response, Claude generates a draft reply. The user can accept it as-is, edit it, or discard it.

**Requirements:**
- Draft reply shown in the email detail view beneath the email body
- Tone selector: Formal / Friendly / Brief (defaults to user preference from settings)
- "Accept & Send" button sends immediately
- "Edit" button opens the draft in an editable textarea
- "Regenerate" button calls Gemini again with a note to try a different approach
- "Discard" hides the draft
- Drafts are stored in MongoDB linked to the email ID
- If the email is a newsletter or automated notification, no reply draft is generated

---

### 6.6 Thread View

**Description:** Email threads (back-and-forth conversations) are grouped under a single entry in the inbox list. Opening a thread shows the full conversation history.

**Requirements:**
- Threads grouped by Gmail thread ID
- Thread entry shows participant count and latest message preview
- Inside a thread, messages shown in chronological order
- Collapse/expand individual messages within a thread
- AI summary covers the entire thread, not just the last message
- Reply draft is aware of the full thread context

---

### 6.7 Snooze

**Description:** Users can snooze an email so it disappears from the inbox and reappears at a specified time.

**Requirements:**
- Snooze button on each email row (hover to reveal)
- Quick snooze options: Later today, Tomorrow, Next week, Custom date/time
- Snoozed emails stored in MongoDB with a `resurface_at` timestamp
- A background check (on inbox load) surfaces emails whose snooze time has passed
- Snoozed emails shown in a separate "Snoozed" tab
- Unsnooze button available on snoozed emails

---

### 6.8 Newsletter / Unsubscribe Detection

**Description:** Emails that are newsletters, marketing, or have an unsubscribe link are automatically flagged and separated from the main inbox.

**Requirements:**
- Detected by Gemini during classification (checks for `List-Unsubscribe` header + content patterns)
- Shown in a separate "Newsletters" tab, not in the main inbox
- "Unsubscribe" button visible on detected newsletter emails
- Unsubscribe uses the `List-Unsubscribe` email header to send an unsubscribe request automatically
- Count badge on "Newsletters" tab showing how many new ones arrived

---

### 6.9 Tone Preference (Settings)

**Description:** Users can set their preferred reply tone which is applied to all AI-generated drafts by default.

**Requirements:**
- Three options: Formal, Friendly, Brief
- Stored in MongoDB under the user's profile
- Applied automatically to all new reply drafts
- Can be overridden per-email using the tone selector on the reply draft
- Accessible from the `/settings` page and as a quick toggle in the sidebar

---

### 6.10 Daily Digest (Optional Toggle)

**Description:** A morning summary email sent to the user at 8am listing what needs attention that day.

**Requirements:**
- Off by default, opt-in from settings
- Digest sent via Gmail API (from user's own account to themselves)
- Contains: count of high priority unread emails, top 3 urgent threads, any emails with today's deadlines detected in body
- Scheduled using a cron job running on DigitalOcean (a lightweight Node script)
- User can set preferred time (default 8am, timezone auto-detected)

---

## 7. Pages & UI Specification

### `/` — Landing Page
- Headline: "Your inbox, intelligently triaged"
- Subheadline: brief one-liner on what MailMind does
- "Sign in with Google" button (Clerk component)
- 3 feature highlights with icons
- SimpleAnalytics script included
- No navbar (pre-auth)

### `/inbox` — Main Dashboard
- Left sidebar: Inbox, Unread, Snoozed, Newsletters, Settings nav links + unread counts
- Main content: Email list, sorted by priority (High first, then Low, then Noise)
- Each email row shows: priority badge, sender, subject, summary preview, date, unread indicator
- Search bar at the top (client-side filter by sender/subject)
- Refresh button to re-fetch from Gmail
- Bulk actions: Mark as read, Snooze, Archive

### `/email/[id]` — Email Detail View
- Back button to inbox
- Email header: sender, recipient, date, subject
- Priority badge + classification reasoning (tooltip)
- Full email body
- Thread history (collapsible)
- AI Summary section
- Reply draft section with tone selector, Edit / Accept & Send / Discard / Regenerate buttons
- Snooze button in top-right

### `/settings` — User Settings
- Default reply tone (Formal / Friendly / Brief)
- Daily digest toggle + time picker
- Connected account info (Google account name/email)
- Disconnect account button (revokes Gmail access)
- Theme toggle (light / dark)

---

## 8. Data Models

### users
```json
{
  "_id": "clerk_user_id",
  "email": "user@gmail.com",
  "name": "Navi",
  "tone_preference": "friendly",
  "digest_enabled": false,
  "digest_time": "08:00",
  "timezone": "Europe/Berlin",
  "created_at": "2026-06-01T00:00:00Z"
}
```

### emails
```json
{
  "_id": "gmail_message_id",
  "user_id": "clerk_user_id",
  "thread_id": "gmail_thread_id",
  "subject": "Re: Project proposal",
  "sender": "client@company.com",
  "sender_name": "Anna Schmidt",
  "snippet": "Thanks for sending this over...",
  "body": "Full decoded email body...",
  "date": "2026-06-10T09:30:00Z",
  "is_read": false,
  "is_snoozed": false,
  "priority": "high",
  "category": "inbox",
  "ai_summary": "Client is requesting a revised proposal by Friday with updated pricing.",
  "classification_reason": "Contains a deadline and requires action from the recipient.",
  "is_newsletter": false,
  "cached_at": "2026-06-10T09:35:00Z"
}
```

### drafts
```json
{
  "_id": "ObjectId",
  "email_id": "gmail_message_id",
  "user_id": "clerk_user_id",
  "thread_id": "gmail_thread_id",
  "draft_text": "Hi Anna, thanks for following up. I'll send over the revised proposal with updated pricing by Thursday EOD. Let me know if you need anything in the meantime.",
  "tone": "friendly",
  "status": "pending",
  "created_at": "2026-06-10T09:36:00Z"
}
```

### snoozes
```json
{
  "_id": "ObjectId",
  "email_id": "gmail_message_id",
  "user_id": "clerk_user_id",
  "resurface_at": "2026-06-11T08:00:00Z",
  "created_at": "2026-06-10T10:00:00Z"
}
```

---

## 9. API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/emails/fetch` | Fetch inbox from Gmail, classify, cache in MongoDB |
| GET | `/api/emails/[id]` | Get single email detail + draft from MongoDB |
| POST | `/api/emails/send` | Send a reply via Gmail API |
| POST | `/api/emails/read` | Mark email as read |
| POST | `/api/emails/snooze` | Snooze an email with a resurface time |
| DELETE | `/api/emails/snooze/[id]` | Remove snooze |
| POST | `/api/ai/classify` | Run Gemini classification on a single email |
| POST | `/api/ai/reply` | Generate or regenerate a reply draft via Gemini |
| GET | `/api/user/settings` | Get user preferences |
| PUT | `/api/user/settings` | Update user preferences |

All routes are protected by Clerk's `auth()` middleware. Unauthenticated requests return 401.

---

## 10. AI Integration Details

### SDK Setup

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
```

---

### Classification Prompt

The prompt uses few-shot examples and explicit rigid rules to prevent Gemini from hedging or misclassifying. This directly addresses the common failure mode where models label everything "low" when criteria are vague.

```
You are a strict email triage system. Classify the email below.

CLASSIFICATION RULES — follow these exactly:

HIGH PRIORITY if ANY of these are true:
- Sender is a real person (not automated/noreply)
- Contains words: urgent, asap, deadline, invoice, interview, offer,
  payment, contract, expires, action required, respond by, due date
- Requires a response from the recipient
- From a recruiter, employer, professor, client, or teammate

LOW PRIORITY if:
- Informational only, no action needed
- From a real person but nothing time-sensitive
- Automated alerts (GitHub, CI, monitoring tools)

NOISE if:
- Newsletter, marketing, promotional
- Has an unsubscribe link
- From a noreply@ address
- Subscription confirmation or receipt

---

EXAMPLES:

Email: From: anna@company.com | Subject: "Quick question about your proposal"
Output: {"priority": "high", "reason": "Real person asking a question that requires a response", "summary": "Anna is asking about the proposal and needs a reply.", "requires_reply": true, "is_newsletter": false}

Email: From: noreply@github.com | Subject: "Your PR was merged"
Output: {"priority": "low", "reason": "Automated GitHub notification, no action needed", "summary": "A pull request was merged on GitHub.", "requires_reply": false, "is_newsletter": false}

Email: From: newsletter@medium.com | Subject: "Top stories this week"
Output: {"priority": "noise", "reason": "Newsletter with unsubscribe link", "summary": "Weekly newsletter from Medium.", "requires_reply": false, "is_newsletter": true}

---

Now classify this email:
From: {sender}
Subject: {subject}
Body (first 500 chars): {body_snippet}

Return only this JSON, nothing else — no markdown, no backticks, no explanation:
{
  "priority": "high" | "low" | "noise",
  "reason": "one sentence",
  "summary": "2-3 sentence summary",
  "requires_reply": true | false,
  "is_newsletter": true | false
}
```

---

### Reply Draft Prompt

```
You are an email assistant helping draft a reply.

Original email:
From: {sender}
Subject: {subject}
Body: {body}

Thread history (if any):
{thread_history}

User's preferred tone: {tone}
- formal: professional, complete sentences, no contractions
- friendly: warm, conversational, natural
- brief: short, direct, under 3 sentences

Draft a reply that:
1. Directly addresses the main point of the email
2. Is appropriately {tone} in tone
3. Does not include a subject line
4. Does not include sign-off (user will add their own)
5. Does not start with "I hope this email finds you well" or similar filler phrases

Return only the reply text, no markdown, no other content.
```

---

### Model Configuration

```typescript
// Classification — deterministic, strict JSON output
const classificationConfig = {
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.1,       // Low — we want consistent, rule-based output
    maxOutputTokens: 300,
    responseMimeType: "application/json",  // Forces JSON output natively
  },
};

// Reply draft — slightly creative
const replyConfig = {
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,       // Higher — natural-sounding replies
    maxOutputTokens: 400,
  },
};
```

**Note:** Setting `responseMimeType: "application/json"` on the Gemini API call forces the model to return valid JSON without markdown fences or explanation text. This eliminates the need to strip backticks before parsing.

---

### Switching to Claude Haiku Later

If you want to move off Gemini (e.g. privacy concerns about Google training on email data, or you want better classification quality), switching to Claude Haiku is a 4-step process:

**Step 1 — Swap the SDK**
```bash
npm uninstall @google/generative-ai
npm install @anthropic-ai/sdk
```

**Step 2 — Update `lib/ai.ts`**
```typescript
// Before (Gemini)
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// After (Claude Haiku)
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

**Step 3 — Update the API call**
```typescript
// Before (Gemini)
const result = await model.generateContent(prompt);
const text = result.response.text();

// After (Claude Haiku)
const message = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 300,
  messages: [{ role: "user", content: prompt }],
});
const text = message.content[0].type === "text" ? message.content[0].text : "";
```

**Step 4 — Update Doppler**
- Remove `GEMINI_API_KEY`
- Add `ANTHROPIC_API_KEY`
- Redeploy on DigitalOcean (picks up new env vars automatically)

The prompts themselves do not need to change — both models respond well to the same classification and reply prompt structure.

---

## 11. Build Order

Each phase is a shippable milestone. Do not move to the next phase until the current one works end-to-end.

---

### Phase 1 — Auth & Gmail Connection (Days 1–2)

**Goal:** User can log in with Google and the app can read their emails.

Steps:
1. Initialize Next.js 14 project with App Router (`npx create-next-app@latest`)
2. Install and configure Clerk (`@clerk/nextjs`)
3. Set up Google OAuth in Google Cloud Console — enable Gmail API, create OAuth credentials
4. Configure Clerk to use Google as the OAuth provider with Gmail scope (`https://mail.google.com/`)
5. Create landing page (`/`) with Clerk's `<SignInButton>` component
6. Create middleware to protect all routes under `/inbox` and `/api`
7. Test: log in with Google, verify Clerk stores the access token
8. Write `/api/test-gmail` route that retrieves the access token and calls `gmail.users.getProfile` to confirm Gmail access works
9. Set up Doppler project and add all environment variables

**Done when:** You can log in and see your own Gmail profile info returned from the API.

---

### Phase 2 — Fetch & Display Emails (Days 3–4)

**Goal:** Inbox page shows real emails from Gmail.

Steps:
1. Install Google APIs client (`googleapis`)
2. Write `lib/gmail.ts` helper — functions for `listMessages`, `getMessage`, `sendMessage`
3. Write `GET /api/emails/fetch` route:
   - Get access token from Clerk
   - Call Gmail API to list last 50 inbox messages
   - Fetch full data for each message
   - Decode base64 email bodies
   - Return structured array of email objects
4. Build `/inbox` page — fetch emails on load using `useEffect` or server component
5. Build `EmailRow` component — shows sender, subject, snippet, date, unread indicator
6. Build basic inbox list UI (no AI yet)
7. Connect MongoDB — set up Atlas cluster, create database `mailmind`, add connection string to Doppler

**Done when:** You can see your real Gmail inbox rendered on the `/inbox` page.

---

### Phase 3 — AI Classification (Days 5–6)

**Goal:** Every email in the inbox has a priority label and a summary.

Steps:
1. Install Google Generative AI SDK (`@google/generative-ai`)
2. Write `lib/ai.ts` — `classifyEmail(email)` function that sends the classification prompt to Gemini Flash and parses the JSON response (use `responseMimeType: "application/json"` to avoid needing to strip markdown fences)
3. Write `POST /api/ai/classify` route that accepts an email object and returns classification result
4. Modify `/api/emails/fetch` to:
   - For each fetched email, check MongoDB cache first
   - If not cached, call `classifyEmail()` and store result in MongoDB
   - Return cached result if available
5. Update `EmailRow` component to show priority badge (🔴🟡⚪) and summary text
6. Add loading skeleton so inbox renders progressively as emails are classified
7. Test with a variety of email types — newsletters, client emails, automated alerts

**Done when:** Every email in your inbox has a priority label and 2-3 sentence summary.

---

### Phase 4 — Email Detail & Reply Drafts (Days 7–8)

**Goal:** User can open an email, read the full body, and see an AI reply draft.

Steps:
1. Build `/email/[id]` page — fetches single email from MongoDB (or Gmail if not cached)
2. Show full email body (handle both plain text and HTML emails)
3. Write `lib/ai.ts` → `generateReply(email, thread, tone)` function
4. Write `POST /api/ai/reply` route
5. Build `ReplyDraft` component:
   - Shows draft text
   - Tone selector (Formal / Friendly / Brief)
   - Edit button → converts to textarea
   - "Accept & Send" button
   - "Regenerate" button
   - "Discard" button
6. Write `POST /api/emails/send` route:
   - Construct RFC 2822 formatted email
   - Set correct `In-Reply-To` and `References` headers for threading
   - Call `gmail.users.messages.send`
   - Mark email as replied in MongoDB
7. Test the full loop: open email → see draft → edit → send → verify it lands in the thread

**Done when:** You can send a reply from inside the app and it appears correctly in the Gmail thread.

---

### Phase 5 — Unread, Snooze, Newsletters (Days 9–10)

**Goal:** All inbox management features working.

Steps:
1. Add unread section at top of inbox — filter by `is_read: false`
2. Bold styling for unread email rows
3. "Mark as read" on email open — calls `gmail.users.messages.modify` to remove UNREAD label + updates MongoDB
4. Build snooze feature:
   - Snooze button on email row
   - Quick options dropdown (Later today / Tomorrow / Next week / Custom)
   - `POST /api/emails/snooze` stores to `snoozes` collection
   - On inbox load, check for emails whose `resurface_at` has passed and surface them
5. Add "Snoozed" tab in sidebar showing snoozed emails
6. Build newsletter detection display — separate "Newsletters" tab
7. Unsubscribe button — reads `List-Unsubscribe` header, sends unsubscribe request

**Done when:** Unread section works, snooze works, newsletters are separated.

---

### Phase 6 — Settings & Thread View (Day 11)

**Goal:** User preferences and full thread context.

Steps:
1. Build `/settings` page
2. Tone preference selector — saves to MongoDB `users` collection
3. Daily digest toggle + time picker (digest cron job is Phase 8)
4. Build thread view inside `/email/[id]` — fetch all messages in the thread, display in order
5. Thread-aware reply draft — pass full thread history to Gemini
6. Update classification summary to cover the full thread

**Done when:** Settings save and persist, threads display correctly, reply drafts reference thread context.

---

### Phase 7 — Monitoring, Error Tracking & Analytics (Day 12)

**Goal:** Production-grade observability before going live.

Steps:
1. Install and configure Sentry (`@sentry/nextjs`) — both client and server
2. Add Sentry error boundaries around inbox and email detail pages
3. Wrap all API routes with try/catch that reports to Sentry
4. Install New Relic Node.js agent — configure for the DigitalOcean environment
5. Add SimpleAnalytics script to the root layout (`<Script>` tag)
6. Add custom Sentry tags: `user_id`, `email_count`, `ai_model` on each AI API call
7. Test error reporting by intentionally triggering an error and verifying it shows in Sentry

**Done when:** Errors show in Sentry, API metrics visible in New Relic, page views in SimpleAnalytics.

---

### Phase 8 — Deployment (Days 13–14)

**Goal:** App is live on a real domain with HTTPS.

Steps:
1. Push final code to GitHub (main branch)
2. Connect GitHub repo to DigitalOcean App Platform
3. Configure build: `npm run build`, run: `npm start`, Node 20
4. Connect Doppler to DigitalOcean — sync environment variables
5. Deploy first version — verify build succeeds
6. Register `mailmind.me` on Namecheap (use student pack)
7. Point Namecheap nameservers to DigitalOcean
8. Add custom domain in DigitalOcean App Platform settings
9. Enable SSL (DigitalOcean handles Let's Encrypt automatically)
10. Update Google OAuth credentials to include the production domain as an authorized redirect URI
11. Update Clerk's allowed redirect URLs to include production domain
12. Smoke test the full flow on production: login → inbox → open email → send reply
13. Set up DigitalOcean alert if monthly spend approaches credit limit

**Done when:** App is live at `mailmind.me`, login works, emails load, replies send.

---

### Phase 9 — Daily Digest Cron (Day 15, optional)

**Goal:** Users who opt in receive a morning email summary.

Steps:
1. Write `scripts/digest.ts` — queries MongoDB for each user with `digest_enabled: true`
2. For each user: fetches their high-priority unread emails from MongoDB
3. Constructs a summary email and sends via Gmail API
4. Schedule as a DigitalOcean App Platform job (built-in cron support)
5. Set cron schedule: `0 6 * * *` (6am UTC = 8am CET)

---

## 12. Non-Functional Requirements

**Performance**
- Inbox load time (cached): under 2 seconds
- Inbox load time (first visit, no cache): under 10 seconds
- Reply draft generation: under 3 seconds

**Security**
- All routes protected by Clerk authentication middleware
- Google access tokens never exposed to the client — only used server-side
- All secrets stored in Doppler, never in `.env` files committed to Git
- MongoDB connection uses connection string with credentials, not open access
- HTTPS enforced on all routes

**Reliability**
- Gmail API errors (rate limits, token expiry) handled gracefully with user-facing error messages
- MongoDB connection failures fall back to fetching fresh from Gmail (no cached data)
- Gemini API timeouts (>10s) fall back to showing email without summary/draft

**Privacy**
- Email content is sent to Gemini API for processing. Google may use free-tier requests for model training — acceptable for personal use, but users should be made aware via the privacy notice on the landing page
- SimpleAnalytics used instead of Google Analytics to avoid cookie consent requirements
- No email content stored beyond the MongoDB cache (which belongs to the user's own account)

---

## 13. Out of Scope

The following features are explicitly not included in v1 and may be considered for future versions:

- Multi-inbox support (multiple Google accounts)
- Outlook / Microsoft 365 integration
- Mobile app (iOS/Android)
- Calendar integration (detecting meetings in emails)
- Attachment preview or download
- Email search beyond client-side filtering
- AI-generated email composition (new emails, not replies)
- Team/shared inbox support
- Pricing tiers or paid plans

---

*End of PRD — MailMind v1.0*
