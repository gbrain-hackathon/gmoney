// TODO: pull SEC filings. EDGAR is free; needs a User-Agent header.
// Reference: https://www.sec.gov/edgar/sec-api-documentation
export interface Filing {
  ticker: string;
  form: '10-K' | '10-Q' | '8-K' | 'S-1' | string;
  filedAt: string;
  url: string;
}

export async function getRecentFilings(
  _ticker: string,
  _limit = 10,
): Promise<Filing[]> {
  throw new Error('getRecentFilings not implemented');
}
