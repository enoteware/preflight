import { CheckResult } from './types';

interface EnvVarConfig {
  key: string;
  required: boolean;
  validator?: (value: string) => boolean;
  format?: string;
  helpUrl?: string;
  description: string;
}

// Common environment variables - customize for your project
const envVarConfigs: EnvVarConfig[] = [
  {
    key: 'NODE_ENV',
    required: false,
    description: 'Node environment (development/production)',
  },
];

export function validateEnvVars(): CheckResult[] {
  const results: CheckResult[] = [];
  
  for (const config of envVarConfigs) {
    const value = process.env[config.key];
    
    if (!value) {
      results.push({
        status: config.required ? 'error' : 'warning',
        message: `${config.key}: NOT SET`,
        details: config.description,
        helpUrl: config.helpUrl,
      });
      continue;
    }
    
    if (config.validator && !config.validator(value)) {
      results.push({
        status: 'error',
        message: `${config.key}: INVALID`,
        details: `Expected format: ${config.format}`,
        helpUrl: config.helpUrl,
      });
      continue;
    }
    
    results.push({
      status: 'ok',
      message: `${config.key}: SET`,
    });
  }
  
  return results;
}
