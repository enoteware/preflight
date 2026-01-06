/**
 * Environment variable validation
 * 
 * This is a TEMPLATE/EXAMPLE file showing common patterns.
 * Generated projects will have their own env.ts with user-specific variables.
 */

import { CheckResult, EnvCheck } from './types';

/**
 * Example: Validate environment variables
 * 
 * This function demonstrates common patterns for env var validation.
 * Generated projects will have their own implementation based on user needs.
 */
export function validateEnvVars(): CheckResult[] {
  const results: CheckResult[] = [];

  // Example: Common environment variables template
  // Users should customize this list for their project
  const envChecks: EnvCheck[] = [
    // Example: Node environment (common for all projects)
    {
      key: 'NODE_ENV',
      required: false,
      validator: (v) => ['development', 'production', 'test'].includes(v),
      format: 'development | production | test',
      description: 'Node environment',
    },
    // Example: Database URL pattern
    // {
    //   key: 'DATABASE_URL',
    //   required: true,
    //   validator: (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
    //   format: 'postgresql://user:pass@host/db',
    //   helpUrl: 'https://example.com/docs/database',
    //   description: 'Database connection string',
    // },
    // Example: API key pattern
    // {
    //   key: 'API_KEY',
    //   required: true,
    //   validator: (v) => v.startsWith('sk_') || v.length > 20,
    //   format: 'sk_...',
    //   helpUrl: 'https://example.com/api-keys',
    //   description: 'API key for external service',
    // },
  ];

  for (const check of envChecks) {
    const value = process.env[check.key];
    const result: CheckResult = {
      status: 'ok',
      message: check.key,
      details: check.description,
      helpUrl: check.helpUrl,
    };

    if (!value || value.trim() === '') {
      if (check.required) {
        result.status = 'error';
        result.message = `${check.key} (missing - required)`;
      } else {
        result.status = 'warning';
        result.message = `${check.key} (optional, not set)`;
      }
    } else if (check.validator && !check.validator(value)) {
      result.status = check.required ? 'error' : 'warning';
      result.message = `${check.key} (invalid format)`;
      result.details = `Expected format: ${check.format || 'see documentation'}`;
    }

    results.push(result);
  }

  return results;
}
