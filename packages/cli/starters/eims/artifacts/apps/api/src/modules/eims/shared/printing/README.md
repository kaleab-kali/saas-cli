# EIMS Printing

Compact thermal and A4 print renderers live here. Official QR rendering must
only use EIMS accepted `signedQR` responses.

`EimsPrintProofService` renders compact thermal and A4 PDF proof buffers from
accepted EIMS responses only. It refuses official print proof when an invoice is
offline, retryable, missing an IRN, or when the signed QR payload does not match
the accepted IRN.
