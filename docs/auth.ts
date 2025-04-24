import { polar } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import * as Sentry from "@sentry/nextjs";
import { betterAuth } from "better-auth";
import { customSession, magicLink, openAPI } from "better-auth/plugins";
import { github } from "better-auth/social-providers";
import { Pool } from "pg";

import { PRODUCTS } from "./util/product-list";
import { sendEmail } from "./util/send-mail";

export const client = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // Use 'sandbox' if you're using the Polar Sandbox environment
  // Remember that access tokens, products, etc. are completely separated between environments.
  // Access tokens obtained in Production are for instance not usable in the Sandbox environment.
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

export const auth = betterAuth({
  user: {
    additionalFields: {
      ghSponsorPlanType: {
        type: "string",
        required: false,
        input: false, // don't allow user to set role
      },
    },
  },
  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      await sendEmail({
        to: user.email,
        template: "verifyEmail",
        props: { url, name: user.name },
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
        props: { url: data.url, name: data.user.name },
      });
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.AUTH_GITHUB_ID as string,
      clientSecret: process.env.AUTH_GITHUB_SECRET as string,
      async getUserInfo(token) {
        // This is a workaround to still re-use the default github provider getUserInfo
        // and still be able to fetch the sponsor info with the token
        return (await github({
          clientId: process.env.AUTH_GITHUB_ID as string,
          clientSecret: process.env.AUTH_GITHUB_SECRET as string,
          async mapProfileToUser() {
            const resSponsor = await fetch(`https://api.github.com/graphql`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token.accessToken}`,
              },
              // organization(login:"TypeCellOS") {
              // user(login:"YousefED") {
              body: JSON.stringify({
                query: `{
                    user(login:"YousefED") {
                      sponsorshipForViewerAsSponsor(activeOnly:false) {
                        isActive,
                        tier {
                          name
                          monthlyPriceInDollars
                        }  
                      }
                    }
                  }`,
              }),
            });

            if (resSponsor.ok) {
              // Mock data. TODO: disable and test actial data
              // profile.sponsorInfo = {
              //   isActive: true,
              //   tier: {
              //     name: "test",
              //     monthlyPriceInDollars: 100,
              //   },
              // };
              // use API data:

              const data = await resSponsor.json();
              // eslint-disable-next-line no-console
              console.log("sponsor data", data);

              // {
              //   "data": {
              //     "user": {
              //       "sponsorshipForViewerAsSponsor": {
              //         "isActive": true,
              //         "tier": {
              //           "name": "$90 a month",
              //           "monthlyPriceInDollars": 90
              //         }
              //       }
              //     }
              //   }
              // }

              const sponsorInfo: null | {
                isActive: boolean;
                tier: {
                  monthlyPriceInDollars: number;
                };
              } = data.data.user.sponsorshipForViewerAsSponsor;

              if (!sponsorInfo?.isActive) {
                return {};
              }

              return {
                ghSponsorPlanType:
                  sponsorInfo.tier.monthlyPriceInDollars > 100
                    ? "business"
                    : "starter",
              };
            }

            return {};
          },
        }).getUserInfo(token))!;
      },
    },
  },
  database: new Pool({
    connectionString: process.env.POSTGRES_URL,
  }),
  plugins: [
    customSession(
      async ({ user, session }) => {
        try {
          // Check for a Polar subscription
          const polarState = await client.customers.getStateExternal({
            externalId: user.id,
          });

          if (
            // No active subscriptions
            !polarState.activeSubscriptions.length ||
            // Or, the subscription is not active
            polarState.activeSubscriptions[0].status !== "active"
          ) {
            if (user.ghSponsorPlanType) {
              // The user may be a GitHub sponsor plan type
              return {
                planType: user.ghSponsorPlanType,
                user,
                session,
              };
            }

            return {
              planType: PRODUCTS.free.slug,
              user,
              session,
            };
          }
          const subscription = polarState.activeSubscriptions[0];

          const planType = Object.values(PRODUCTS).find(
            (p) => p.id === subscription.productId,
          )?.slug;

          // See if they are subscribed to a Polar product, if not, use the free plan
          return {
            planType: planType ?? PRODUCTS.free.slug,
            user,
            session,
          };
        } catch (err) {
          Sentry.captureException(err);

          return {
            planType: PRODUCTS.free.slug,
            user,
            session,
          };
        }
      },
      {
        // This is really only for type inference
        user: {
          additionalFields: {
            ghSponsorPlanType: {
              type: "string",
              required: false,
              input: false, // don't allow user to set role
            },
          },
        },
      },
    ),
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
            productId: PRODUCTS.business.id, // ID of Product from Polar Dashboard
            slug: PRODUCTS.business.slug, // Custom slug for easy reference in Checkout URL, e.g. /checkout/pro
            // http://localhost:3000/api/auth/checkout/business
          },
          {
            productId: PRODUCTS.starter.id,
            slug: PRODUCTS.starter.slug,
            // http://localhost:3000/api/auth/checkout/starter
          },
        ],
        // TODO set to actual page (welcome screen)
        successUrl: "/?checkout_id={CHECKOUT_ID}",
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
