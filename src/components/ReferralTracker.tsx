"use client";
import { useEffect } from "react";

export default function ReferralTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || params.get("via") || params.get("aff");
      if (ref) {
        const code = ref.toUpperCase();
        localStorage.setItem("yoyo_ref", code);
        const sessionKey = "yoyo_ref_tracked_" + code;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "1");
          fetch("/api/affiliate/click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ref: code }),
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }, []);
  return null;
}
