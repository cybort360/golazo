// Community links, env-overridable so handles can change without a code edit.
// A link is only rendered when it has a URL (see SocialLinks).
export const SOCIALS: { telegram: string | null; x: string | null } = {
  telegram:
    process.env.NEXT_PUBLIC_TELEGRAM_COMMUNITY_URL || "https://t.me/golazo_sports",
  // Override with NEXT_PUBLIC_X_URL if the handle changes.
  x: process.env.NEXT_PUBLIC_X_URL || "https://x.com/golazodotfun",
};
