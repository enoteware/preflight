/**
 * Environment variable validation
 */

import { CheckResult, EnvCheck } from './types';

/**
 * Validate environment variables based on ENV_MATRIX.md requirements
 */
export function validateEnvVars(): CheckResult[] {
  const results: CheckResult[] = [];

  const envChecks: EnvCheck[] = [
    // Stack Auth (Required)
    {
      key: 'NEXT_PUBLIC_STACK_PROJECT_ID',
      required: true,
      validator: (v) => v.startsWith('proj_') || v.length > 10,
      format: 'proj_...',
      helpUrl: 'https://app.stack-auth.com',
      description: 'Stack Auth project ID',
    },
    {
      key: 'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
      required: true,
      validator: (v) => v.startsWith('pk_') || v.length > 20,
      format: 'pk_...',
      helpUrl: 'https://app.stack-auth.com',
      description: 'Stack Auth publishable key',
    },
    {
      key: 'STACK_SECRET_SERVER_KEY',
      required: true,
      validator: (v) => v.startsWith('sk_') || v.length > 20,
      format: 'sk_...',
      helpUrl: 'https://app.stack-auth.com',
      description: 'Stack Auth secret key',
    },
    // Database (Required)
    {
      key: 'DATABASE_URL',
      required: true,
      validator: (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
      format: 'postgresql://user:pass@host/db?sslmode=require',
      helpUrl: 'https://console.neon.tech',
      description: 'Neon Postgres connection string',
    },
    // Email (Required)
    {
      key: 'RESEND_API_KEY',
      required: true,
      validator: (v) => v.startsWith('re_'),
      format: 're_...',
      helpUrl: 'https://resend.com/api-keys',
      description: 'Resend API key',
    },
    {
      key: 'FROM_EMAIL',
      required: true,
      validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      format: 'email@domain.com',
      helpUrl: 'https://resend.com',
      description: 'Default sender email',
    },
    // PayPal (Required)
    {
      key: 'PAYPAL_CLIENT_ID',
      required: true,
      validator: () => true, // Any non-empty string
      format: 'Client ID from PayPal',
      helpUrl: 'https://developer.paypal.com/dashboard/',
      description: 'PayPal client ID',
    },
    {
      key: 'PAYPAL_CLIENT_SECRET',
      required: true,
      validator: () => true,
      format: 'Client secret from PayPal',
      helpUrl: 'https://developer.paypal.com/dashboard/',
      description: 'PayPal client secret',
    },
    {
      key: 'PAYPAL_MODE',
      required: true,
      validator: (v) => v === 'sandbox' || v === 'live',
      format: 'sandbox | live',
      helpUrl: 'https://developer.paypal.com',
      description: 'PayPal mode',
    },
    {
      key: 'NEXT_PUBLIC_APP_URL',
      required: true,
      validator: (v) => v.startsWith('http://') || v.startsWith('https://'),
      format: 'https://your-app.vercel.app',
      helpUrl: 'https://vercel.com',
      description: 'Application base URL',
    },
    // Client Portal (Required)
    {
      key: 'CLIENT_PORTAL_JWT_SECRET',
      required: true,
      validator: (v) => v.length >= 32 && v !== 'fallback-secret-change-in-production',
      format: 'Random 32+ character string',
      helpUrl: 'Generate with: openssl rand -base64 32',
      description: 'JWT secret for client portal',
    },
    {
      key: 'CLIENT_PORTAL_SESSION_EXPIRY',
      required: true,
      validator: (v) => /^\d+[dhm]$/.test(v),
      format: '7d, 24h, 30m',
      description: 'Session expiry time',
    },
    {
      key: 'CLIENT_PORTAL_ENABLED',
      required: true,
      validator: (v) => v === 'true' || v === 'false',
      format: 'true | false',
      description: 'Enable client portal',
    },
    // OpenAI (Required)
    {
      key: 'OPENAI_API_KEY',
      required: true,
      validator: (v) => v.startsWith('sk-'),
      format: 'sk-...',
      helpUrl: 'https://platform.openai.com/api-keys',
      description: 'OpenAI API key',
    },
    // Vercel Blob (Required)
    {
      key: 'BLOB_READ_WRITE_TOKEN',
      required: true,
      validator: (v) => v.startsWith('vercel_blob_rw_'),
      format: 'vercel_blob_rw_...',
      helpUrl: 'https://vercel.com/dashboard/stores',
      description: 'Vercel Blob storage token',
    },
    // Session (Required)
    {
      key: 'SESSION_SECRET',
      required: true,
      validator: (v) => v.length >= 32,
      format: 'Random 32+ character string',
      helpUrl: 'Generate with: openssl rand -base64 32',
      description: 'Session encryption secret',
    },
    // Optional: Vercel Tokens
    {
      key: 'VERCEL_TOKEN',
      required: false,
      validator: (v) => v.length > 20,
      format: 'Token from Vercel account settings',
      helpUrl: 'https://vercel.com/account/tokens',
      description: 'Vercel CLI token (optional, avoids vercel login)',
    },
    {
      key: 'VERCEL_ACCESS_TOKEN',
      required: false,
      validator: (v) => v.length > 20,
      format: 'API Access Token from Vercel account settings',
      helpUrl: 'https://vercel.com/account/tokens',
      description: 'Vercel API Access Token (optional, for API calls)',
    },
    // Optional: Google OAuth
    {
      key: 'GOOGLE_CLIENT_ID',
      required: false,
      validator: (v) => v.includes('.apps.googleusercontent.com'),
      format: '*.apps.googleusercontent.com',
      helpUrl: 'https://console.cloud.google.com/apis/credentials',
      description: 'Google OAuth client ID (optional)',
    },
    {
      key: 'GOOGLE_CLIENT_SECRET',
      required: false,
      validator: () => true,
      format: 'OAuth client secret',
      helpUrl: 'https://console.cloud.google.com/apis/credentials',
      description: 'Google OAuth secret (optional)',
    },
    // Optional: Test accounts
    {
      key: 'TEST_ADMIN_EMAIL',
      required: false,
      validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      format: 'email@domain.com',
      description: 'Test admin email (dev only)',
    },
    {
      key: 'TEST_ADMIN_PASSWORD',
      required: false,
      validator: () => true,
      format: 'Password string',
      description: 'Test admin password (dev only)',
    },
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
