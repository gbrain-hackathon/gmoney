// TODO: pull macro indicators. FRED (St. Louis Fed) is free with an API key.
// Reference: https://fred.stlouisfed.org/docs/api/fred/
export interface MacroSeries {
  seriesId: string;
  observations: { date: string; value: number }[];
}

export async function getMacroSeries(
  _seriesId: string,
  _from?: string,
  _to?: string,
): Promise<MacroSeries> {
  throw new Error('getMacroSeries not implemented');
}
