import { Icon } from "@/components/Icon";
import { SOCIALS } from "@/lib/socials";

// Telegram + X community links as icon buttons. Renders only the ones that have
// a URL configured. `variant` controls the look: subtle for the footer, filled
// chips for the homepage CTA.
export default function SocialLinks({
  size = 18,
  variant = "ghost",
  className = "",
}: {
  size?: number;
  variant?: "ghost" | "chip";
  className?: string;
}) {
  const links: { name: "telegram" | "x"; label: string; href: string }[] = [];
  if (SOCIALS.telegram) links.push({ name: "telegram", label: "Telegram", href: SOCIALS.telegram });
  if (SOCIALS.x) links.push({ name: "x", label: "X", href: SOCIALS.x });
  if (links.length === 0) return null;

  const base =
    variant === "chip"
      ? "inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
      : "inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {links.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Golazo on ${l.label}`}
          className={base}
        >
          <Icon name={l.name} size={size} />
          {variant === "chip" && l.label}
        </a>
      ))}
    </div>
  );
}
