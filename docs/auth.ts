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
        // TODO
        return true;
      }
      return true;
      return "https://github.com/sponsors/TypeCellOS"; // TODO
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
            body: JSON.stringify({
              query: `{
                organization(login:"TypeCellOS") {
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
            const data = await resSponsor.json();

            profile.sponsorInfo =
              data.data.organization.sponsorshipForViewerAsSponsor;
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
          sponsorInfo: profile.sponsorsTypeCell,
        };
      },
    }),
  ],
});
