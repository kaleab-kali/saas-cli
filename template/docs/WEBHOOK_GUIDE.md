# Webhook Guide

Use webhooks for outbound events that customer systems need to react to.

## Endpoints

The base template includes a tenant-scoped outbound webhook module:

- `GET /api/v1/webhooks/endpoints`
- `POST /api/v1/webhooks/endpoints`
- `PATCH /api/v1/webhooks/endpoints/:id`
- `DELETE /api/v1/webhooks/endpoints/:id`
- `POST /api/v1/webhooks/endpoints/:id/test`

Endpoint secrets are encrypted with `CipherService` and returned only once when the endpoint is created. URLs must use HTTPS and must not include embedded credentials.

## Event Rules

- Event names use dotted names, for example `subscription.renewed`.
- Payloads include `id`, `type`, `occurredAt`, and `data`.
- Payloads must not include secrets.
- Delivery attempts are logged.
- Failed deliveries are stored as `WebhookDelivery` records so retry workers can pick them up.

## Signing

Sign webhook payloads with an HMAC secret per endpoint. Include headers:

- `X-Webhook-Id`
- `X-Webhook-Timestamp`
- `X-Webhook-Signature`

Consumers should reject stale timestamps and invalid signatures.

Signature base string:

```text
<timestamp>.<raw JSON request body>
```

The current signature format is `v1=<hex hmac-sha256>`.

## Minimum Events

Start with:

- `member.invited`
- `subscription.created`
- `subscription.updated`
- `invoice.paid`
- `file.uploaded`
- `report.generated`

Starter packs may register their own events.
