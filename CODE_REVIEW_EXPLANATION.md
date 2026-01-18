# Code Review Clarification

Plain-English summary of what the findings mean and how urgent they are.

## Fix Soon (Security / Abuse)

- SSRF checks are too shallow. Your server fetches user-provided URLs, but the current
  hostname checks can be bypassed via redirects, DNS tricks, or weird IP formats.
  This can expose internal services or cloud metadata if these endpoints are public.
- Extension auth allowlist fails open. If `TRUSTED_EXTENSION_IDS` isn't set, any
  extension origin can request an access token for a logged-in user. In production,
  this is a wider attack surface than intended.

## Should Fix (Data Integrity)

- Version conflict detection for cards is not atomic. Two devices updating at the
  same time can still overwrite each other even if you try to detect conflicts.
  Result: lost updates and user-visible data bugs.

## Nice-to-Have (Correctness)

- JSON fields can't be cleared. `null` values are coalesced away, so clients can't
  explicitly clear metadata/recurrence/source fields even if the schema allows it.

## Nice-to-Have (Performance / Abuse)

- Large HTML fetches aren't bounded. Metadata/article extraction downloads full pages
  without size caps, which can hurt performance or costs if large pages are fetched.

## Questions / Assumptions

- Should clients be able to clear JSON fields by sending `null`?
  If yes, the current behavior is a bug.
- Is `TRUSTED_EXTENSION_IDS` always set in production?
  If not, the extension auth endpoint should probably fail closed in production.
