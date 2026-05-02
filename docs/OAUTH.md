# OAUTH.md

Add OAuth providers (Google, GitHub, Microsoft, etc.) to scaffolded projects.

Better Auth supports many providers natively. Skeleton is email-and-password only.

---

## Google

### 1. Create OAuth credentials
- Go to https://console.cloud.google.com/apis/credentials
- Create OAuth 2.0 Client ID (type: Web)
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google` (dev)
  - `https://app.example.com/api/auth/callback/google` (prod)

### 2. Add env vars
```bash
# apps/api/.env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 3. Wire into Better Auth
Edit `apps/api/src/modules/auth/auth.config.ts`:

```typescript
export const auth = betterAuth({
  // ...existing
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // ...
});
```

### 4. Web button
Edit `apps/web/src/routes/login.tsx`:

```typescript
import { authClient } from "#shared/lib/auth-client";

const handleGoogleSignIn = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/reports/dashboard/main",
  });
};

return <Button onClick={handleGoogleSignIn}>Sign in with Google</Button>;
```

---

## GitHub

Same pattern. Create OAuth app at https://github.com/settings/developers.

```typescript
socialProviders: {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },
}
```

---

## Microsoft / Azure AD

```typescript
microsoft: {
  clientId: process.env.MS_CLIENT_ID!,
  clientSecret: process.env.MS_CLIENT_SECRET!,
  tenantId: process.env.MS_TENANT_ID,    // optional, default common
}
```

---

## Multiple at once

```typescript
socialProviders: {
  google: { ... },
  github: { ... },
  microsoft: { ... },
}
```

---

## Auto-link existing accounts

Better Auth links by email by default. If a user signs up with email then later logs in via Google with the same email, accounts merge.

---

## See also

- Better Auth docs: https://www.better-auth.com/docs/concepts/social-providers
- All available providers: https://www.better-auth.com/docs/concepts/social-providers#available-providers
