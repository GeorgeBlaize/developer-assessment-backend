# Setup Guide

Follow these steps to get real credentials for every mandatory integration, then run the API locally and deploy it.

## 1. PostgreSQL (Neon)

1. Go to https://neon.tech and sign up.
2. **New Project** -> pick a region.
3. Dashboard -> **Connection Details**. Copy the **pooled** connection string (contains `-pooler`) into `DATABASE_URL`.
4. Copy the **direct/unpooled** connection string into `DIRECT_URL` (required for `prisma migrate`).

## 2. Google OAuth (Social Login)

This backend accepts a Google **ID token** at `POST /api/v1/auth/google` (`{ "idToken": "..." }`) and verifies it server-side with `google-auth-library` — no redirect-based server flow needed. That's the same token a frontend would get from Google Identity Services / `@react-oauth/google`.

1. https://console.cloud.google.com -> **New Project**.
2. **APIs & Services -> OAuth consent screen** -> External -> fill app name/support email -> add scopes `email`, `profile`, `openid` -> add yourself as a test user.
3. **APIs & Services -> Credentials -> + Create Credentials -> OAuth client ID** -> Web application.
4. Authorized redirect URIs: add `https://developers.google.com/oauthplayground` — this lets you generate a real ID token **for Postman testing** without building a frontend (see below).
5. Copy Client ID / Client Secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

**To get a testable ID token for Postman:**

1. Go to https://developers.google.com/oauthplayground
2. Click the gear icon (top right) -> check **"Use your own OAuth credentials"** -> paste your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
3. In the left panel, scopes: select `https://www.googleapis.com/auth/userinfo.email` and `.../userinfo.profile` (or just type `openid email profile`) -> **Authorize APIs** -> sign in with any Google account.
4. Click **Exchange authorization code for tokens** -> copy the `id_token` value.
5. Use that value as `idToken` in the "Google Login" request in the Postman collection.

This produces a real Google-signed ID token whose audience is *your* client ID, exactly what a frontend Google Sign-In button would hand your backend — so it exercises the real verification path in `auth.service.ts`, not a mock.

## 3. SSLCommerz Sandbox

1. https://developer.sslcommerz.com/registration -> register for a sandbox account (instant).
2. Log in at https://sandbox.sslcommerz.com/manage/ -> dashboard shows **Store ID** and **Store Password**.
3. Set `SSLCZ_STORE_ID`, `SSLCZ_STORE_PASSWORD`, `SSLCZ_IS_LIVE=false`.
4. Test cards for the sandbox checkout are listed on the SSLCommerz sandbox login page.

## 4. Running locally

```bash
cp .env.example .env   # fill in the values from steps 1-3
npm install
npm run prisma:migrate  # creates tables
npm run seed             # demo admin/company/candidate + sample assessment
npm run dev
```

Demo credentials after seeding:

| Role      | Email               | Password         |
|-----------|----------------------|------------------|
| ADMIN     | admin@codeassess.dev | Admin@12345      |
| COMPANY   | company@demo.dev      | Company@12345    |
| CANDIDATE | candidate@demo.dev    | Candidate@12345  |

## 5. Deployment (Vercel)

1. Push the repo to GitHub.
2. https://vercel.com -> **New Project** -> import the repo -> Framework preset "Other".
3. Add every variable from `.env.example` under Project Settings -> Environment Variables (with real values).
4. Deploy. Copy the live URL, add it to the Google OAuth redirect URIs (step 2.4), and to `SSLCZ_SUCCESS_URL` / `SSLCZ_FAIL_URL` / `SSLCZ_CANCEL_URL` / `SSLCZ_IPN_URL`, then redeploy.
5. Run migrations against the production database once (`npx prisma migrate deploy`), then `npm run seed` (or run it locally pointed at the prod `DATABASE_URL`).
