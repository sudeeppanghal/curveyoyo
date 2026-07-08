"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#d97706" : "none"} stroke={active ? "#d97706" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    href: "/orders",
    label: "Orders",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#d97706" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    ),
  },
  {
    href: "/reels/new",
    label: "New Order",
    icon: (active: boolean) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? "#ffffff" : "#ffffff"} stroke="none">
        <circle cx="12" cy="12" r="12" fill={active ? "#d97706" : "#374151"}/>
        <path d="M12 7v10M7 12h10" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    isFab: true,
  },
  {
    href: "/billing",
    label: "Wallet",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#d97706" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
        <circle cx="17" cy="15" r="1.5" fill={active ? "#d97706" : "#9ca3af"}/>
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#d97706" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
];

export default function MobileNav() {
  const pathname = usePathname();

  // Don't show on auth/landing pages
  const hiddenPaths = ["/", "/login", "/signup", "/forgot-password", "/update-password"];
  if (hiddenPaths.includes(pathname) || pathname.startsWith("/admin")) return null;

  return (
    <>
      <style>{`
        .mob-nav-bar {
          display: none;
        }
        @media (max-width: 767px) {
          .mob-nav-bar {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 9999;
            background: #eef2f7;
            box-shadow: 0 -1px 0 rgba(200,208,231,0.8), 0 -8px 32px rgba(200,208,231,0.4);
            padding: 8px 4px calc(8px + env(safe-area-inset-bottom, 0px));
            justify-content: space-around;
            align-items: center;
          }
          .mob-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            min-width: 56px;
            padding: 6px 8px;
            border-radius: 14px;
            text-decoration: none;
            transition: all 0.15s ease;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          .mob-nav-item:active {
            transform: scale(0.92);
          }
          .mob-nav-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.02em;
          }
          .mob-nav-fab {
            margin-top: -14px;
          }
        }
      `}</style>
      <nav className="mob-nav-bar" role="navigation" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = item.isFab
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mob-nav-item${item.isFab ? " mob-nav-fab" : ""}`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {item.icon(isActive)}
              {!item.isFab && (
                <span
                  className="mob-nav-label"
                  style={{ color: isActive ? "#d97706" : "#9ca3af" }}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
