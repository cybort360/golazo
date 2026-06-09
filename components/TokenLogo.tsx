"use client";

import Image from "next/image";
import { useState } from "react";
import { Flag } from "@/components/Flag";

// Hosts permitted by next.config images.remotePatterns. Guarding here means an
// unexpected image host falls back to the flag instead of throwing in next/image.
const ALLOWED_HOSTS = new Set(["dd.dexscreener.com", "api.dexscreener.com"]);

function isAllowed(url: string): boolean {
  try {
    return ALLOWED_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Renders the token's DexScreener logo via next/image, falling back to the
// country Flag when there's no image (unlaunched / not indexed) or it fails.
export default function TokenLogo({
  imageUrl,
  flagCode,
  alt,
}: {
  imageUrl: string | null | undefined;
  flagCode: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed || !isAllowed(imageUrl)) {
    return (
      <Flag
        code={flagCode}
        className="block rounded-md text-6xl shadow-md ring-1 ring-black/5 md:text-7xl"
      />
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={72}
      height={72}
      onError={() => setFailed(true)}
      className="h-[56px] w-[56px] rounded-xl object-cover shadow-md ring-1 ring-black/5 md:h-[72px] md:w-[72px]"
    />
  );
}
