# EIMS Crypto

Cryptographic helpers for hashing, signature normalization, envelope
encryption, and certificate verification.

Credential testing is SDK-bound: encrypted tenant secrets are decrypted only in
memory, sent through `EIMS_EXTERNAL_CLIENT.validateCredential`, and the durable
row stores only the validation status and redacted metadata.
