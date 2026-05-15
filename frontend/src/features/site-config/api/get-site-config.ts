import { httpClient } from '../../../shared/api/http-client';
import type { SiteConfig } from '../types/site-config';

export async function getSiteConfig() {
  const response = await httpClient.get<SiteConfig>('/site-config.json');

  return response.data;
}

