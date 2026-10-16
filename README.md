# UTSAV

UTSAV is a web application for committees that run festivals, clubs, and community events. It gives one organization a private workspace to manage members, events, donations, expenses, volunteers, Bhog sponsorships, reports, and selected public information.

The problem it solves is simple: important work is often split between chats, paper notes, spreadsheets, and different people. UTSAV puts that work in one place and records who did what.

## Explain the project in 30 seconds

> UTSAV is an organization-management application for community events. A user signs in, chooses an organization they belong to, and gets a role-based dashboard. Members can record donations and expenses, manage people and events, assign volunteer work, and publish selected festival information. Next.js handles the web application, PostgreSQL stores the connected data, Prisma talks to the database, and AWS SES sends OTP and invitation emails.

## Main features

- Create and manage organizations.
- Invite people and assign roles: Admin, Treasurer, Committee Member, or Volunteer.
- Create an account only after verifying email ownership with a one-time code (OTP).
- Sign in with a password or, for an existing account, a one-time email code (OTP).
- Record donations and expense requests.
- Attach private bill/receipt evidence to expense requests through AWS S3.
- Approve or reject expenses based on role permissions.
- Manage events, volunteers, tasks, and Bhog items.
- View reports, exports, and an audit trail.
- Review a read-only budget-health report with transparent scenarios from recorded data.
- Show selected festival information publicly without exposing private dashboard controls.

## How access works

Each organization is kept separate.

When someone opens a URL such as:

```text
/ganesh-utsav/dashboard/expenses
```

UTSAV does not trust the URL alone. It:

1. Finds the organization using `ganesh-utsav`.
2. Identifies the signed-in user from their NextAuth session.
3. Checks the `OrganizationMember` table to confirm that this user belongs to that organization.
4. Checks whether their role has permission for the requested action.
5. Reads or changes only organization-scoped records.

In short: the URL chooses the organization; membership and permissions decide access.

## Simple architecture

```text
Browser
  → Next.js page or form
  → Server action / service
  → Permission check
  → Prisma
  → PostgreSQL
  → Result shown in the browser
```

For email login and invitations:

```text
User requests OTP
  → UTSAV creates a short-lived hashed code
  → AWS SES sends the email
  → NextAuth verifies the code
  → User receives a session
```

For a new account, UTSAV first creates a temporary `PendingRegistration` record with hashed details and an expiring OTP. The real `User` record is created only after the email code is verified.

## Technology choices

| Technology | Why it is used |
| --- | --- |
| Next.js | Builds pages, routes, server-side data loading, and form actions in one application. |
| React | Builds the visible interface from reusable components. |
| TypeScript | Helps catch mistakes before the application runs. |
| PostgreSQL | Fits connected data such as users, memberships, organizations, expenses, events, and audit records. |
| Prisma | Lets TypeScript code safely read and write PostgreSQL data, and manages schema migrations. |
| NextAuth | Handles sign-in sessions. |
| AWS SES | Sends transactional emails such as OTPs and invitations. |
| AWS S3 | Stores private receipt files; PostgreSQL stores only their metadata. |
| Vercel | Hosts and deploys the Next.js application. |

## Project structure

```text
src/
├── app/          Pages and URL routes
├── actions/      Server-side functions called by forms and buttons
├── components/   Reusable interface pieces
├── lib/          Authentication, access checks, email, Prisma, utilities
└── modules/      Business rules for finance, events, organizations, and festival features

prisma/
├── schema.prisma Database models and relationships
└── migrations/   Versioned database changes
```

## Important current limitation

Financial records and audit logs are implemented, but UTSAV is not yet a double-entry accounting ledger.

## Learn the project end to end

Open [explanations/index.html](./explanations/index.html) for the beginner-friendly course. It explains routes, frontend, backend, authentication, database design, multi-tenancy, workflows, improvements, and interview answers.

## Run locally

### Requirements

- Node.js 18 or newer
- PostgreSQL database

### Setup

```bash
git clone https://github.com/mehta-vedant/UTSAV_Management_Platform.git
cd UTSAV_Management_Platform
npm install
```

Copy `.env.example` to `.env`, then fill in the values.

```bash
npx prisma generate
npx prisma db push
npm run dev
```

Open `http://localhost:3000`.

## Email setup

UTSAV uses AWS SES for OTP and invitation emails. The sender domain/email must be verified in SES, and the following environment variables are required:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
SES_FROM_EMAIL=noreply@utsavmanagement.me
SES_FROM_NAME=UTSAV
S3_RECEIPTS_BUCKET=utsav-private-receipts
```

Keep real credentials in Vercel environment variables or local `.env` files. Never commit them.

## Private receipt storage

Create a private S3 bucket, keep **Block Public Access** enabled, and give the application IAM identity permission only for that bucket's receipt prefix. Configure S3 CORS for your local and deployed UTSAV URLs. The browser receives a five-minute upload form and a two-minute view link; neither is stored in the database.

When S3 is unavailable, UTSAV keeps the expense request and visibly marks the receipt upload as pending/failed so it can be retried. Local disk is not used as a fallback because Vercel files are temporary.

When deploying the verified-signup change, apply migrations to the production database:

```bash
npx prisma migrate deploy
```

## Useful commands

```bash
npm run dev          # Start local development server
npx tsc --noEmit     # Check TypeScript
npm run lint         # Run lint checks
npm test             # Run tests
npx prisma migrate dev  # Create/apply a development migration
```

## Interview follow-up: what would you improve first?

> UTSAV now stores private receipt evidence in S3 and keeps metadata/audit history in PostgreSQL. My next improvement would be idempotency keys for every financial mutation, then email delivery feedback, monitoring, backups, and a true double-entry ledger. I would keep the modular monolith until real scale or team boundaries justify splitting services.
