import cn from "classnames";
import Link from "next/link";
import { ThemeSwitch } from "nextra-theme-docs";
import type { ReactElement, ReactNode } from "react";
import { Logo } from "./Logo";
function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const classes =
    "text-sm text-[#666666] dark:text-[#888888] no-underline betterhover:hover:text-gray-700 betterhover:hover:dark:text-white transition";
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
  return <h3 className="text-sm text-black dark:text-white">{children}</h3>;
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
      <div className="mx-auto w-full py-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-16">
          <div className="">
            {/* <FooterHeader>Subscribe to our newsletter</FooterHeader> */}
            <Logo />
            <p className="mt-4 text-sm text-gray-600 dark:text-[#888888]">
              BlockNote is an extensible React rich text editor with support for
              block-based editing, collaboration and comes with ready-to-use
              customizable UI components.
            </p>
            {/* <SubmitForm /> */}
          </div>
          <div className="grid grid-cols-1 gap-8 xl:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 md:gap-8">
              <div className="mt-12 xl:!mt-0">
                <FooterHeader>Learn</FooterHeader>
                <ul className="ml-0 mt-4 list-none space-y-1.5">
                  {navigation.general.map((item) => (
                    <li key={item.name}>
                      <FooterLink href={item.href}>{item.name}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-12 xl:!mt-0">
                <FooterHeader>Collaborate</FooterHeader>
                <ul className="ml-0 mt-4 list-none space-y-1.5">
                  {navigation.collaborate().map((item) => (
                    <li key={item.name}>
                      <FooterLink href={item.href}>{item.name}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-12 xl:!mt-0">
                <FooterHeader>Community</FooterHeader>
                <ul className="ml-0 mt-4 list-none space-y-1.5">
                  {navigation.community.map((item) => (
                    <li key={item.name}>
                      <FooterLink href={item.href}>{item.name}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-12 xl:!mt-0">
                <FooterHeader>Legal</FooterHeader>
                <ul className="ml-0 mt-4 list-none space-y-1.5">
                  <li key={"terms-and-conditions"}>
                    <FooterLink href={"/legal/terms-and-conditions"}>Terms & Conditions</FooterLink>
                  </li>
                  <li key={"privacy-policy"}>
                    <FooterLink href={"/legal/privacy-policy"}>Privacy Policy</FooterLink>
                  </li>
                </ul>
              </div>
              <div className="mt-12 xl:!mt-0">
                <FooterHeader>Theme</FooterHeader>
                <ul className="ml-0 mt-4 list-none space-y-1.5">
                  <li>
                    <ThemeSwitch />
                  </li>
                </ul>
                {/* <ThemeSwitch /> */}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="mt-4 text-xs text-gray-500 dark:text-[#888888]">
              &copy; {new Date().getFullYear()} BlockNote maintainers. All
              rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Footer({ menu }: { menu?: boolean }): ReactElement {
  return (
    <footer className="relative bg-[#FAFAFA] pb-[env(safe-area-inset-bottom)] dark:bg-[#111111]">
      {/* <div className="pointer-events-none absolute top-0 h-12 w-full -translate-y-full bg-gradient-to-t from-[#FAFAFA] to-transparent dark:from-black" /> */}
      {/* <div
        className={cn(
          "mx-auto flex max-w-[90rem] gap-2 px-4 py-2",
          menu ? "flex" : "hidden",
        )}>
        <ThemeSwitch />
      </div>
      <hr className="dark:border-neutral-800" /> */}
      <div
        className={cn(
          "mx-auto flex max-w-[90rem] justify-center py-12 text-black dark:text-white md:justify-center",
          "pl-[max(env(safe-area-inset-left),1.5rem)] pr-[max(env(safe-area-inset-right),1.5rem)]",
        )}>
        <FooterContent />
      </div>
    </footer>
  );
}
