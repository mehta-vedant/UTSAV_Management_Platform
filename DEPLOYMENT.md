# 🚀 Deployment Guide: UTSAV Platform

This guide outlines the professional steps to deploy the **UTSAV** platform to production. 

---

## 🏗️ Deployment Architecture
- **Frontend/API**: [Vercel](https://vercel.com) (Optimized for Next.js)
- **Database**: [Railway](https://railway.app) or [Supabase](https://supabase.com) (PostgreSQL)
- **Authentication**: NextAuth.js (Requires `NEXTAUTH_SECRET`)

---

## 1. Prepare the Database (Railway/Supabase)
Since UTSAV uses PostgreSQL with Prisma, you need a live database URL.

### Options:
1. **Railway (Recommended for speed)**:
   - Create a new project.
   - Add **PostgreSQL**.
   - Copy the `DATABASE_URL` (Connection String).
2. **Supabase**:
   - Create a new project.
   - Go to **Project Settings > Database**.
   - Copy the **Connection string** (URI mode).

---

## 2. Prepare the Codebase
Make sure all recent changes are committed and pushed to your GitHub repository.

```bash
git add .
git commit -m "Final production-ready build and verified architectural fixes"
git push origin main
```

---

## 3. Deploy to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New > Project**.
3. Import your **UTSAV** GitHub repository.
4. **Environment Variables**: This is the most critical step. Add the following variables:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Your PostgreSQL connection string (from Step 1) |
| `NEXTAUTH_SECRET` | A long random string (Generate via `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your production domain (e.g., `https://your-app.vercel.app`) |
| `NEXT_PUBLIC_APP_URL` | The same canonical production URL; used in invitation links |
| `AWS_REGION` | SES region, e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | IAM credential allowed to send with SES |
| `AWS_SECRET_ACCESS_KEY` | Matching IAM secret |
| `AWS_SESSION_TOKEN` | Required only for temporary AWS credentials |
| `SES_FROM_EMAIL` | A verified SES email address or domain mailbox |
| `SES_FROM_NAME` | The display name recipients see, e.g. `UTSAV` |
| `OTP_RATE_LIMIT_SECRET` | Optional long random secret used to hash request IPs; defaults to `NEXTAUTH_SECRET` |

5. **Build Settings**:
   - Framework: **Next.js**
   - Root Directory: `./`
   - Build Command: `npx prisma generate && next build`
   - Install Command: `npm install`

6. Click **Deploy**.

---

## 4. Post-Deployment: Database Migration & Seeding
Once Vercel finishes the build, your schema needs to be applied to the live database.

### Run Migrations:
```bash
npx prisma migrate deploy
```

### Seed Initial Data (Optional - for Demo):
```bash
npx prisma db seed
```

---

## 5. Configure AWS SES

1. In the AWS console, switch to the same region configured in `AWS_REGION` (the example uses N. Virginia: `us-east-1`).
2. In **SES > Verified identities**, verify your sending domain (recommended) or the exact sender in `SES_FROM_EMAIL`. Publish the DKIM DNS records SES supplies and wait until the identity is verified.
3. If the SES account is still in the sandbox, request production access in **SES > Account dashboard**. Sandbox accounts can send only to verified recipients.
4. Create an IAM user or role with only `ses:SendEmail` for this sender identity. Put its credentials in Vercel; never commit them.
5. Redeploy after adding the variables, then test both an OTP sign-in and a member invitation to an inbox you control. Confirm delivery and that the invitation link uses your production domain.
6. Configure SES bounce and complaint notifications for the verified identity. Use an SNS **Standard** topic in the same region, subscribe an endpoint your team monitors, and act on permanent bounces/complaints by suppressing affected recipients. For complete automated OTP invalidation after an asynchronous bounce, add an SNS/SQS consumer with a message-to-OTP correlation before enabling OTP at high volume.

---

## 🛡️ Important Security Checklist
- [ ] **NEXTAUTH_URL**: Ensure this matches your final domain.
- [ ] **CORS**: If using external assets, update your Next.js config.
- [ ] **Prisma Accelerate**: For high-traffic, consider using Prisma Accelerate to pool connections.
- [ ] **SES feedback**: Configure and monitor bounce/complaint notifications for the verified sender identity.

---

## 🏁 Success!
Your application will be live at the `.vercel.app` URL provided by Vercel. You can now connect your custom domain in the Vercel Dashboard.
