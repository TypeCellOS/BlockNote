import AuthenticationPage from "@/components/AuthenticationPage";
import { getFullMetadata } from "@/lib/getFullMetadata";
import { Suspense } from "react";

export const metadata = getFullMetadata({
  title: "Sign Up",
  path: "/signup",
});

// Suspense + imported AuthenticationPage because AuthenticationPage is a client component
// https://nextjs.org/docs/app/api-reference/functions/use-search-params#static-rendering
export default function Page() {
  return (
    <Suspense>
      <AuthenticationPage variant="register" />
    </Suspense>
  );
}
