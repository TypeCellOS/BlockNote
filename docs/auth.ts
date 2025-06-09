import { polar } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import * as Sentry from "@sentry/nextjs";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { customSession, magicLink, openAPI } from "better-auth/plugins";
import { github } from "better-auth/social-providers";
import Database from "better-sqlite3";
import { Pool } from "pg";

import { PRODUCTS } from "./util/product-list";
import { sendEmail } from "./util/send-mail";

export const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // Use 'sandbox' if you're using the Polar Sandbox environment
  // Remember that access tokens, products, etc. are completely separated between environments.
  // Access tokens obtained in Production are for instance not usable in the Sandbox environment.
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

export const auth = betterAuth({
  user: {
    additionalFields: {
      planType: {
        type: "string",
        required: false,
        input: false, // don't allow user to set plan type
      },
      ghSponsorInfo: {
        type: "string",
        required: false,
        input: false, // don't allow user to set role
      },
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
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
    autoSignIn: true,
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
                ghSponsorInfo: JSON.stringify(sponsorInfo),
              };
            }

            return {};
          },
        }).getUserInfo(token))!;
      },
    },
  },
  // Use SQLite for local development
  database:
    process.env.NODE_ENV === "production" || process.env.POSTGRES_URL
      ? new Pool({
          connectionString: process.env.POSTGRES_URL,
        })
      : new Database("./sqlite.db"),
  plugins: [
    customSession(
      async ({ user, session }) => {
        // If they are a GitHub sponsor, use that plan type
        if (user.ghSponsorInfo) {
          const sponsorInfo = JSON.parse(user.ghSponsorInfo);
          return {
            planType:
              sponsorInfo.tier.monthlyPriceInDollars > 100
                ? "business"
                : "starter",
            user,
            session,
          };
        }
        // If not, see if they are subscribed to a Polar product
        // If not, use the free plan
        return {
          planType: user.planType ?? PRODUCTS.free.slug,
          user,
          session,
        };
      },
      {
        // This is really only for type inference
        user: {
          additionalFields: {
            ghSponsorInfo: {
              type: "string",
              required: false,
              input: false, // don't allow user to set role
            },
            planType: {
              type: "string",
              required: false,
              input: false, // don't allow user to set plan type
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
      client: polarClient,
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
        successUrl: "/thanks",
      },
      // Incoming Webhooks handler will be installed at /polar/webhooks
      webhooks: {
        // webhooks have to be publicly accessible
        // ngrok http http://localhost:3000
        secret: process.env.POLAR_WEBHOOK_SECRET as string,
        async onPayload(payload) {
          switch (payload.type) {
            case "subscription.active":
            case "subscription.canceled":
            case "subscription.updated":
            case "subscription.revoked":
            case "subscription.created":
            case "subscription.uncanceled": {
              const authContext = await auth.$context;
              const userId = payload.data.customer.externalId;
              if (!userId) {
                return;
              }
              if (payload.data.status === "active") {
                const productId = payload.data.product.id;
                const planType = Object.values(PRODUCTS).find(
                  (p) => p.id === productId,
                )?.slug;
                await authContext.internalAdapter.updateUser(userId, {
                  planType,
                });
              } else {
                // No active subscription, so we need to remove the plan type
                await authContext.internalAdapter.updateUser(userId, {
                  planType: null,
                });
              }
            }
          }
        },
      },
    }),
  ],
  onAPIError: {
    onError: (error) => {
      Sentry.captureException(error);
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (
        ctx.path === "/magic-link/verify" ||
        ctx.path === "/verify-email" ||
        ctx.path === "/sign-in/social"
      ) {
        // After verifying email, send them a welcome email
        const newSession = ctx.context.newSession;
        if (newSession) {
          const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
          if (
            ctx.path === "/magic-link/verify" &&
            newSession.user.createdAt < oneMinuteAgo
          ) {
            // magic link is for an account that was created more than a minute ago, so just a normal sign in
            // no need to send welcome email
            return false;
          }
          await sendEmail({
            to: newSession.user.email,
            template: "welcome",
            props: {
              name: newSession.user.name,
            },
          });
          return;
        }
      }
    }),
  },
});
