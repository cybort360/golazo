export interface PricePoint {
  timestamp: number;
  price: number;
}

export function emptyHistory(): PricePoint[] {
  return [];
}
