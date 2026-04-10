# Product Requirements Document
> **Status:** TEMPLATE — problem context pending
> **Event:** GCU + AWS Cloud-a-thon · Grand Canyon University · Phoenix, AZ
> **Stack:** `lean-mvp-ec2-s3-cf-1.0`
> **Last updated:** [Date]

---

## How to use this document

This PRD is pre-wired to the repo's architecture, constraints, and CI/CD pipeline.
Sections marked `<!-- FILL IN -->` require problem-specific context before the team builds.
Sections marked `[LOCKED]` reflect decisions already made and should not be changed.

**Fill in this order:**
1. Section 01 — Problem statement (do this first, everything else flows from it)
2. Section 02 — Solution overview
3. Section 03 — MVP scope (P0 feature list)
4. Section 09 — Success metrics and demo scenario
5. Section 07 — Team and roles
6. Section 13 — User stories (after P0 is locked)

Everything else is pre-filled from the stack and architecture decisions.

---

## 01 · Problem statement `<!-- FILL IN -->`

> One paragraph max. Answer three questions: who is hurting, what is the pain today,
> and what does winning look like for them.

**Nonprofit partner:**
<!-- Circle the City OR CityServe Arizona -->

**Who is affected:**
<!-- e.g. "Street medicine nurses at Circle the City who deliver care in river bottoms..." -->

**The pain today:**
<!-- e.g. "Currently they have no way to X because Y, which means Z happens every time." -->

**What success looks like:**
<!-- e.g. "A nurse can accomplish X in under 2 minutes with no internet connection." -->

---

## 02 · Solution overview `<!-- FILL IN -->`

**The one-liner:**
<!-- One sentence. "An AWS-powered tool that does X for Y by using Z." -->

**How it works — user flow:**
1. <!-- User does... -->
2. <!-- System does... -->
3. <!-- User gets... -->

**The 60-second demo moment:**
<!-- Describe exactly what the judge sees that makes them say "wow". Be specific. -->

**Key differentiator:**
<!-- What makes this meaningfully better than doing nothing or using something else? -->

---

## 03 · MVP scope `<!-- FILL IN -->`

> Baseline infra is locked to EC2 + S3 + CloudFront until the Definition of Done is green.
> After DoD is confirmed, Lambda, Bedrock, DynamoDB, and RDS are all available — add them
> only when the problem genuinely requires them, not by default.
> No Terraform module refactors at any point once the first apply succeeds.

### P0 — must ship (no demo without these)

- [ ] CloudFront URL loads the React frontend `[LOCKED — baseline]`
- [ ] `/health` returns `200 {"status":"ok"}` from EC2 `[LOCKED — baseline]`
- [ ] `/api/integrations` returns service map `[LOCKED — baseline]`
- [ ] Basic authentication — login page, protected routes, session token `[REQUIRED]`
- [ ] <!-- Feature 1 — describe in one line -->
- [ ] <!-- Feature 2 — describe in one line -->
- [ ] <!-- Feature 3 — describe in one line -->

### P1 — nice to have (only if P0 is green before hour 16)

- [ ] <!-- Feature A -->
- [ ] <!-- Feature B -->

### Explicitly out of scope

- Production-grade error handling and logging `[LOCKED]`
- Mobile-specific UI `[LOCKED]`
- Terraform module refactoring after first apply `[LOCKED]`
- Any feature not demo-able in 60 seconds `[LOCKED]`
- Multi-factor authentication, OAuth, SSO — basic token auth only
- <!-- Add any solution-specific out-of-scope items here -->

---

## 04 · AWS architecture

> The baseline infra (EC2 + S3 + CloudFront) is locked until DoD is green.
> The services in the "available after DoD" table below are approved for use once
> the baseline is confirmed — add them when the problem requires them, not speculatively.

### Baseline services `[LOCKED until DoD is green]`

| Service | Purpose | Why this, not something else |
|---|---|---|
| EC2 (t3.micro) | FastAPI + Uvicorn backend host, SSM-managed | Single process, no cold starts, SSM eliminates SSH complexity |
| S3 | React static build hosting + backend deploy packages | Already in stack, zero additional cost |
| CloudFront | CDN in front of S3 | HTTPS out of the box, cache invalidation wired to CI |

### Available after DoD is green (use when the problem requires it)

