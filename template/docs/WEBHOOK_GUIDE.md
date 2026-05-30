# Webhook Guide

Use webhooks for outbound events that customer systems need to react to.

## Event Rules

- Event names use dotted names, for example `subscription.renewed`.
- Payloads include `id`, `type`, `createdAt`, and `organizationId`.
- Payloads must not include secrets.
- Delivery attempts are logged.
- Failed deliveries retry with backoff.

## Signing

Sign webhook payloads with an HMAC secret per endpoint. Include headers:

- `X-Webhook-Id`
- `X-Webhook-Timestamp`
- `X-Webhook-Signature`

Consumers should reject stale timestamps and invalid signatures.

## Minimum Events

Start with:

- `member.invited`
- `subscription.created`
- `subscription.updated`
- `invoice.paid`
- `file.uploaded`
- `report.generated`

Starter packs may register their own events.
