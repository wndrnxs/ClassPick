import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "무료로 시작하기" };

export default function SignupPage() {
  return <SignupForm />;
}
