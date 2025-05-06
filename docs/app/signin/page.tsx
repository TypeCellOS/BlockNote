import { Metadata } from "next";

import AuthenticationPage from "../../components/AuthenticationPage";
export const metadata: Metadata = {
  title: "Login",
};

export default function Register() {
  return <AuthenticationPage variant="email" />;
}
