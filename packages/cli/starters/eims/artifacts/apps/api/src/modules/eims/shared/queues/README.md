# EIMS Queues

Per-source submission queues and reconciliation workers live here. Do not hold
database locks across external EIMS calls.

The starter includes `EimsSubmissionQueueService` as the first production
boundary for invoice submission ordering:

- one serial lane per organization/source system
- local counter reservation metadata on each outbound EIMS call
- previous-IRN chaining from the last accepted response only
- retryable/unknown outcomes kept out of the accepted counter chain

Replace the in-process coordinator with BullMQ-backed workers when enabling
multi-node production deployment; keep the same payload metadata contract.
