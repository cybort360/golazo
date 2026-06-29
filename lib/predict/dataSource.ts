// Single import site for screens. All data is real: matches from the TxLINE-
// ingested DB, leagues/leaderboard/profile/receipts from the user's actual
// picks. No mock fallback — empty data renders honest empty states.
import { dbBackedDataSource } from "@/lib/predict/httpDataSource";
import type { PredictDataSource } from "@/lib/predict/types";

export const dataSource: PredictDataSource = dbBackedDataSource;