| Service | Use when you need... | Judges hear... |
|---|---|---|
| Amazon Bedrock | LLM inference, text generation, summarization | "Keeps all data inside the AWS boundary — no external API calls" |
| AWS Lambda | Async/background processing, event-driven tasks, anything that shouldn't block the HTTP response | "Serverless burst capacity — zero cost when idle, scales instantly" |
| Amazon DynamoDB | Fast key-value lookups, session storage, event logs, anything schema-less | "Single-digit millisecond reads, no schema migration overhead" |
| Amazon RDS (PostgreSQL) | Relational data, joins, structured queries, anything needing ACID guarantees | "Managed Postgres — same queries your team already knows" |

> **Decision rule:** If you can do it in FastAPI on EC2 without significant pain, do it there.
> Add a new service only when the EC2 approach creates a real constraint (blocking I/O,
> data model mismatch, cost at scale). Each new service needs a one-sentence judge justification.

### Request flow

```
Browser → CloudFront → S3           (React frontend — static)
Browser → EC2:8000                  (FastAPI backend — auth, /health, /api/integrations + new routes)
EC2     → Bedrock / Lambda / DynamoDB / RDS  (when needed — called from FastAPI via boto3)
```

### Local dev flow

```
localhost:5173 (Vite dev server)
  → proxy /api    → localhost:8000
  → proxy /health → localhost:8000
```

### Additional AWS services chosen for this solution `<!-- FILL IN -->`

| Service | Purpose | Justification for judges |
|---|---|---|
| <!-- e.g. Amazon Bedrock --> | <!-- e.g. LLM inference for report generation --> | <!-- e.g. Data stays inside AWS boundary, HIPAA-eligible service --> |

---

## 05 · Tech stack `[LOCKED]`

| Layer | Technology | Constraints |
|---|---|---|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS | `noUnusedLocals` and `noUnusedParameters` are `false` — do not re-enable |
| API client | Axios via `frontend/src/api/client.ts` | Reads `VITE_API_URL` env var |
| Backend | FastAPI + Uvicorn (Python 3.12) | All config via Pydantic Settings + `.env` |
| Infra | Terraform — local state | Single flat `main.tf`, no modules |
| CI/CD | GitHub Actions — 3 workflows | Path-filtered; never hardcode resource IDs |
| EC2 access | AWS SSM only | No SSH keys, no SSH ingress rules |

---

## 06 · API contract `[LOCKED — DO NOT CHANGE RESPONSE SHAPES]`

> The two baseline routes below are frozen for the entire event.
> Never rename keys, add top-level keys, or change response structure.
> The frontend depends on these exact shapes.
> Auth routes are new additions — they follow the same rule once defined.

### Frozen baseline routes

```
GET /health
→ { "status": "ok", "environment": "local" }

GET /api/integrations
→ { "services": { "analytics": "", "notifications": "", "payments": "" } }
```

### Auth routes `[REQUIRED — define shapes before building]`

Basic token-based auth using FastAPI's built-in security utilities.
JWT stored in an `httpOnly` cookie or `Authorization` header — choose one and freeze it.

```
POST /auth/login
body:  { "username": "...", "password": "..." }
→     { "access_token": "...", "token_type": "bearer" }

POST /auth/logout
→     { "message": "logged out" }

GET  /auth/me
→     { "username": "...", "role": "..." }
```

> All protected routes return `401 Unauthorized` when no valid token is present.
> The frontend redirects to `/login` on any 401 — wire this in `frontend/src/api/client.ts`.

### New routes for this solution `<!-- FILL IN -->`

New backend functionality goes here as new routes — never by modifying the frozen routes above.

| Method | Route | Auth required | Request body | Response | Purpose |
|---|---|---|---|---|---|
| <!-- POST --> | <!-- /api/... --> | <!-- yes/no --> | <!-- { } --> | <!-- { } --> | <!-- ... --> |

### Adding new service integrations

New integrations are surfaced through `SERVICE_ENDPOINTS_JSON` in `backend/.env`.
Do not add new top-level response keys to the `/api/integrations` route.

```env
SERVICE_ENDPOINTS_JSON={"analytics":"https://...","notifications":"","payments":""}
```

---

## 07 · Team and roles `<!-- FILL IN -->`

