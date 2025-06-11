# Website Development

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

3. Start the development server

```bash
cd docs && pnpm run dev
```

This will start the development server on port 3000.

## Environment Variables

### Logging in

To test logging in, you can set the following environment variables:

```bash
AUTH_SECRET=test
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
