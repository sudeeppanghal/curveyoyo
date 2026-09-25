import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up — YoyoSMM",
  description: "Create your free YoyoSMM account. Gain access to the world's best organic pacing SMM services for Instagram, TikTok, and Facebook views.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
