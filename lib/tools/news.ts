// TODO: search news headlines. Options: Bing News API, NewsAPI, Tavily, or
// hand-roll RSS aggregation for hackathon scope.
export interface NewsItem {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  summary: string;
}

export async function searchNews(
  _query: string,
  _opts?: { from?: string; to?: string; limit?: number },
): Promise<NewsItem[]> {
  throw new Error('searchNews not implemented');
}
