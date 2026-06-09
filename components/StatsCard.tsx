import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

export interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number; // percentage, positive or negative
  icon?: ReactNode; // an <Icon> or <Flag> element
  href?: string; // if set, whole card is clickable
  isLoading?: boolean;
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export default function StatsCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  href,
  isLoading = false,
}: StatsCardProps) {
  const up = trend !== undefined && trend >= 0;

  const body = (
    <div
      className={cx(
        "flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-all duration-200",
        href &&
          "hover:-translate-y-0.5 hover:shadow-card-md focus-visible:ring-2 focus-visible:ring-green-500/40",
      )}
    >
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-base leading-none">
            {icon}
          </span>
        )}
        <span className="text-sm font-medium uppercase tracking-wide text-slate-400">
          {title}
        </span>
      </div>

      {isLoading ? (
        <span className="h-7 w-24 animate-pulse rounded bg-slate-100" />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl font-bold tabular-nums text-slate-900">
            {value}
          </span>
          {trend !== undefined && (
            <span
              className={cx(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500",
              )}
            >
              <Icon name={up ? "up" : "down"} size={12} strokeWidth={2.5} />
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        subtitle !== undefined && (
          <span className="h-3 w-16 animate-pulse rounded bg-slate-100" />
        )
      ) : (
        subtitle && <span className="text-xs text-slate-400">{subtitle}</span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full rounded-xl focus:outline-none"
        aria-label={title}
      >
        {body}
      </Link>
    );
  }

  return body;
}
