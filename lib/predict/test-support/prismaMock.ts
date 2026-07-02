import { vi } from "vitest";

// Minimal in-memory Prisma stand-in for the settlement tests. It implements only
// the query shapes lib/predict/settle.ts actually uses — enough to exercise the
// real settlement code against `vi.mock("@/lib/db/client")` without a database.
//
// Usage (the mock factory is hoisted, so call this at module top level):
//   const store = mockPrisma();
//   vi.mock("@/lib/db/client", () => ({ prisma: store.prisma }));
//   // then seed store.predictions / store.matches / store.events per test.

export interface PredRow {
  id: string;
  userId: string;
  matchId: string;
  marketId: string;
  optionId: string;
  predictionLabel: string;
  status: "PENDING" | "WON" | "LOST" | "VOID";
  points: number;
  proofRef: string | null;
  settledAt: Date | null;
}

export interface MatchRow {
  id: string;
  homeTicker: string | null;
  awayTicker: string | null;
}

export interface EventRow {
  matchId: string;
  seq: number;
  type: string | null;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface Store {
  predictions: PredRow[];
  matches: MatchRow[];
  events: EventRow[];
  prisma: {
    prediction: {
      findMany: (args?: any) => Promise<any[]>;
      update: (args: any) => Promise<any>;
    };
    match: { findUnique: (args: any) => Promise<any | null> };
    txlineEvent: { findMany: (args?: any) => Promise<any[]> };
  };
}

export function mockPrisma(): Store {
  const store: Store = {
    predictions: [],
    matches: [],
    events: [],
    prisma: {
      prediction: {
        findMany: vi.fn(async ({ where = {}, distinct }: any = {}) => {
          let rows = store.predictions.filter(
            (p) =>
              (where.status === undefined || p.status === where.status) &&
              (where.matchId === undefined || p.matchId === where.matchId),
          );
          if (distinct?.includes("matchId")) {
            const seen = new Set<string>();
            rows = rows.filter((r) => (seen.has(r.matchId) ? false : (seen.add(r.matchId), true)));
          }
          return rows.map((r) => ({ ...r }));
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const row = store.predictions.find((p) => p.id === where.id);
          if (!row) throw new Error(`no prediction ${where.id}`);
          Object.assign(row, data);
          return { ...row };
        }),
      },
      match: {
        findUnique: vi.fn(async ({ where }: any) => {
          const m = store.matches.find((x) => x.id === where.id);
          return m ? { ...m } : null;
        }),
      },
      txlineEvent: {
        findMany: vi.fn(async ({ where = {} }: any = {}) =>
          store.events
            .filter((e) => where.matchId === undefined || e.matchId === where.matchId)
            .sort((a, b) => a.seq - b.seq)
            .map((e) => ({ ...e })),
        ),
      },
    },
  };
  return store;
}
