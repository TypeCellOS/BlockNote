import { authClient } from "@/util/auth-client";
import { Menu, Transition } from "@headlessui/react";
import clsx from "clsx";
import { ReactElement, ReactNode } from "react";

import { UserImage } from "./UserImage";

export function AuthNavButton(props: any) {
  const session = authClient.useSession();

  return session.data ? (
    <NavbarMenu
      menuItems={[
        session.data.planType !== "free" && (
          <Menu.Item key={"thanks"}>
            <div
              className={clsx(
                "nx-relative nx-hidden nx-w-full nx-select-none nx-whitespace-nowrap nx-text-gray-600 dark:nx-text-gray-400 md:nx-inline-block",
                "nx-py-1.5 nx-px-3 font-bold",
              )}>
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
              "nx-relative nx-hidden nx-w-full nx-select-none nx-whitespace-nowrap nx-text-gray-600 hover:nx-text-gray-900 dark:nx-text-gray-400 dark:hover:nx-text-gray-100 md:nx-inline-block",
              "nx-py-1.5 nx-px-3 nx-transition-colors text-center",
            )}>
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
              "nx-relative nx-hidden nx-w-full nx-select-none nx-whitespace-nowrap nx-text-gray-600 hover:nx-text-gray-900 dark:nx-text-gray-400 dark:hover:nx-text-gray-100 md:nx-inline-block",
              "nx-py-1.5 nx-px-3 nx-transition-colors",
            )}>
            Sign out
          </button>
        </Menu.Item>,
      ]}>
      <UserImage user={session.data.user} />
    </NavbarMenu>
  ) : (
    <>
      {/* TODO: move to footer */}{" "}
      {/* <button
        onClick={async () => {
          await signIn("github", {});
        }}>
        Sign in
      </button> */}
    </>
  );
}

function NavbarMenu({
  className,
  menuItems,
  children,
}: {
  className?: string;
  menuItems: ReactNode[];
  children: ReactNode;
}): ReactElement {
  return (
    <div className="nx-relative nx-inline-block">
      <Menu>
        <Menu.Button
          className={
            "-nx-ml-2 nx-hidden nx-items-center nx-whitespace-nowrap nx-rounded nx-p-2 md:nx-inline-flex"
          }>
          {children}
        </Menu.Button>
        <Transition
          leave="nx-transition-opacity"
          leaveFrom="nx-opacity-100"
          leaveTo="nx-opacity-0">
          <Menu.Items className="nx-absolute nx-right-0 nx-z-20 nx-mt-1 nx-max-h-64 nx-min-w-full nx-overflow-auto nx-rounded-md nx-ring-1 nx-ring-black/5 nx-bg-white nx-py-1 nx-text-sm nx-shadow-lg dark:nx-ring-white/20 dark:nx-bg-neutral-800">
            {menuItems}
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}