| Name | Role | Owns |
|---|---|---|
| <!-- Name --> | Infra / DevOps | Terraform, GitHub Actions, AWS credentials, DoD verification |
| <!-- Name --> | Backend | FastAPI routes, boto3 integrations, `.env` config |
| <!-- Name --> | Frontend | React pages, Tailwind UI, Axios calls |
| <!-- Name --> | PM / Design | PRD, demo script, slides, 60-second pitch |

**Demo owner (presents to judges):** <!-- Name -->
**Decision maker when team is blocked:** <!-- Name -->

---

## 08 · CI/CD and branch strategy `[LOCKED]`

### Branch flow

```
feature/* → test → dev → main
```

| Branch | CI behavior |
|---|---|
| `feature/*` | No CI — local testing only |
| `test` | `backend-ci.yml` — /health smoke check |
| `dev` | `backend-ci.yml` on PR · `terraform-deploy.yml` on push (full deploy) |
| `main` | Same as `dev` — production |

### Workflow summary

| File | Trigger | What it does |
|---|---|---|
| `backend-ci.yml` | push/PR on `test`, `dev`, `main` — `backend/**` | /health smoke check |
| `terraform-plan.yml` | PR into `dev` or `main` — `infra/**` | terraform plan only |
| `terraform-deploy.yml` | push to `dev` or `main` — any path | infra adopt/apply → EC2 checks → backend SSM deploy → S3 sync → CloudFront invalidation |

