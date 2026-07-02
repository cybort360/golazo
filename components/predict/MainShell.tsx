"use client";

import { usePathname } from "next/navigation";

// Full-bleed routes (landing + auth) render without the app chrome: no sidebar
// gutter, no bottom-nav padding. Everything else gets the standard shell.
const BARE = ["/welcome", "/login", "/signup"];

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE.some((p) => pathname === p || pathname?.startsWith(p + "/"));
  return (
    <main className={bare ? "relative z-10" : "relative z-10 pb-[68px] lg:pb-0 lg:pl-[230px]"}>{children}</main>
  );
}
