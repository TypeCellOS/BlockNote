import { Menu, Transition } from "@headlessui/react";
import clsx from "clsx";
import { authClient } from "@/util/auth-client";
import Image from "next/image";
import { ReactElement, ReactNode } from "react";

export function AuthNavButton(props: any) {
  const session = authClient.useSession();

  return session.data ? (
    <NavbarMenu
      menuItems={[
        <Menu.Item key={"thanks"}>
          <div
            className={clsx(
              "nx-relative nx-hidden nx-w-full nx-select-none nx-whitespace-nowrap nx-text-gray-600 hover:nx-text-gray-900 dark:nx-text-gray-400 dark:hover:nx-text-gray-100 md:nx-inline-block",
              "nx-py-1.5 nx-transition-colors ltr:nx-pl-3 ltr:nx-pr-9 rtl:nx-pr-3 rtl:nx-pl-9",
            )}>
            💖 Thanks for sponsoring!
          </div>
        </Menu.Item>,
        <Menu.Item key={"signout"}>
          <button
            onClick={async () => {
              await authClient.signOut();
            }}
            className={clsx(
              "nx-relative nx-hidden nx-w-full nx-select-none nx-whitespace-nowrap nx-text-gray-600 hover:nx-text-gray-900 dark:nx-text-gray-400 dark:hover:nx-text-gray-100 md:nx-inline-block",
              "nx-py-1.5 nx-transition-colors ltr:nx-pl-3 ltr:nx-pr-9 rtl:nx-pr-3 rtl:nx-pl-9",
            )}>
            Sign out
          </button>
        </Menu.Item>,
      ]}>
      {session.data.user.image ? (
        <Image
          className="size-6 rounded-full"
          src={session.data.user.image}
          alt={session.data.user.name}
          width={50}
          height={50}
        />
      ) : (
        <div className="flex size-6 items-center justify-center rounded-full bg-indigo-400 text-xs font-semibold dark:bg-indigo-600">
          {session.data.user.name.substring(0, 2).toUpperCase()}
        </div>
      )}
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
