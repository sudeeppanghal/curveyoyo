import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

const FROM = "YoyoSMM <noreply@yoyosmm.online>";

export async function sendWelcomeEmail(to: string, name: string) {
  return getResend().emails.send({
    from: FROM, to,
    subject: "🎉 Welcome to YoyoSMM — Your 1-day trial is active!",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0B0B0F;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#F59E0B,#F97316);padding:32px;text-align:center">
          <div style="width:48px;height:48px;background:#0B0B0F;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:20px">Y</div>
          <h1 style="margin:16px 0 0;font-size:24px;color:#0B0B0F">Welcome to YoyoSMM!</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#e5e7eb">Hey ${name} 👋</p>
          <p style="color:#9ca3af">Your 1-day free trial is now active. Connect your first SMM panel and start delivering organic views.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#F59E0B;color:#0B0B0F;border-radius:12px;font-weight:700;text-decoration:none">
            Go to Dashboard →
          </a>
          <p style="color:#6b7280;font-size:12px">After your trial: Lifetime access for just $20 USDT (one-time payment).</p>
        </div>
      </div>`,
  });
}

export async function sendPaymentConfirmedEmail(to: string, name: string, txHash: string, network: string) {
  return getResend().emails.send({
    from: FROM, to,
    subject: "✅ Payment Confirmed — Lifetime Access Unlocked!",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0B0B0F;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#34d399,#059669);padding:32px;text-align:center">
          <div style="font-size:40px">✅</div>
          <h1 style="margin:12px 0 0;font-size:22px;color:#0B0B0F">Lifetime Access Unlocked!</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#e5e7eb">Hey ${name} 🎉</p>
          <p style="color:#9ca3af">Your USDT payment has been verified on-chain. You now have <strong style="color:#F59E0B">lifetime access</strong> to YoyoSMM — no renewals, ever.</p>
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin:16px 0;font-size:12px;color:#6b7280">
            <p style="margin:0">Network: <strong style="color:#fff">${network}</strong></p>
            <p style="margin:8px 0 0">TXID: <code style="color:#F59E0B;word-break:break-all">${txHash}</code></p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;margin:16px 0;padding:14px 28px;background:#F59E0B;color:#0B0B0F;border-radius:12px;font-weight:700;text-decoration:none">
            Go to Dashboard →
          </a>
        </div>
      </div>`,
  });
}

export async function sendTrialEndingEmail(to: string, name: string) {
  return getResend().emails.send({
    from: FROM, to,
    subject: "⏳ Your YoyoSMM trial ends in 2 hours",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0B0B0F;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#F59E0B,#F97316);padding:32px;text-align:center">
          <div style="font-size:40px">⏳</div>
          <h1 style="margin:12px 0 0;font-size:22px;color:#0B0B0F">Trial Ending Soon</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#e5e7eb">Hey ${name},</p>
          <p style="color:#9ca3af">Your 1-day free trial ends in 2 hours. Upgrade now to keep delivering unlimited views.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#F59E0B;color:#0B0B0F;border-radius:12px;font-weight:700;text-decoration:none">
            Upgrade for $20 (Lifetime) →
          </a>
        </div>
      </div>`,
  });
}

export async function sendOrderCompletedEmail(to: string, name: string, views: number, platform: string) {
  return getResend().emails.send({
    from: FROM, to,
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
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#F59E0B;color:#0B0B0F;border-radius:12px;font-weight:700;text-decoration:none">
            View Analytics →
          </a>
        </div>
      </div>`,
  });
}
