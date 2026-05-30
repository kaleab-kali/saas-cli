# Performance Tests

This app is k6-first. k6 is a free external CLI and is not installed as a Node dependency.

Install k6 from the official docs:

```bash
https://grafana.com/docs/k6/latest/set-up/install-k6/
```

Run health load:

```bash
K6_TARGET=http://127.0.0.1:3000/health pnpm --filter performance test:k6
```

Run tenant API load:

```bash
K6_API_BASE_URL=http://127.0.0.1:3000 pnpm --filter performance test:k6:api
```

Useful knobs:

- `K6_VUS`, default `10` for health checks and `1` for tenant API checks
- `K6_DURATION`, default `30s`
- `K6_RAMP_UP`, `K6_STEADY`, and `K6_RAMP_DOWN`, optional tenant API stage durations
- `K6_P95_MS`, default `750`
- `K6_MAX_ERROR_RATE`, default `0.01`
- `K6_SESSION_COOKIE`, optional authenticated session cookie for tenant API flows

The tenant API script defaults to one virtual user so it validates authenticated flows without tripping the scaffold's default rate limit. Increase `K6_VUS` deliberately when you want to load-test throttling behavior.

Validate the k6 toolchain with a mock health server:

```bash
pnpm --filter performance test:k6:mock
```

If k6 is not installed, the command skips by default. Set `PERFORMANCE_STRICT_TOOLS=1` to fail when k6 is missing.
