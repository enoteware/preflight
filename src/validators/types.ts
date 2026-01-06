/**
 * Types for pre-flight check validators
 */

export type CheckStatus = 'ok' | 'error' | 'warning';

export interface CheckResult {
  status: CheckStatus;
  message: string;
  details?: string;
  latency?: number;
  helpUrl?: string;
}

export interface EnvCheck {
  key: string;
  required: boolean;
  validator?: (value: string) => boolean;
  format?: string;
  helpUrl?: string;
  description?: string;
}
