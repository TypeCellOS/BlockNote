"use client";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/fumadocs/cn";
import { Menu } from "@base-ui/react/menu";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ComponentProps, ReactElement, ReactNode } from "react";
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
  // const session = authClient.useSession();
  const session = {
    data: {
      planType: "free",
      user: {
        name: "You",
        image: undefined,
      },
    },
  };
  const pathname = usePathname();

  if (!session.data) {
    return (
      <CTAButton
        href={`/signin?redirect=${encodeURIComponent(pathname || "")}`}
        size={"small"}
      >
        Sign in
      </CTAButton>
    );
  }

  return (
    <NavbarMenu
      menuItems={[
        <Menu.Item
          key={"subscription"}
          className={cn(
            "flex cursor-default select-none py-2 pl-4 pr-8 text-sm leading-4 outline-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-gray-900 dark:data-[highlighted]:text-gray-900 dark:data-[highlighted]:before:bg-gray-100",
          )}
        >
          <a
            href={"/pricing"}
            onClick={async (e) => {
              if (session.data?.planType !== "free") {
                e.preventDefault();
                await authClient.customer.portal();
              }
            }}
          >
            {session.data.planType === "free"
              ? "Get BlockNote Pro"
              : "Manage my subscription"}
          </a>
        </Menu.Item>,
        <Menu.Item
          key={"signout"}
          className={cn(
            "flex cursor-default select-none py-2 pl-4 pr-8 text-sm leading-4 outline-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-gray-900 dark:data-[highlighted]:text-gray-900 dark:data-[highlighted]:before:bg-gray-100",
          )}
        >
          <button
            onClick={async () => {
              await authClient.signOut();
            }}
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
    <Menu.Root>
      <Menu.Trigger
      // className="flex h-10 select-none items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3.5 text-base font-medium text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-100 data-[popup-open]:bg-gray-100"
      >
        {children}
      </Menu.Trigger>
      {/* <Menu.Button
          className={
            "-ml-2 items-center whitespace-nowrap rounded p-2 md:inline-flex"
          }
        >
          {children as any}
        </Menu.Button> */}
      <Menu.Portal>
        <Menu.Positioner className="z-50000 outline-none" sideOffset={10}>
          <Menu.Popup className="origin-[var(--transform-origin)] rounded-md bg-[canvas] py-1 text-gray-900 shadow-lg shadow-gray-200 outline outline-1 outline-gray-200 transition-[transform,scale,opacity] data-[ending-style]:scale-90 data-[starting-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:bg-neutral-900 dark:text-gray-100 dark:shadow-none dark:-outline-offset-1 dark:outline-gray-700">
            <Menu.Arrow className="data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=right]:left-[-13px] data-[side=top]:bottom-[-8px] data-[side=left]:rotate-90 data-[side=right]:-rotate-90 data-[side=top]:rotate-180">
              <ArrowSvg />
            </Menu.Arrow>
            {menuItems}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
      {/* <Transition
          leave="transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Menu.Items className="absolute right-0 z-20 mt-1 max-h-64 min-w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/20">
            {menuItems as any[]}
          </Menu.Items>
        </Transition> */}
    </Menu.Root>
  );
}

function ArrowSvg(props: ComponentProps<"svg">) {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
      <path
        d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
        className="fill-[canvas] dark:fill-neutral-900"
      />
      <path
        d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
        className="fill-gray-200 dark:fill-none"
      />
      <path
        d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
        className="dark:fill-gray-700"
      />
    </svg>
  );
}
