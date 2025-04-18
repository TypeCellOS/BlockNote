import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { polar } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { openAPI } from "better-auth/plugins"

export const client = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    // Use 'sandbox' if you're using the Polar Sandbox environment
    // Remember that access tokens, products, etc. are completely separated between environments.
    // Access tokens obtained in Production are for instance not usable in the Sandbox environment.
    server: 'sandbox'
});

export const auth = betterAuth({
  emailAndPassword: {  
    enabled: true
  },
  socialProviders: { 
    github: { 
      clientId: process.env.AUTH_GITHUB_ID as string, 
      clientSecret: process.env.AUTH_GITHUB_SECRET as string
    }, 
  },
  database: new Database("./sqlite.db"),
    plugins: [
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
                        slug: "business" // Custom slug for easy reference in Checkout URL, e.g. /checkout/pro
                        // http://localhost:3000/api/auth/checkout/business
                    },
                    {
                      productId: 'ab70fea5-172c-4aac-b3fc-0824f2a5b670',
                      slug: 'starter'
                       // http://localhost:3000/api/auth/checkout/starter
                    }
                ],
                // TODO set to actual page (welcome screen)
                successUrl: "/success?checkout_id={CHECKOUT_ID}"
            },
            // Incoming Webhooks handler will be installed at /polar/webhooks
            webhooks: {
              // webhooks have to be publicly accessible
              // ngrok http http://localhost:3000
                secret: process.env.POLAR_WEBHOOK_SECRET as string,
                onPayload: async (payload) => {
                    console.log(payload)
                },
            }
        })
    ]
});