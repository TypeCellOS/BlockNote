import { cn } from "@/lib/fumadocs/cn";
import LogoDark from "@/public/img/logos/banner.dark.svg";
import LogoLight from "@/public/img/logos/banner.svg";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";

import ThemedImage from "@/components/ThemedImage";

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const classes =
    "text-sm text-stone-500 no-underline transition-colors hover:text-purple-600 block py-1";
  if (href.startsWith("http")) {
    return (
      <a className={classes} href={href}>
        {children}
      </a>
    );
  }
  return (
    <Link className={classes} href={href}>
      {children}
    </Link>
  );
}

function FooterHeader({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-4 font-serif text-base text-stone-900">{children}</h3>
  );
}

const navigation = {
  general: [
    { name: "Documentation", href: "/docs" },
    { name: "Examples", href: "/examples" },
    {
      name: "Releases",
      href: "https://github.com/TypeCellOS/BlockNote/releases",
    },
  ],

  community: [
    {
      name: "GitHub",
      href: "https://github.com/TypeCellOS/BlockNote",
    },
    {
      name: "Discord",
      href: "https://discord.com/invite/Qc2QTTH5dF",
    },
  ],
  collaborate: () => [
    { name: "Partner with us", href: `/about#partner-with-us` },
    {
      name: "Sponsorships",
      href: `/about#sponsorships`,
    },
    {
      name: "Contribute",
      href: `/about#contribute`,
    },
  ],
};

export function FooterContent() {
  return (
    <div aria-labelledby="footer-heading" className="w-full">
      <h2 className="sr-only" id="footer-heading">
        Footer
      </h2>
      <div className="mx-auto w-full">
        <div className="xl:grid xl:grid-cols-3 xl:gap-16">
          <div className="mb-12 xl:mb-0">
            <ThemedImage
              src={{ light: LogoLight, dark: LogoDark }}
              alt="BlockNote"
              className="mb-6 w-40"
            />
            <p className="max-w-sm text-sm leading-relaxed text-stone-500">
              BlockNote is an extensible React rich text editor with support for
              block-based editing, real-time collaboration, and comes with
              ready-to-use customizable UI components.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2">
            <div>
              <FooterHeader>Learn</FooterHeader>
              <ul className="space-y-1">
                {navigation.general.map((item) => (
                  <li key={item.name}>
                    <FooterLink href={item.href}>{item.name}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <FooterHeader>Collaborate</FooterHeader>
              <ul className="space-y-1">
                {navigation.collaborate().map((item) => (
                  <li key={item.name}>
                    <FooterLink href={item.href}>{item.name}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <FooterHeader>Community</FooterHeader>
              <ul className="space-y-1">
                {navigation.community.map((item) => (
                  <li key={item.name}>
                    <FooterLink href={item.href}>{item.name}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <FooterHeader>Legal & Theme</FooterHeader>
              <ul className="space-y-1">
                <li>
                  <FooterLink href={"/legal/terms-and-conditions"}>
                    Terms & Conditions
                  </FooterLink>
                </li>
                <li>
                  <FooterLink href={"/legal/privacy-policy"}>
                    Privacy Policy
                  </FooterLink>
                </li>
                {/* <li className="pt-2">
                  <ThemeToggle mode="light-dark-system" />
                </li> */}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-stone-200 pt-8 sm:flex sm:items-center sm:justify-between">
          <p className="text-xs text-stone-400">
            &copy; {new Date().getFullYear()} BlockNote maintainers. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Footer({ menu }: { menu?: boolean }): ReactElement {
  return (
    <footer className="relative z-30 border-t border-stone-200 bg-stone-50">
      <div
        className={cn(
          "mx-auto flex max-w-[90rem] justify-center py-16 text-stone-900 md:justify-center",
          "pl-[max(env(safe-area-inset-left),1.5rem)] pr-[max(env(safe-area-inset-right),1.5rem)]",
        )}
      >
        <FooterContent />
      </div>
    </footer>
  );
}
