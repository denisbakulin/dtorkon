export type SiteStatusTone = 'success' | 'info' | 'warning';

export type SiteStatusItem = {
  label: string;
  value: string;
  tone?: SiteStatusTone;
};

export type SiteConfig = {
  projectName: string;
  headline: string;
  environment: string;
  statusItems: SiteStatusItem[];
  notes: string[];
};

