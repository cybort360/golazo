// Single import site for screens. Swap `mockDataSource` for the real TxLINE/DB
// source here once it exists — nothing else changes.
import { mockDataSource } from "@/lib/predict/mockData";
import type { PredictDataSource } from "@/lib/predict/types";

export const dataSource: PredictDataSource = mockDataSource;
