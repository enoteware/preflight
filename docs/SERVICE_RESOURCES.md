# Service Documentation Resources

Quick reference guide for official documentation, setup guides, API references, and CLI commands for services commonly used in development projects.

> **For AI Agents**: When setting up service checks or troubleshooting API connectivity, use this guide to quickly find official documentation, environment variables, and setup instructions.

## Table of Contents

- [Authentication & User Management](#authentication--user-management)
- [Databases & Storage](#databases--storage)
- [Email Services](#email-services)
- [Payment Processing](#payment-processing)
- [Version Control & CI/CD](#version-control--cicd)
- [Caching & Queue Services](#caching--queue-services)
- [Media & Content APIs](#media--content-apis)
- [Marketing Automation](#marketing-automation)
- [AI & Machine Learning](#ai--machine-learning)
- [CLI Tools & Runtimes](#cli-tools--runtimes)
- [Development Tools](#development-tools)

---

## Authentication & User Management

### Clerk
*Complete authentication and user management platform*

- **Documentation**: https://clerk.com/docs
- **Setup Guide**: https://clerk.com/docs/quickstarts/nextjs
- **API Reference**: https://clerk.com/docs/reference/backend-api
- **CLI Documentation**: https://clerk.com/docs/cli
- **Environment Variables**: 
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
- **Authentication**: API keys (publishable + secret)
- **Quick Test**:
  ```bash
  curl https://api.clerk.com/v1/users \
    -H "Authorization: Bearer $CLERK_SECRET_KEY"
  ```

### Stack Auth
*Authentication library for Next.js*

- **Documentation**: https://stack-auth.com/docs
- **Setup Guide**: https://stack-auth.com/docs/getting-started
- **API Reference**: https://stack-auth.com/docs/api-reference
- **Environment Variables**: 
  - `STACK_AUTH_URL`
  - `STACK_AUTH_SECRET`
- **Authentication**: Secret key
- **Quick Test**: Check Stack Auth dashboard or API endpoint

### Supabase Auth
*Authentication service from Supabase*

- **Documentation**: https://supabase.com/docs/guides/auth
- **Setup Guide**: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- **API Reference**: https://supabase.com/docs/reference/javascript/auth-api
- **Environment Variables**: 
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- **Authentication**: Anon key (public) or service role key (private)
- **Quick Test**:
  ```bash
  curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
    -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ```

### Auth0
*Identity and access management platform*

- **Documentation**: https://auth0.com/docs
- **Setup Guide**: https://auth0.com/docs/quickstart/webapp/nextjs
- **API Reference**: https://auth0.com/docs/api
- **Management API**: https://auth0.com/docs/api/management/v2
- **Environment Variables**: 
  - `AUTH0_SECRET`
  - `AUTH0_BASE_URL`
  - `AUTH0_ISSUER_BASE_URL`
  - `AUTH0_CLIENT_ID`
  - `AUTH0_CLIENT_SECRET`
- **Authentication**: Client credentials or management API tokens
- **Quick Test**:
  ```bash
  curl "https://$AUTH0_DOMAIN/api/v2/users" \
    -H "Authorization: Bearer $AUTH0_MANAGEMENT_TOKEN"
  ```

---

## Databases & Storage

### Neon
*Serverless Postgres database*

- **Documentation**: https://neon.tech/docs
- **Setup Guide**: https://neon.tech/docs/get-started-with-neon
- **API Reference**: https://neon.tech/docs/api-reference
- **CLI Documentation**: https://neon.tech/docs/reference/neonctl
- **Environment Variables**: 
  - `DATABASE_URL` (PostgreSQL connection string)
  - `NEON_API_KEY` (optional, for API access)
- **Authentication**: Connection string or API key
- **Quick Test**:
  ```bash
  # Test connection
  psql "$DATABASE_URL" -c "SELECT version();"
  
  # Or using Neon API
  curl https://console.neon.tech/api/v2/projects \
    -H "Authorization: Bearer $NEON_API_KEY"
  ```

### Supabase
*Open source Firebase alternative with Postgres*

- **Documentation**: https://supabase.com/docs
- **Setup Guide**: https://supabase.com/docs/guides/getting-started
- **API Reference**: https://supabase.com/docs/reference/javascript/introduction
- **CLI Documentation**: https://supabase.com/docs/reference/cli
- **Environment Variables**: 
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- **Authentication**: Anon key (public) or service role key (private)
- **Quick Test**:
  ```bash
  curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
    -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ```

### PlanetScale
*Serverless MySQL platform*

- **Documentation**: https://planetscale.com/docs
- **Setup Guide**: https://planetscale.com/docs/tutorials/planetscale-quick-start-guide
- **API Reference**: https://api-docs.planetscale.com
- **CLI Documentation**: https://planetscale.com/docs/reference/planetscale-cli
- **Environment Variables**: 
  - `DATABASE_URL` (MySQL connection string)
  - `PLANETSCALE_SERVICE_TOKEN_ID`
  - `PLANETSCALE_SERVICE_TOKEN`
- **Authentication**: Connection string or service tokens
- **Quick Test**:
  ```bash
  # Using CLI
  pscale connect [database] [branch]
  
  # Or test connection string
  mysql "$DATABASE_URL"
  ```

### MongoDB Atlas
*Cloud MongoDB database service*

- **Documentation**: https://www.mongodb.com/docs/atlas
- **Setup Guide**: https://www.mongodb.com/docs/atlas/getting-started
- **API Reference**: https://www.mongodb.com/docs/atlas/api
- **CLI Documentation**: https://www.mongodb.com/docs/mongocli
- **Environment Variables**: 
  - `MONGODB_URI` (connection string)
  - `MONGODB_ATLAS_API_PUBLIC_KEY` (optional)
  - `MONGODB_ATLAS_API_PRIVATE_KEY` (optional)
- **Authentication**: Connection string or API keys
- **Quick Test**:
  ```bash
  # Using MongoDB CLI
  mongosh "$MONGODB_URI"
  ```

### Prisma
*Next-generation ORM for Node.js and TypeScript*

- **Documentation**: https://www.prisma.io/docs
- **Setup Guide**: https://www.prisma.io/docs/getting-started
- **API Reference**: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference
- **CLI Documentation**: https://www.prisma.io/docs/reference/api-reference/command-reference
- **Environment Variables**: 
  - `DATABASE_URL` (connection string for your database)
- **Authentication**: Via database connection string
- **Common CLI Commands**:
  ```bash
  # Initialize Prisma
  npx prisma init
  
  # Generate Prisma Client
  npx prisma generate
  
  # Run migrations
  npx prisma migrate dev
  
  # Open Prisma Studio
  npx prisma studio
  ```

---

## Email Services

### Resend
*Modern email API for developers*

- **Documentation**: https://resend.com/docs
- **Setup Guide**: https://resend.com/docs/send-with-nodejs
- **API Reference**: https://resend.com/docs/api-reference
- **Environment Variables**: `RESEND_API_KEY`
- **Authentication**: Bearer token (API keys start with `re_`)
- **Quick Test**:
  ```bash
  curl -X GET https://api.resend.com/emails \
    -H "Authorization: Bearer $RESEND_API_KEY"
  ```

### SendGrid
*Email delivery service (Twilio)*

- **Documentation**: https://docs.sendgrid.com
- **Setup Guide**: https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs
- **API Reference**: https://docs.sendgrid.com/api-reference
- **CLI Documentation**: https://github.com/sendgrid/sendgrid-nodejs
- **Environment Variables**: `SENDGRID_API_KEY`
- **Authentication**: Bearer token
- **Quick Test**:
  ```bash
  curl -X GET https://api.sendgrid.com/v3/user/profile \
    -H "Authorization: Bearer $SENDGRID_API_KEY"
  ```

---

## Payment Processing

### Stripe
*Payment processing platform*

- **Documentation**: https://stripe.com/docs
- **Setup Guide**: https://stripe.com/docs/development/quickstart
- **API Reference**: https://stripe.com/docs/api
- **CLI Documentation**: https://stripe.com/docs/stripe-cli
- **Environment Variables**: 
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET` (for webhooks)
- **Authentication**: Secret key (server) or publishable key (client)
- **Common CLI Commands**:
  ```bash
  # Login to Stripe CLI
  stripe login
  
  # Listen for webhooks
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  
  # Trigger test events
  stripe trigger payment_intent.succeeded
  ```
- **Quick Test**:
  ```bash
  curl https://api.stripe.com/v1/charges \
    -u "$STRIPE_SECRET_KEY:"
  ```

---

## Version Control & CI/CD

### GitHub API
*GitHub's REST and GraphQL APIs*

- **Documentation**: https://docs.github.com/en/rest
- **Setup Guide**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
- **API Reference**: https://docs.github.com/en/rest/overview/endpoints-available-for-github-apps
- **GraphQL API**: https://docs.github.com/en/graphql
- **Environment Variables**: 
  - `GITHUB_TOKEN` (personal access token)
  - `GITHUB_APP_ID` (for GitHub Apps)
  - `GITHUB_APP_PRIVATE_KEY` (for GitHub Apps)
- **Authentication**: Personal access token (classic or fine-grained) or GitHub App
- **Token Types**:
  - Classic tokens: `ghp_...`
  - Fine-grained tokens: `github_pat_...`
- **Quick Test**:
  ```bash
  curl -H "Authorization: Bearer $GITHUB_TOKEN" \
    https://api.github.com/user
  ```

### Vercel API
*Vercel platform API*

- **Documentation**: https://vercel.com/docs/rest-api
- **Setup Guide**: https://vercel.com/docs/rest-api/authentication
- **API Reference**: https://vercel.com/docs/rest-api
- **CLI Documentation**: https://vercel.com/docs/cli
- **Environment Variables**: 
  - `VERCEL_ACCESS_TOKEN` or `VERCEL_TOKEN`
  - `VERCEL_ORG_ID` (optional)
  - `VERCEL_PROJECT_ID` (optional)
- **Authentication**: Access token
- **Common CLI Commands**:
  ```bash
  # Login to Vercel
  vercel login
  
  # Link project
  vercel link
  
  # Deploy
  vercel
  
  # Deploy to production
  vercel --prod
  ```
- **Quick Test**:
  ```bash
  curl https://api.vercel.com/v2/user \
    -H "Authorization: Bearer $VERCEL_ACCESS_TOKEN"
  ```

---

## Caching & Queue Services

### Redis / Upstash
*In-memory data store and message broker*

- **Documentation**: https://upstash.com/docs
- **Setup Guide**: https://upstash.com/docs/redis/overall/getstarted
- **API Reference**: https://upstash.com/docs/redis/features/restapi
- **Environment Variables**: 
  - `REDIS_URL` (Upstash REST API URL)
  - `REDIS_TOKEN` (Upstash REST API token)
- **Authentication**: Bearer token
- **Quick Test**:
  ```bash
  curl "$REDIS_URL/ping" \
    -H "Authorization: Bearer $REDIS_TOKEN"
  ```

---

## Media & Content APIs

### YouTube API
*YouTube Data API v3*

- **Documentation**: https://developers.google.com/youtube/v3
- **Setup Guide**: https://developers.google.com/youtube/v3/getting-started
- **API Reference**: https://developers.google.com/youtube/v3/docs
- **Environment Variables**: 
  - `YOUTUBE_API_KEY`
  - `NEXT_PUBLIC_YOUTUBE_CHANNEL_ID` (optional)
- **Authentication**: API key (query parameter)
- **Quick Test**:
  ```bash
  curl "https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&key=$YOUTUBE_API_KEY"
  ```

### Cloudinary
*Cloud-based image and video management*

- **Documentation**: https://cloudinary.com/documentation
- **Setup Guide**: https://cloudinary.com/documentation/node_integration
- **API Reference**: https://cloudinary.com/documentation/admin_api
- **Environment Variables**: 
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- **Authentication**: API key + secret
- **Quick Test**:
  ```bash
  curl "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/resources/image" \
    -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET"
  ```

---

## Marketing Automation

### Klaviyo
*Email marketing and automation platform*

- **Documentation**: https://developers.klaviyo.com
- **Setup Guide**: https://developers.klaviyo.com/en/docs/developer-guide
- **API Reference**: https://developers.klaviyo.com/en/reference/api-overview
- **Environment Variables**: `KLAVIYO_API_KEY`
- **Authentication**: API key (header: `Klaviyo-API-Key`)
- **Quick Test**:
  ```bash
  curl https://a.klaviyo.com/api/accounts/ \
    -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
    -H "revision: 2024-10-15"
  ```

---

## AI & Machine Learning

### OpenAI
*AI platform and API*

- **Documentation**: https://platform.openai.com/docs
- **Setup Guide**: https://platform.openai.com/docs/quickstart
- **API Reference**: https://platform.openai.com/docs/api-reference
- **Environment Variables**: `OPENAI_API_KEY`
- **Authentication**: Bearer token (API keys start with `sk-`)
- **Quick Test**:
  ```bash
  curl https://api.openai.com/v1/models \
    -H "Authorization: Bearer $OPENAI_API_KEY"
  ```

### Anthropic (Claude)
*AI assistant API*

- **Documentation**: https://docs.anthropic.com
- **Setup Guide**: https://docs.anthropic.com/claude/docs/getting-started-with-the-api
- **API Reference**: https://docs.anthropic.com/claude/reference
- **Environment Variables**: `ANTHROPIC_API_KEY`
- **Authentication**: Bearer token (API keys start with `sk-ant-`)
- **Quick Test**:
  ```bash
  curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "Content-Type: application/json"
  ```

---

## CLI Tools & Runtimes

### Node.js
*JavaScript runtime*

- **Documentation**: https://nodejs.org/docs
- **Download**: https://nodejs.org
- **CLI Commands**:
  ```bash
  # Check version
  node --version
  
  # Run script
  node script.js
  
  # REPL
  node
  ```

### npm
*Node package manager*

- **Documentation**: https://docs.npmjs.com
- **CLI Commands**:
  ```bash
  # Install dependencies
  npm install
  
  # Install package
  npm install <package>
  
  # Run script
  npm run <script>
  
  # Check version
  npm --version
  ```

### pnpm
*Fast, disk space efficient package manager*

- **Documentation**: https://pnpm.io/docs
- **Installation**: `npm install -g pnpm`
- **CLI Commands**:
  ```bash
  # Install dependencies
  pnpm install
  
  # Install package
  pnpm add <package>
  
  # Run script
  pnpm run <script>
  ```

### bun
*Fast JavaScript runtime, bundler, and package manager*

- **Documentation**: https://bun.sh/docs
- **Installation**: `curl -fsSL https://bun.sh/install | bash`
- **CLI Commands**:
  ```bash
  # Install dependencies
  bun install
  
  # Run script
  bun run <script>
  
  # Run file
  bun <file.js>
  ```

### Git
*Version control system*

- **Documentation**: https://git-scm.com/doc
- **CLI Commands**:
  ```bash
  # Check version
  git --version
  
  # Clone repository
  git clone <url>
  
  # Check status
  git status
  
  # Commit changes
  git add .
  git commit -m "message"
  
  # Push changes
  git push
  ```

---

## Development Tools

### TypeScript
*Typed superset of JavaScript*

- **Documentation**: https://www.typescriptlang.org/docs
- **Setup Guide**: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html
- **CLI Commands**:
  ```bash
  # Compile TypeScript
  tsc
  
  # Watch mode
  tsc --watch
  
  # Check types
  tsc --noEmit
  ```

### ESLint
*JavaScript and TypeScript linter*

- **Documentation**: https://eslint.org/docs/latest
- **Setup Guide**: https://eslint.org/docs/latest/use/getting-started
- **CLI Commands**:
  ```bash
  # Run linter
  npx eslint .
  
  # Fix issues
  npx eslint . --fix
  
  # Check specific file
  npx eslint file.ts
  ```

### Prettier
*Code formatter*

- **Documentation**: https://prettier.io/docs/en
- **Setup Guide**: https://prettier.io/docs/en/install.html
- **CLI Commands**:
  ```bash
  # Format files
  npx prettier --write .
  
  # Check formatting
  npx prettier --check .
  
  # Format specific file
  npx prettier --write file.ts
  ```

---

## Quick Reference: Environment Variables

Common environment variable patterns:

| Service Type | Variable Pattern | Example |
|-------------|------------------|---------|
| API Keys | `SERVICE_API_KEY` | `RESEND_API_KEY`, `OPENAI_API_KEY` |
| Database URLs | `DATABASE_URL` | `postgresql://...`, `mysql://...` |
| Public Keys | `NEXT_PUBLIC_*` | `NEXT_PUBLIC_SUPABASE_URL` |
| Secret Keys | `*_SECRET` or `*_SECRET_KEY` | `CLERK_SECRET_KEY`, `AUTH0_SECRET` |
| Tokens | `*_TOKEN` | `GITHUB_TOKEN`, `VERCEL_TOKEN` |
| URLs | `*_URL` | `REDIS_URL`, `STACK_AUTH_URL` |

---

## Contributing

To add a new service to this reference:

1. Add the service to the appropriate category
2. Include all relevant documentation links
3. List required environment variables
4. Provide a quick test command
5. Include CLI commands if applicable

---

## Related Documentation

- [Common Service Check Examples](COMMON_SERVICES.md) - Code examples for implementing service checks
- [Agent Instructions](AGENT_INSTRUCTIONS.md) - Troubleshooting guide for AI agents
- [Extension Configuration](EXTENSION_CONFIG.md) - VS Code extension settings
