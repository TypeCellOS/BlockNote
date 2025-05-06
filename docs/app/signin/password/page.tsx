import { Metadata } from "next";

import AuthenticationPage from "../../../components/AuthenticationPage";

export const metadata: Metadata = {
  title: "Password Login",
};

export default function Register() {
  return <AuthenticationPage variant="password" />;
}
