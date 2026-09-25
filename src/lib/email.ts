import { Resend } from "resend";

const PRIMARY_FROM = "YoyoSMM <noreply@yoyosmm.online>";
const FALLBACK_FROM = "YoyoSMM <onboarding@resend.dev>";

function getResendApiKeys(): string[] {
  const keysEnv = process.env.RESEND_API_KEYS || process.env.RESEND_API_KEY || "";
  const keys = keysEnv.split(",").map(k => k.trim()).filter(Boolean);
  return keys;
}

export async function sendEmailWithRotation(options: { from?: string; to: string; subject: string; html: string }) {
  const keys = getResendApiKeys();
  let lastError: any = null;

  // Try sending with custom domain first, fallback to onboarding@resend.dev if domain not verified yet
  const fromAddresses = [options.from || PRIMARY_FROM, FALLBACK_FROM];

  for (const fromAddr of fromAddresses) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const resend = new Resend(key);
        const res = await resend.emails.send({
          from: fromAddr,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });

        if ((res as any).error) {
          const errMsg = (res as any).error.message || JSON.stringify((res as any).error);
          console.warn(`[EmailRotation] Key #${i + 1} (${fromAddr}) returned error:`, errMsg);
          lastError = (res as any).error;

          // If domain is not verified, fail fast to FALLBACK_FROM
          if (errMsg.includes("domain") || errMsg.includes("verify")) {
            break;
          }
          continue;
        }

        console.log(`[EmailRotation] Successfully sent email to ${options.to} from ${fromAddr} using Resend Key #${i + 1}`);
        return res;
      } catch (err: any) {
        console.warn(`[EmailRotation] Key #${i + 1} (${fromAddr}) exception:`, err);
        lastError = err;
      }
    }
  }

  throw new Error(lastError?.message || "All Resend API keys and sender fallbacks failed.");
}

function getAppUrl() {
  let appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.yoyosmm.online";
  return appUrl;
}

export async function sendOtpEmail(to: string, otp: string) {
  return sendEmailWithRotation({
    from: PRIMARY_FROM,
    to,
    subject: `🔐 ${otp} is your YoyoSMM Password Reset OTP`,
    html: `
      <div style="font-family:'Inter',-apple-system,sans-serif;max-width:500px;margin:0 auto;background:#0F172A;color:#F8FAFC;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.4)">
        <div style="background:linear-gradient(135deg,#D97706,#EA580C);padding:32px 24px;text-align:center">
          <div style="width:52px;height:52px;background:#0F172A;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#F59E0B;margin:0 auto 12px">Y</div>
          <h1 style="margin:0;font-size:22px;color:#FFFFFF;letter-spacing:-0.5px">Password Reset OTP</h1>
        </div>
        <div style="padding:32px 28px;text-align:center">
          <p style="color:#94A3B8;font-size:14px;margin:0 0 20px">You requested a password reset for your YoyoSMM account. Use the 6-digit OTP code below to verify:</p>
          
          <div style="background:#1E293B;border:2px dashed #D97706;border-radius:16px;padding:20px;margin:0 0 24px;display:inline-block">
            <span style="font-family:monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#F59E0B">${otp}</span>
          </div>
          
          <p style="color:#64748B;font-size:12px;margin:0">This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        <div style="background:#1E293B;padding:16px 28px;text-align:center;border-top:1px solid #334155">
          <p style="color:#64748B;font-size:11px;margin:0">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      </div>`,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmailWithRotation({
    from: PRIMARY_FROM, to,
    subject: "🎉 Welcome to YoyoSMM — Your account is ready!",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0B0B0F;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#F59E0B,#F97316);padding:32px;text-align:center">
          <div style="width:48px;height:48px;background:#0B0B0F;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:20px">Y</div>
          <h1 style="margin:16px 0 0;font-size:24px;color:#0B0B0F">Welcome to YoyoSMM!</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#e5e7eb">Hey ${name} 👋</p>
          <p style="color:#9ca3af">Your account is active and ready. Add balance to your wallet via UPI or Crypto to start delivering views and engagement with organic S-curve pacing.</p>
          <a href="${getAppUrl()}/billing" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#F59E0B;color:#0B0B0F;border-radius:12px;font-weight:700;text-decoration:none">
            Deposit Funds →
          </a>
        </div>
      </div>`,
  });
}

export async function sendPaymentConfirmedEmail(to: string, name: string, txHash: string, network: string) {
  return sendEmailWithRotation({
    from: PRIMARY_FROM, to,
    subject: "✅ Deposit Confirmed — Wallet Balance Updated!",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0B0B0F;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#34d399,#059669);padding:32px;text-align:center">
          <div style="font-size:40px">✅</div>
          <h1 style="margin:12px 0 0;font-size:22px;color:#0B0B0F">Deposit Confirmed!</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#e5e7eb">Hey ${name} 🎉</p>
          <p style="color:#9ca3af">Your deposit has been verified and added directly to your <strong style="color:#F59E0B">wallet balance</strong>. You can now launch organic pacing campaigns instantly.</p>
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin:16px 0;font-size:12px;color:#6b7280">
            <p style="margin:0">Network/Method: <strong style="color:#fff">${network}</strong></p>
            <p style="margin:8px 0 0">Ref/TXID: <code style="color:#F59E0B;word-break:break-all">${txHash}</code></p>
          </div>
          <a href="${getAppUrl()}/reels/new" style="display:inline-block;margin:16px 0;padding:14px 28px;background:#F59E0B;color:#0B0B0F;border-radius:12px;font-weight:700;text-decoration:none">
            Create Order →
          </a>
        </div>
      </div>`,
  });
}

export async function sendTrialEndingEmail(to: string, name: string) {
  return Promise.resolve();
}

export async function sendOrderCompletedEmail(to: string, name: string, views: number, platform: string) {
  return sendEmailWithRotation({
    from: PRIMARY_FROM, to,
    subject: `✅ Campaign complete — ${views.toLocaleString()} views delivered`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0B0B0F;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#34d399,#059669);padding:32px;text-align:center">
          <div style="font-size:40px">🎯</div>
          <h1 style="margin:12px 0 0;font-size:22px;color:#0B0B0F">${views.toLocaleString()} views delivered!</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#e5e7eb">Hey ${name},</p>
          <p style="color:#9ca3af">Your ${platform} campaign completed successfully. All <strong style="color:#F59E0B">${views.toLocaleString()} views</strong> were delivered via organic S-curve.</p>
          <a href="${getAppUrl()}/orders" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#F59E0B;color:#0B0B0F;border-radius:12px;font-weight:700;text-decoration:none">
            View Analytics →
          </a>
        </div>
      </div>`,
  });
}