### Required GitHub Secrets (3 only — never add more)

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
```

---

## 09 · Success metrics `<!-- FILL IN -->`

**The demo scenario (write this like a script):**
<!-- Step-by-step: "Judge watches me open the app. I type in X. I click Y.
     The screen shows Z in under N seconds. The problem is solved." -->

**Measurable outcomes:**
1. <!-- e.g. "Report generated in under 10 seconds for any valid input" -->
2. <!-- e.g. "Zero manual steps required after the user submits the form" -->

**Judging criteria alignment:**

| Criterion | How we hit it |
|---|---|
| Innovation | <!-- e.g. "Applying Bedrock to automate a task that takes staff 40+ hours manually" --> |
| Technical complexity | <!-- e.g. "Bedrock + FastAPI + EC2 + S3 + CloudFront wired end-to-end with CI/CD" --> |
| Real-world impact | <!-- e.g. "Directly reduces reporting burden for a real Phoenix nonprofit" --> |
| Presentation quality | Demo scripted, rehearsed, Loom backup recorded by 2pm Saturday |

---

## 10 · Definition of Done `[LOCKED]`

All four must be green before any feature work begins.

- [ ] `terraform apply` is repeatable and the full pipeline passes end-to-end at least once
- [ ] CloudFront URL loads the React frontend
- [ ] EC2 is running, SSM-managed, and receives backend deploys from CI
- [ ] `/health` returns `{"status":"ok"}` from `localhost:8000` and from the EC2 public IP

**If DoD is not green by hour 3 — stop adding features. Finish only the core path.**

---

## 11 · 24-hour timeline `[LOCKED — fill in feature milestones only]`

| Time | Milestone | Owner |
|---|---|---|
| 0:00–0:45 | Clone repo, run setup script, local backend + frontend green | Infra |
| 0:45–1:45 | `terraform init && apply`, verify all outputs | Infra |
| 1:45–2:20 | Add GitHub secrets, push to trigger pipeline, first pass green | Infra |
| 2:20–3:00 | Confirm all 4 DoD items green — architecture is now frozen | All |
| 3:00–10:00 | P0 feature build — backend routes + frontend pages | Backend + FE |
| 10:00–16:00 | Integration, end-to-end flow working, P0 features merged to `dev` | All |
| 16:00–20:00 | Polish, bug fixes, push to `main`, production deploy confirmed | All |
| 20:00–22:00 | Demo rehearsal, slide deck prep | PM |
| 22:00–24:00 | Buffer, Loom backup recording, final submission | All |

**Feature milestones `<!-- FILL IN -->`:**

| Time | Feature milestone |
|---|---|
| Hour 5 | <!-- e.g. "New backend route returns working response for test input" --> |
| Hour 8 | <!-- e.g. "React form submits and displays response in the UI" --> |
| Hour 12 | <!-- e.g. "End-to-end flow works on deployed CloudFront URL" --> |
| Hour 16 | <!-- e.g. "Full demo scenario runs without errors on production" --> |

---

## 12 · Hard constraints `[LOCKED]`

### Infrastructure constraints
1. No new AWS services until all four DoD items are confirmed green
2. No Terraform module refactors once the first `apply` succeeds — flat `main.tf` only
3. No SSH access patterns — EC2 is SSM-only; never add key pairs or SSH ingress rules
4. Keep Terraform region defaults aligned to `us-west-1` unless the team explicitly agrees to another region
5. Keep frontend bucket private with `aws_cloudfront_origin_access_control.frontend` and `aws_s3_bucket_policy.frontend_private`
6. Keep Terraform state adoption/import logic in CI deploy workflow to avoid duplicate deterministic resource creation

### Service graduation rules
7. **Lambda** — available after DoD is green; use for async/background processing or
   event-driven tasks that would block the FastAPI request cycle. Not needed by default.
8. **Amazon Bedrock** — available after DoD is green; use for any LLM inference,
   text generation, or summarization. Call via boto3 from FastAPI on EC2.
9. **DynamoDB** — available after DoD is green; use for key-value storage, session data,
   or event logs. If you need relational queries, use RDS instead.
10. **RDS (PostgreSQL)** — available after DoD is green; use only when you need joins,
   transactions, or a proper relational schema. DynamoDB is faster to set up for simple data.
11. **API Gateway** — do not use; FastAPI on EC2 covers all routing needs for this scope.

### Auth constraints
9. Basic auth is required (JWT tokens, protected routes, login page). FastAPI `python-jose`
   + `passlib` is the approved implementation — no third-party auth providers.
10. Scope is username/password + JWT only — no OAuth, SSO, or MFA for this event.

### Code and workflow constraints
11. Do not change the frozen API contract — `/health` and `/api/integrations` response shapes are permanent
12. Do not commit `backend/.env`, `infra/terraform.tfvars`, `.terraform/`, or any `*.tfstate*` file
13. Do not add GitHub Secrets beyond the three required (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)
14. Keep PRs small — one working thing per change; verify the pipeline after every merge
15. If setup exceeds 3 hours — stop adding features and finish only the core path
16. Feature freeze at 1:00pm Saturday — no new code after this point

---

## 13 · User stories `<!-- FILL IN after 01 and 03 are locked -->`

### What a user story is

A user story is a one-sentence description of a feature written from the perspective of
the person using it. It answers three questions in a single sentence:
- **Who** is using the feature? (the role)
- **What** do they want to do? (the action — specific, not vague)
- **Why** do they want to do it? (the outcome — the real-world benefit)

The format is always: `"As a [role], I want to [action] so that [outcome]."`

The "so that" is the most important part. It forces you to justify why the feature exists.
If you can't finish the sentence, the feature probably shouldn't be in scope.

---

### What acceptance criteria are

Acceptance criteria are the specific conditions that must be true for a story to be
considered "done." They are written in Given/When/Then format:
- **Given** — the starting state or context before anything happens
- **When** — the action the user takes
- **Then** — what the system must do in response

A story is only "done" when every one of its acceptance criteria passes.
Developers use them to know what to build. Testers use them to know what to verify.

---

### Annotated examples using this project's nonprofit context

The examples below use the **AI grant report generator** solution (solution 8) for
Circle the City. Replace every line with your actual problem once section 01 is locked.

---

> **Example story format — read the annotations in parentheses**
>
> `As a [role ← who is actually doing this task day-to-day]`
> `, I want to [specific action ← not "use the app", but the exact thing they do]`
> ` so that [real-world outcome ← the pain that goes away].`

---

### P0 stories

**Story 1 — the core feature (the main reason the app exists)**

> As a **Circle the City grant coordinator**, I want to **paste in our monthly outcome
> numbers and have the app generate a formatted grant report** so that **I don't have
> to spend 6 hours manually writing and formatting the same data for every funder.**

*Why this is a good story: the role is specific (not just "user"), the action is concrete
(paste numbers → get report), and the outcome eliminates a real, named pain.*

**Story 2 — a supporting feature that makes the core feature useful**

> As a **grant coordinator**, I want to **download the generated report as a PDF from S3**
> so that **I can attach it directly to a grant application without any extra steps.**

*Why this is a good story: it closes the loop on story 1. The report is only useful if
you can actually send it somewhere. This makes the demo feel complete.*

**Story 3 — a trust/confidence feature (the user needs to believe the output is correct)**

> As a **grant coordinator**, I want to **see which grant funder format was used to
> generate the report** so that **I can confirm it matches the funder I'm applying to
> before I submit.**

*Why this is a good story: it catches the "what if it generated the wrong format?" fear
that any real user would have. Builds trust in the tool.*

---

### Acceptance criteria

> **How to read these:**
> Each criterion is one testable condition. You should be able to sit down with the app
> and check each box with a yes or no. If a criterion is ambiguous or says "works well"
> — it's not a good criterion. Every criterion below can be verified in under 30 seconds.

**Story 1 — generate a grant report**

- [ ] Given the form is empty, when the user visits the page, then a text area and a
  "Generate report" button are visible
- [ ] Given the user has entered outcome data, when they click "Generate report", then
  a loading state appears within 1 second so they know the request is being processed
- [ ] Given Bedrock returns a response, when generation completes, then the report text
  appears on screen in under 15 seconds
- [ ] Given Bedrock is unavailable, when generation fails, then an error message appears
  and the form remains usable — the app does not crash

**Story 2 — download the report**

- [ ] Given a report has been generated, when the user clicks "Download PDF", then a
  file download begins within 2 seconds
- [ ] Given the downloaded file opens, then it contains the same text that was shown
  on screen — no content is lost in the conversion
- [ ] Given the file is stored in S3, when the download link is clicked, then the file
  is served directly from the S3 bucket URL

**Story 3 — show which funder format was used**

- [ ] Given a report has been generated, when it appears on screen, then a label
  clearly shows which funder template was applied (e.g. "Format: HUD McKinney-Vento")
- [ ] Given the funder label is shown, when the user hovers or taps it, then a short
  description of that funder's requirements appears so they can verify it's correct

---

### P1 stories (write these only after P0 is green)

**Example P1 story — an enhancement that makes the tool more useful but isn't needed for the demo**

> As a **grant coordinator**, I want to **select from a dropdown of 5 common funder
> formats** so that **I can generate the right report structure without knowing each
> funder's requirements by heart.**

*This is P1 not P0 because the demo works without it — you can hardcode one funder
format for the demo and add the dropdown if time allows.*

---

### Now replace the examples with your real stories

Once section 01 (problem statement) is locked, delete everything above the dashes below
and write your actual stories in the same format. Keep the annotations as a reference
in a comment if helpful.

---

### Your P0 stories `<!-- REPLACE EXAMPLES ABOVE WITH THESE -->`

- As a <!-- role -->, I want to <!-- specific action --> so that <!-- real outcome -->.
- As a <!-- role -->, I want to <!-- specific action --> so that <!-- real outcome -->.
- As a <!-- role -->, I want to <!-- specific action --> so that <!-- real outcome -->.

### Your acceptance criteria `<!-- ONE BLOCK PER STORY -->`

**Story 1:**
- [ ] Given <!-- starting state -->, when <!-- user action -->, then <!-- system response -->
- [ ] Given <!-- starting state -->, when <!-- user action -->, then <!-- system response -->
- [ ] Given <!-- error state -->, when <!-- user action -->, then <!-- graceful handling -->

**Story 2:**
- [ ] Given <!-- starting state -->, when <!-- user action -->, then <!-- system response -->
- [ ] Given <!-- starting state -->, when <!-- user action -->, then <!-- system response -->
- [ ] Given <!-- error state -->, when <!-- user action -->, then <!-- graceful handling -->

**Story 3:**
- [ ] Given <!-- starting state -->, when <!-- user action -->, then <!-- system response -->
- [ ] Given <!-- starting state -->, when <!-- user action -->, then <!-- system response -->
- [ ] Given <!-- error state -->, when <!-- user action -->, then <!-- graceful handling -->

---

## 14 · Decisions log

*Capture pivots and key decisions in real time so the team stays aligned.*

| Time | Decision | Reason | Made by |
|---|---|---|---|
| <!-- HH:MM --> | <!-- Decision --> | <!-- Why --> | <!-- Name --> |
| <!-- HH:MM --> | <!-- Decision --> | <!-- Why --> | <!-- Name --> |

---

*PRD version: template-v1 · stack lean-mvp-ec2-s3-cf-1.0*
*Status: awaiting problem context — fill sections 01, 02, 03, 09, 07, 13 before building*
