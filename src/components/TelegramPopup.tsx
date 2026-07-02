"use client";

import React, { useState, useEffect } from "react";

export default function TelegramPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show popup once per browser session after a smooth 1.2s delay
    const seen = sessionStorage.getItem("yoyo_tg_popup_seen");
    if (!seen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("yoyo_tg_popup_seen", "true");
  };

  const handleJoin = () => {
    sessionStorage.setItem("yoyo_tg_popup_seen", "true");
    window.open("https://t.me/yoyosmmonline", "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .tg-join-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.4) !important;
        }
        .tg-close-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
        }
      `}</style>

      {/* Modal Box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg, #1e293b, #0f172a)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 28,
          width: 440,
          maxWidth: "100%",
          padding: "36px 32px 32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(59, 130, 246, 0.15)",
          position: "relative",
          textAlign: "center",
          color: "#ffffff",
          animation: "scaleUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Close Cross Button */}
        <button
          onClick={handleClose}
          className="tg-close-btn"
          title="Close Popup"
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.07)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#94a3b8",
            fontSize: 18,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          ✕
        </button>

        {/* Telegram Icon Header */}
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 24,
            background: "linear-gradient(135deg, #229ED9, #0088cc)",
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 12px 30px rgba(34, 158, 217, 0.4)",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M21.944 3.49101C21.874 3.32801 21.737 3.20401 21.567 3.14901C21.397 3.09401 21.21 3.11501 21.056 3.20401L2.43503 13.967C2.25703 14.07 2.14803 14.257 2.14403 14.464C2.14003 14.671 2.24203 14.863 2.41603 14.972L7.33603 18.04C7.48703 18.134 7.67603 18.141 7.83403 18.058L13.118 15.289L9.77103 19.349C9.64503 19.502 9.60503 19.71 9.66403 19.901C9.72303 20.092 9.87103 20.235 10.059 20.282C10.106 20.294 10.154 20.3 10.201 20.3C10.342 20.3 10.48 20.244 10.581 20.143L13.791 16.933L17.72 19.383C17.854 19.467 18.012 19.501 18.169 19.481C18.326 19.461 18.469 19.388 18.567 19.273L21.967 4.27301C22.012 4.07501 22.014 3.65401 21.944 3.49101Z"
              fill="white"
            />
          </svg>
        </div>

        {/* Title & Description */}
        <h3 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 12px", letterSpacing: "-0.5px" }}>
          Join Our Official Telegram!
        </h3>
        <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.6, margin: "0 0 28px", fontWeight: 500 }}>
          Get instant updates on <strong style={{ color: "#38bdf8" }}>new organic services</strong>, exclusive discount coupon codes, server status alerts, and secret viral pacing tips!
        </p>

        {/* Join Button */}
        <button
          onClick={handleJoin}
          className="tg-join-btn"
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 16,
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(37, 99, 235, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "all 0.2s ease",
          }}
        >
          <span>🚀</span>
          <span>Join @yoyosmmonline Now</span>
        </button>

        {/* Dismiss secondary link */}
        <button
          onClick={handleClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontSize: 13,
            fontWeight: 600,
            marginTop: 16,
            cursor: "pointer",
            textDecoration: "underline",
            opacity: 0.8,
          }}
        >
          No thanks, maybe later
        </button>
      </div>
    </div>
  );
}
