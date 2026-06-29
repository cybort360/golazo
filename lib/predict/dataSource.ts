// Single import site for screens. Matches now come from the TxLINE-ingested DB
// (with a mock fallback when the DB is empty); the rest still delegates to the
// mock until those screens are wired.
import { dbBackedDataSource } from "@/lib/predict/httpDataSource";
import type { PredictDataSource } from "@/lib/predict/types";

export const dataSource: PredictDataSource = dbBackedDataSource;
