// TODO: fetch OHLCV history. Suggested sources: Polygon (paid free tier),
// yfinance via a small Python sidecar, or AlphaVantage.
export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getPriceHistory(
  _ticker: string,
  _from: string,
  _to: string,
): Promise<PriceBar[]> {
  throw new Error('getPriceHistory not implemented');
}
