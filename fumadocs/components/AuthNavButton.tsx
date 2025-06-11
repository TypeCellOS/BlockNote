"use client";

import { authClient } from "@/util/auth-client";
import { Menu, Transition } from "@headlessui/react";
import clsx from "clsx";
import { useTheme } from "next-themes";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactElement, ReactNode } from "react";

import CTAButton from "./CTAButton";

interface User {
  image?: string | null;
  name?: string | null;
}

interface UserImageProps {
  user: User;
}

export const UserImage = ({ user }: UserImageProps) => {
  if (user.image) {
    return (
      <Image
        className="size-6 cursor-pointer rounded-full"
        src={user.image}
        alt={user.name || "User avatar"}
        width={50}
        height={50}
      />
    );
  }

  return (
    <div className="flex size-6 cursor-pointer items-center justify-center rounded-full bg-indigo-400 text-xs font-semibold dark:bg-indigo-600">
      {user.name ? (
        user.name.substring(0, 2).toUpperCase()
      ) : (
        <svg
          fill="currentColor"
          viewBox="0 -960 960 960"
          aria-hidden="true"
          className="size-4 text-white"
        >
          <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-240v-32q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v32q0 33-23.5 56.5T720-160H240q-33 0-56.5-23.5T160-240Z" />
        </svg>
      )}
    </div>
  );
};

export function AuthNavButton() {
  const session = authClient.useSession();
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  if (!session.data) {
    return (
      <CTAButton
        href={`/signin?redirect=${encodeURIComponent(pathname)}&theme=${encodeURIComponent(resolvedTheme || "")}`}
        size={"small"}
      >
        Sign in
      </CTAButton>
    );
  }

  return (
    <NavbarMenu
      menuItems={[
        session.data.planType !== "free" && (
          <Menu.Item key={"thanks"}>
            <div
              className={clsx(
                "relative w-full select-none whitespace-nowrap text-gray-600 md:inline-block dark:text-gray-400",
                "px-3 py-1.5 font-bold",
              )}
            >
              💖 Thanks for subscribing! 💖
            </div>
          </Menu.Item>
        ),
        <Menu.Item key={"subscription"}>
          <a
            href={
              session.data.planType === "free" ? "/pricing" : "/api/auth/portal"
            }
            className={clsx(
              "relative w-full select-none whitespace-nowrap text-gray-600 hover:text-gray-900 md:inline-block dark:text-gray-400 dark:hover:text-gray-100",
              "px-3 py-1.5 text-center transition-colors",
            )}
          >
            {session.data.planType === "free"
              ? "Get BlockNote Pro"
              : "Manage my subscription"}
          </a>
        </Menu.Item>,
        <Menu.Item key={"signout"}>
          <button
            onClick={async () => {
              await authClient.signOut();
            }}
            className={clsx(
              "relative w-full cursor-pointer select-none whitespace-nowrap text-gray-600 hover:text-gray-900 md:inline-block dark:text-gray-400 dark:hover:text-gray-100",
              "px-3 py-1.5 transition-colors",
            )}
          >
            Sign out
          </button>
        </Menu.Item>,
      ]}
    >
      <UserImage user={session.data.user} />
    </NavbarMenu>
  );
}

function NavbarMenu({
  menuItems,
  children,
}: {
  menuItems: ReactNode[];
  children: ReactNode;
}): ReactElement {
  return (
    <div className="relative inline-block">
      <Menu>
        <Menu.Button
          className={
            "-ml-2 items-center whitespace-nowrap rounded p-2 md:inline-flex"
          }
        >
          {children as any}
        </Menu.Button>
        <Transition
          leave="transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Menu.Items className="absolute right-0 z-20 mt-1 max-h-64 min-w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/20">
            {menuItems as any[]}
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}
