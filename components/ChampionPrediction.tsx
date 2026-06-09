"use client";

import { useEffect, useMemo, useState } from "react";
import { TEAMS } from "@/constants/teams";
import { Flag } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import TeamSelect from "@/components/TeamSelect";

const STORAGE_KEY = "golazo_champion_pick";

// Lightweight, no-backend prediction: the user's champion pick lives in
// localStorage only. Once an actual champion is crowned we grade the pick.
export default function ChampionPrediction({
  champion,
}: {
  champion: string | null;
}) {
  const sorted = useMemo(
    () => [...TEAMS].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const [pick, setPick] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v && TEAMS.some((t) => t.ticker === v)) setPick(v);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  const save = () => {
    if (!draft) return;
    try {
      localStorage.setItem(STORAGE_KEY, draft);
    } catch {
      /* ignore */
    }
    setPick(draft);
    setEditing(false);
  };

  const pickedTeam = pick ? TEAMS.find((t) => t.ticker === pick) : undefined;
  const decided = champion != null;
  const correct = decided && pick != null && pick === champion;

  const showPicker = loaded && (editing || !pick);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-slate-500">
          <Icon name="trophy" size={15} className="text-amber-500" />
          Predict the Champion
        </h2>
        {pickedTeam && !editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(pickedTeam.ticker);
              setEditing(true);
            }}
            disabled={decided}
            className="text-xs font-semibold uppercase tracking-wider text-green-600 transition-colors hover:text-green-700 disabled:opacity-40"
          >
            Change
          </button>
        )}
      </div>

      {/* Result grading once a champion exists */}
      {decided && pickedTeam && (
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
            correct
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          <Icon name={correct ? "check" : "close"} size={16} />
          {correct
            ? "You called it!"
            : `Not this time. You picked ${pickedTeam.name}.`}
        </div>
      )}

      {showPicker ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <TeamSelect teams={sorted} value={draft} onChange={setDraft} />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!draft}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-40"
          >
            Lock in pick
          </button>
        </div>
      ) : pickedTeam ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Your pick:</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
            <Flag code={pickedTeam.flagCode} className="text-base" />
            {pickedTeam.name}
          </span>
        </div>
      ) : (
        // Stable placeholder before localStorage is read (avoids layout shift).
        <p className="text-sm text-slate-400">
          Call your World Cup winner. Saved on this device.
        </p>
      )}
    </section>
  );
}
