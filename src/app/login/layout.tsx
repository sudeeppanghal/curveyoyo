import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login — YoyoSMM",
  description: "Sign in to your YoyoSMM dashboard. Start, schedule, and track your organic pacing SMM campaigns.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
