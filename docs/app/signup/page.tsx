import { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Sign-up",
};

const AuthenticationPage = dynamic(() => import("../AuthenticationPage"));

export default function Register() {
  return <AuthenticationPage variant="register" />;
}
