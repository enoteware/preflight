/**
 * Shared types for Preflight Status Extension
 */

export interface CheckData {
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
  latency?: number;
  helpUrl?: string;
  timestamp?: number;
  envFilePath?: string;
  envLineNumber?: number;
}

export interface StatusSummary {
  total: number;
  ok: number;
  warnings: number;
  errors: number;
}
