"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  HTMLInputTypeAttribute,
  ReactNode,
  useEffect,
  useState,
} from "react";

import { signIn, signUp } from "@/util/auth-client";
import blockNoteLogo from "@/public/img/logos/banner.svg";
import blockNoteLogoDark from "@/public/img/logos/banner.dark.svg";

function AuthenticationInput(props: {
  type: HTMLInputTypeAttribute;
  name: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label
        htmlFor={props.type}
        className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
        {props.name}
      </label>
      <div className="mt-2">
        <input
          id={props.type}
          name={props.type}
          type={props.type}
          required
          autoComplete={props.type}
          className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-gray-800 dark:text-gray-100 dark:outline-gray-700 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
          onChange={props.onChange}
        />
      </div>
    </div>
  );
}

function AuthenticationBox(props: { variant: "login" | "register" | "email" }) {
  const router = useRouter();

  const searchParams = useSearchParams();
  const callbackURL = searchParams?.get("redirect") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [signingInState, setSigningInState] = useState<
    | { state: "init" }
    | { state: "loading" }
    | { state: "done"; message: string }
    | { state: "error"; message: string }
  >({ state: "init" });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSigningInState({ state: "loading" });

    if (props.variant === "login") {
      await signIn.email(
        {
          email,
          password,
          callbackURL,
        },
        {
          onSuccess() {
            router.push("/");
          },
          onError(ctx) {
            setSigningInState({
              state: "error",
              message: ctx.error.message || "",
            });
          },
        },
      );
    } else if (props.variant === "email") {
      await signIn.magicLink(
        {
          email,
          callbackURL,
        },
        {
          onSuccess() {
            setSigningInState({
              state: "done",
              message:
                "We've sent you an email. Click the link inside to log in.",
            });
          },
          onError(ctx) {
            if (ctx.error.code === "VALIDATION_ERROR") {
              setSigningInState({
                state: "error",
                message: "Invalid email address domain.",
              });
            } else {
              setSigningInState({
                state: "error",
                message: ctx.error.message || "",
              });
            }
          },
        },
      );
    } else {
      await signUp.email(
        {
          email,
          password,
          name,
          // TODO: Should be changed to welcome page URL
          callbackURL: "/pricing",
        },
        {
          onSuccess() {
            setSigningInState({
              state: "done",
              message:
                "We've sent you an email. Click the link inside to verify your account.",
            });
          },
          onError(ctx) {
            if (
              ctx.error.code ===
              "POLAR_CUSTOMER_CREATION_FAILED_ERROR_API_ERROR_OCCURRED_DETAILLOCBODYEMAILMSGVALUE_IS_NOT_A_VALID_EMAIL_ADDRESS_THE_DOMAIN_NAME_FESDDDCOM_DOES_NOT_EXISTTYPEVALUE_ERROR"
            ) {
              setSigningInState({
                state: "error",
                message: "Invalid email address domain.",
              });
            } else {
              setSigningInState({
                state: "error",
                message: ctx.error.message || "",
              });
            }
          },
        },
      );
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {props.variant === "register" && (
        <AuthenticationInput
          type="name"
          name="Name"
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <AuthenticationInput
        type="email"
        name="Email address"
        onChange={(e) => setEmail(e.target.value)}
      />
      {props.variant !== "email" && (
        <AuthenticationInput
          type="password"
          name="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
      )}
      <button
        type="submit"
        disabled={signingInState.state === "loading"}
        className={`flex w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${signingInState.state === "loading" ? "cursor-default bg-indigo-400" : "cursor-pointer bg-indigo-600 hover:bg-indigo-500"}`}>
        {signingInState.state === "loading" ? (
          <svg
            fill="currentColor"
            viewBox="0 -960 960 960"
            aria-hidden="true"
            className="size-6 animate-spin fill-white">
            <path d="M480-46q-90 0-168.97-34.08-78.97-34.07-137.92-93.03-58.96-58.95-93.03-137.92Q46-390 46-480q0-90.14 34.06-168.88 34.07-78.74 93-137.93Q232-846 311-880t169-34q26 0 44.5 18.5T543-851q0 26-18.5 44.5T480-788q-128.01 0-218.01 89.99-89.99 89.99-89.99 218T261.99-262q89.99 90 218 90T698-261.99q90-90 90-218.01 0-26 18.5-44.5T851-543q26 0 44.5 18.5T914-480q0 90-34.06 169.01-34.07 79.01-93 138Q728-114 649.14-80 570.28-46 480-46Z" />
          </svg>
        ) : props.variant === "login" ? (
          "Log in"
        ) : props.variant === "email" ? (
          "Sign in with email"
        ) : (
          "Sign up"
        )}
      </button>
      {signingInState.state === "done" && (
        <p className="mt-2 text-center text-sm/6 text-indigo-600 dark:text-indigo-400">
          {signingInState.message}
        </p>
      )}
      {signingInState.state === "error" && (
        <p className="mt-2 text-center text-sm/6 text-red-600 dark:text-red-400">
          {signingInState.message}
        </p>
      )}
    </form>
  );
}

function AlternativeSignInButton(props: {
  name: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-700"
      onClick={props.onClick}>
      {props.icon}
      <span className="text-sm/6 font-semibold">{props.name}</span>
    </button>
  );
}

function EmailSignInButton() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const callbackURL = searchParams?.get("redirect") || "/";
  const theme = searchParams?.get("theme") || "light";

  return (
    <AlternativeSignInButton
      name="Continue with email"
      icon={
        <svg
          fill="currentColor"
          viewBox="0 -960 960 960"
          aria-hidden="true"
          className="size-5">
          <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280 320-200v-80L480-520 160-720v80l320 200Z" />
        </svg>
      }
      onClick={() =>
        router.push(`/signin/email?redirect=${callbackURL}&theme=${theme}`)
      }
    />
  );
}

function GitHubSignInButton() {
  const searchParams = useSearchParams();
  const callbackURL = searchParams?.get("redirect") || "/";

  return (
    <AlternativeSignInButton
      name="Continue with GitHub"
      icon={
        <svg
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="size-5">
          <path
            d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
            clipRule="evenodd"
            fillRule="evenodd"
          />
        </svg>
      }
      onClick={async () =>
        await signIn.social({
          provider: "github",
          callbackURL,
        })
      }
    />
  );
}

function AlternativeSignInBox(props: {
  variant: "login" | "register" | "email";
}) {
  return (
    <div>
      <div className="relative mt-10">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm/6 font-medium">
          <span className="bg-white px-6 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            Or continue with
          </span>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {props.variant !== "email" && <EmailSignInButton />}
        <GitHubSignInButton />
      </div>
    </div>
  );
}

export default function AuthenticationPage(props: {
  variant: "login" | "register" | "email";
}) {
  const router = useRouter();

  const searchParams = useSearchParams();
  const callbackURL = searchParams?.get("redirect") || "/";
  const theme = searchParams?.get("theme") || "light";

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    }
  }, [theme]);

  return (
    <div className="h-screen w-screen bg-white dark:bg-gray-900">
      <div className="flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Image
            className="mx-auto h-10 w-auto cursor-pointer"
            src={theme === "dark" ? blockNoteLogoDark : blockNoteLogo}
            alt={"BlockNote Logo"}
            onClick={() => router.push("/")}
          />
          <h2 className="mt-6 text-center text-2xl/9 font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {props.variant === "login"
              ? "Login to your account"
              : props.variant === "email"
                ? "Login with your email account"
                : "Create an account"}
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
          <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12 dark:bg-gray-800">
            <AuthenticationBox variant={props.variant} />
            <AlternativeSignInBox variant={props.variant} />
          </div>

          <p className="mt-10 text-center text-sm/6 text-gray-500 dark:text-gray-400">
            <span
              className="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              onClick={() => {
                router.push(
                  `${props.variant === "login" ? "/signup" : "/signin"}?redirect=${callbackURL}&theme=${theme}`,
                );
              }}>
              {props.variant === "login"
                ? "Don't have an account? Sign Up"
                : props.variant === "email"
                  ? "Return to account login"
                  : "Already have an account? Log In"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
