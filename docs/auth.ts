import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  callbacks: {
    signIn: async (params) => {
      if (params.profile!.sponsorInfo) {
        // user is sponsor
        return true;
      }
      // user is signed in to github, but not a sponsor.
      // TODO: We could redirect to pricing page here
      return true;
      // return "https://www.blocknotejs.org/pricing";
    },
    // https://authjs.dev/guides/extending-the-session
    jwt({ token, user }) {
      if (user) {
        // User is available during sign-in
        token.sponsorInfo = (user as any).sponsorInfo;
      }
      return token;
    },
    session: async (params) => {
      (params.session.user as any).sponsorInfo = (
        params.token as any
      ).sponsorInfo;
      return params.session;
    },
  },
  providers: [
    // copied from https://github.com/nextauthjs/next-auth/blob/234a150e2cac3bc62a9162fa00ed7cb16a105244/packages/core/src/providers/github.ts#L2,
    // but with extra sponsorship api call
    GitHub({
      userinfo: {
        url: `https://api.github.com/user`,
        async request({ tokens, provider }: any) {
          const profile = await fetch(provider.userinfo?.url as URL, {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              "User-Agent": "authjs",
            },
          }).then(async (res) => await res.json());

          if (!profile.email) {
            // If the user does not have a public email, get another via the GitHub API
            // See https://docs.github.com/en/rest/users/emails#list-public-email-addresses-for-the-authenticated-user
            const res = await fetch(`https://api.github.com/user/emails`, {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                "User-Agent": "authjs",
              },
            });

            if (res.ok) {
              const emails: any[] = await res.json();
              profile.email = (
                emails.find((e) => e.primary) ?? emails[0]
              ).email;
            }
          }

          const resSponsor = await fetch(`https://api.github.com/graphql`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tokens.access_token}`,
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

            profile.sponsorInfo = data.data.user.sponsorshipForViewerAsSponsor;
          }

          return profile;
        },
      },
      profile: (profile) => {
        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          username: profile.login,
          sponsorInfo: profile.sponsorInfo,
        };
      },
    }),
  ],
});
