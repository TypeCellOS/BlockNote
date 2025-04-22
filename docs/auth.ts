import { polar } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { magicLink, openAPI } from "better-auth/plugins";
import Database from "better-sqlite3";

import { sendEmail } from "./util/send-mail";

export const client = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // Use 'sandbox' if you're using the Polar Sandbox environment
  // Remember that access tokens, products, etc. are completely separated between environments.
  // Access tokens obtained in Production are for instance not usable in the Sandbox environment.
  server: "sandbox",
});

export const auth = betterAuth({
  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      await sendEmail({
        to: user.email,
        template: "verifyEmail",
        props: { url },
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword(data) {
      await sendEmail({
        to: data.user.email,
        template: "resetPassword",
        props: { url: data.url },
      });
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.AUTH_GITHUB_ID as string,
      clientSecret: process.env.AUTH_GITHUB_SECRET as string,
    },
  },
  database: new Database("./sqlite.db"),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          template: "magicLink",
          props: { url },
        });
      },
    }),
    // Just temporary for testing
    // Serves on http://localhost:3000/api/auth/reference
    openAPI(),
    polar({
      client,
      // Enable automatic Polar Customer creation on signup
      createCustomerOnSignUp: true,
      // http://localhost:3000/api/auth/portal
      enableCustomerPortal: true,
      // Configure checkout
      checkout: {
        enabled: true,
        products: [
          {
            productId: "8049f66f-fd0a-4690-a0aa-442ac5b03040", // ID of Product from Polar Dashboard
            slug: "business", // Custom slug for easy reference in Checkout URL, e.g. /checkout/pro
            // http://localhost:3000/api/auth/checkout/business
          },
          {
            productId: "ab70fea5-172c-4aac-b3fc-0824f2a5b670",
            slug: "starter",
            // http://localhost:3000/api/auth/checkout/starter
          },
        ],
        // TODO set to actual page (welcome screen)
        successUrl: "/success?checkout_id={CHECKOUT_ID}",
      },
      // Incoming Webhooks handler will be installed at /polar/webhooks
      webhooks: {
        // webhooks have to be publicly accessible
        // ngrok http http://localhost:3000
        secret: process.env.POLAR_WEBHOOK_SECRET as string,
        onPayload: async (payload) => {
          console.log(payload);
        },
      },
    }),
  ],
});
