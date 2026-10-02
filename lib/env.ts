import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

function secret(name: string): string {
  const value = required(name);
  if (value.length < 32) throw new Error(`${name} must be at least 32 characters long.`);
  return value;
}

export const env = {
  databaseUrl: () => required("DATABASE_URL"),
  sessionSecret: () => secret("SESSION_SECRET"),
  qrSecret: () => secret("QR_SECRET"),
  cronSecret: () => secret("CRON_SECRET"),
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  /** Shows the login code on screen instead of sending an SMS. Never enable in production. */
  otpDevMode: () => process.env.OTP_DEV_MODE === "true",
  twilio: () =>
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM
      ? {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          from: process.env.TWILIO_FROM,
        }
      : null,
  vapid: () =>
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
      ? {
          publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          privateKey: process.env.VAPID_PRIVATE_KEY,
          subject: process.env.VAPID_SUBJECT ?? "mailto:hello@rashfa.ma",
        }
      : null,
  supabaseStorage: () =>
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? { url: process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY }
      : null,
};
