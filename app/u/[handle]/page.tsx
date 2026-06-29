"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { ProfileStats } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import ProfileScreen from "@/components/predict/ProfileScreen";
import ProfileDesktop from "@/components/predict/ProfileDesktop";
import { ScreenSkeleton } from "@/components/predict/Skeleton";

export default function ProfilePage({ params }: { params: { handle: string } }) {
  const [profile, setProfile] = useState<ProfileStats | null | undefined>(undefined);
  useEffect(() => {
    void dataSource.getProfile().then((p) =>
      setProfile(p.handle === params.handle.toLowerCase() ? p : null),
    );
  }, [params.handle]);

  if (profile === undefined) return <ScreenSkeleton variant="detail" />;
  if (profile === null) return notFound();

  return (
    <>
      <ProfileScreen profile={profile} />
      <ProfileDesktop profile={profile} />
    </>
  );
}
