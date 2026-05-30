# AI Eval Test App

Endpoint-based AI evaluation cases live here.

```bash
pnpm --filter ai-eval test
```

When `AI_TEST_ENDPOINT` is not set, the runner uses a local deterministic response harness so the eval pipeline still executes in CI and scaffold smoke tests. Set `AI_TEST_ENDPOINT` to run the same cases against a real service.
