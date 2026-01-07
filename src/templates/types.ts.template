export type CheckStatus = 'ok' | 'warning' | 'error';

export interface CheckResult {
  status: CheckStatus;
  message: string;
  details?: string;
  helpUrl?: string;
  latency?: number;
  timestamp?: number;
}

export interface CheckSummary {
  category: string;
  results: CheckResult[];
}
