# Website Development

This is the code for the [BlockNote documentation website](https://www.blocknotejs.org). If you're looking to work on BlockNote itself, check the [`packages`](/packages/) folder.

To get started with development of the website, you can follow these steps:

1. Initialize the DB

If you haven't already, you can initialize the database with the following command:

```bash
cd docs && pnpm run init-db
```

This will initialize an SQLite database at `./docs/sqlite.db`.

2. Setup environment variables

Copy the `.env.example` file to `.env.local` and set the environment variables.

```bash
cp .env.example .env.local
```

If you want to test logging in, or payments see more information below [in the environment variables section](#environment-variables).

3. Start the development server from within the `./docs` directory.

```bash
pnpm run dev
```

This will start the development server on port 3000.

## Environment Variables

### Logging in

To test logging in, you can set the following environment variables:

```bash
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
# Github OAuth optionally
AUTH_GITHUB_ID=test
AUTH_GITHUB_SECRET=test
```

Note: the GITHUB_ID and GITHUB_SECRET are optional, but if you want to test logging in with Github you'll need to set them. For local development, you'll need to set the callback URL to `http://localhost:3000/api/auth/callback/github`

### Payments

To test payments, you can set the following environment variables:

```bash
POLAR_ACCESS_TOKEN=test
POLAR_WEBHOOK_SECRET=test
```

For testing payments, you'll need access to the polar sandbox which needs to be configured to point a webhook to your local server. This can be configured at: <https://sandbox.polar.sh/dashboard/blocknote/settings/webhooks>

You'll need something like [ngrok](https://ngrok.com/) to expose your local server to the internet.

```bash
ngrok http http://localhost:3000
```

You'll need the webhook to point to ngrok like so:

```
https://0000-00-00-000-00.ngrok-free.app/api/auth/polar/webhooks
```

With this webhook pointing to your local server, you should be able to test payments.

### Auth and billing upgrade deployment

The docs site uses Better Auth 1.7.7 (and the matching `auth` CLI),
`@polar-sh/better-auth` 2.0.0, and Polar SDK 1.0.1. SDK 1.0.2 was excluded from
this upgrade because it had not passed the workspace's 24-hour release-age policy.
Use Node.js **22.12 or newer**, including in the deployment environment.

The Polar integration and `lib/auth.ts` both target **API `2026-10`**. The
versioned SDK imports set the `Polar-Version` header automatically. SDK package
versions and API versions are independent; do not change the API import without
also reviewing the integration and webhook contract.

Before deploying:

1. Back up the auth database and test the upgrade against a copy. Check for
   duplicate provider account keys and resolve any results before upgrading:

   ```sql
   SELECT "providerId", "accountId", count(*)
   FROM account GROUP BY 1, 2 HAVING count(*) > 1;
   ```

2. From `docs/`, with the target environment variables available to the CLI,
   generate and review the SQL, then apply the built-in SQLite/Postgres adapter
   migrations:

   ```bash
   pnpm exec auth generate --config ./lib/auth.ts --output ./auth-migration.sql
   pnpm exec auth migrate --config ./lib/auth.ts
   ```

   `POSTGRES_URL` selects Postgres; otherwise development uses `./sqlite.db`.
   Do not accidentally migrate the local SQLite file instead of production.
   A direct upgrade to 1.7.7 does **not** need the temporary `account.issuer`
   column introduced in 1.7.0–1.7.2. If that intermediate version was previously
   deployed, follow the [1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide)
   to remove its constraint/index first.

3. Test the webhook cutover in **Polar sandbox**. Set the endpoint serving
   `/api/auth/polar/webhooks` to **`api_version: "2026-10"`**, and coordinate
   that change with deployment of the new handler. Updating the SDK does not
   update an existing webhook endpoint. Endpoint changes affect only future
   events: queued events and redeliveries retain their original contract.
   Drain outstanding old-version deliveries using the old handler before the
   cutover; do not assume replaying them converts their payloads. Verify the
   `webhook-api-version` delivery header is `2026-10`.

4. Verify email/password sign-up and verification, existing-account GitHub login
   (including sponsor plans), and magic-link login. Better Auth 1.7 removes
   unproven passwords/linked accounts and revokes sessions when a magic link
   first verifies an unverified account; affected password users must reset
   their password.

5. Test authenticated checkout and **logged-out pay-first checkout**, both for
   a new email and an existing account. Confirm the customer is linked through
   `external_id`, a new buyer receives a sign-in link, the subscription updates
   `planType`, and the customer portal opens. Check scheduled cancellation
   retains access until the paid period ends, immediate revocation clears the
   plan, and repeat webhook delivery does not create another user.
   Keep production and sandbox tokens, products, and webhook secrets separate.

6. Apply the reviewed database changes and coordinate the production webhook
   cutover and deployment. Monitor auth/webhook errors and plan provisioning.
   A rollback must account for both database changes and webhook versions;
   reverting packages alone does not revert either external state.

Local upgrade rehearsal: the Better Auth 1.7.7 CLI reported **no migrations
needed** against an isolated restore of the production `public` schema. All six
tables' row counts and data hashes were unchanged, and no duplicate provider
account keys were found. The CLI warned that `verification.createdAt` and
`verification.updatedAt` remain nullable despite being required by the auth
schema; neither column contained nulls. The CLI does not tighten those existing
constraints automatically. Review that drift separately rather than assuming
the migration fixes it.

Sandbox testing verified logged-out monthly Business checkout, account
provisioning and customer linking, magic-link sign-in, repeated signed webhook
payloads, scheduled cancellation retaining access, and immediate revocation
returning the session to Free. These checks do not replace the production
cutover checklist above.

References: [Polar Better Auth integration](https://polar.sh/docs/integrate/sdk/adapters/better-auth),
[Polar API versioning](https://polar.sh/docs/api-reference/2026-10/versioning),
[Better Auth 1.5 changes](https://better-auth.com/blog/1-5), and
[Better Auth 1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide).

### Email sending

Note, this is not required, if email sending is not configured, the app will log the email it would send to the console. Often this is more convenient for development.

To test email sending, you can set the following environment variables:

```bash
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
SMTP_PORT=
SMTP_SECURE=false
```

When configured, you'll be able to send emails to the email address you've configured.

To setup with protonmail, you'll need to go to <https://account.proton.me/u/0/mail/imap-smtp> and create a new SMTP submission token.

You'll need to set the following environment variables:

```bash
SMTP_HOST=smtp.protonmail.com
SMTP_USER=my.email@protonmail.com
SMTP_PASS=my-smtp-token
SMTP_PORT=587
SMTP_SECURE=false
```

# Contributing

To submit your changes, open a pull request to the [BlockNote GitHub repo](https://github.com/TypeCellOS/BlockNote). Pull requests will automatically be deployed to a preview environment.
