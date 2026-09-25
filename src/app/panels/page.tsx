"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PanelsPage() {
  const router = useRouter();

  useEffect(() => {
    // Custom panel configuration is disabled for end-users.
    // All deliveries are managed centrally through platform providers.
    router.replace("/dashboard");
  }, [router]);

  return null;
}
