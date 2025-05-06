import { Metadata } from "next";

import AuthenticationPage from "../../components/AuthenticationPage";

export const metadata: Metadata = {
  title: "Sign-up",
};

export default function Register() {
  return <AuthenticationPage variant="register" />;
}
