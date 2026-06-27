"use client";
import { usePathname } from "next/navigation";

export default function MaintenanceGate({
  initialMaintenance,
  supportEmail,
  children,
}: {
  initialMaintenance: boolean;
  supportEmail: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminPath = pathname ? pathname.startsWith("/admin") : false;

  if (initialMaintenance && !isAdminPath) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#eef2f7",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "24px 16px",
        boxSizing: "border-box"
      }}>
        <div style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 24,
          padding: "40px 32px",
          background: "#eef2f7",
          boxShadow: "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}>
          <div>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 26,
              background: "#eef2f7",
              boxShadow: "inset 5px 5px 10px #c8d0e7, inset -5px -5px 10px #ffffff"
            }}>
              🔧
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#2d3748", margin: 0, letterSpacing: "-0.5px" }}>
              System Maintenance
            </h1>
            <p style={{ fontSize: 13, color: "#718096", fontWeight: 600, marginTop: 8, margin: 0, lineHeight: 1.6 }}>
              We are currently performing scheduled system upgrades to optimize our S-Curve delivery engine and multi-panel failover layers. We will be back online shortly.
            </p>
          </div>

          <div style={{
            padding: 16,
            borderRadius: 14,
            background: "#eef2f7",
            boxShadow: "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
            fontSize: 12,
            color: "#718096",
            fontWeight: 700,
            lineHeight: 1.5
          }}>
            ⚡ Active S-curve campaigns will continue processing in the background and are unaffected by this dashboard downtime.
          </div>

          {supportEmail && (
            <div style={{ fontSize: 12, fontWeight: 700, color: "#718096" }}>
              Need urgent help? Reach out at{" "}
              <a href={`mailto:${supportEmail}`} style={{ color: "#d97706", textDecoration: "none" }}>
                {supportEmail}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
