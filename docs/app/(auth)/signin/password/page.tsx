import AuthenticationPage from "@/components/AuthenticationPage";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Password Login",
};

// Suspense + imported AuthenticationPage because AuthenticationPage is a client component
// https://nextjs.org/docs/app/api-reference/functions/use-search-params#static-rendering
export default function Page() {
  return (
    <Suspense>
      <AuthenticationPage variant="password" />
    </Suspense>
  );
}
