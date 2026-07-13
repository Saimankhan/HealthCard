import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in - HealthCard",
};

export default function LoginPage() {
  return <LoginForm />;
}
