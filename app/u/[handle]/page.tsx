"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { ProfileStats } from "@/lib/predict/types";
import { useMe } from "@/components/predict/useMe";
import ProfileScreen from "@/components/predict/ProfileScreen";
import ProfileDesktop from "@/components/predict/ProfileDesktop";
import { ScreenSkeleton } from "@/components/predict/Skeleton";

export default function ProfilePage({ params }: { params: { handle: string } }) {
  const [profile, setProfile] = useState<ProfileStats | null | undefined>(undefined);
  const me = useMe();

  useEffect(() => {
    let live = true;
    void fetch(`/api/predict/profile/${encodeURIComponent(params.handle)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live) setProfile(d?.ok && d.profile ? (d.profile as ProfileStats) : null);
      })
      .catch(() => {
        if (live) setProfile(null);
      });
    return () => {
      live = false;
    };
  }, [params.handle]);

  if (profile === undefined) return <ScreenSkeleton variant="detail" />;
  if (profile === null) return notFound();

  const isOwn = !!me?.handle && me.handle.toLowerCase() === profile.handle.toLowerCase();

  return (
    <>
      <ProfileScreen profile={profile} isOwn={isOwn} />
      <ProfileDesktop profile={profile} isOwn={isOwn} />
    </>
  );
}
