# Embed Guidelines

This doc describes how Pawkit handles embedded content (X, Reddit, TikTok, Instagram, Pinterest, Facebook) so the UX stays consistent.

## Shared Goals

- Library cards feel native to Pawkit (use our padding + rounding).
- Modals show the richest embed experience.
- Avoid heavy server-side scraping when the platform blocks it.
- Respect platform limits/privacy (private posts may not embed).

## X (Twitter)

Library:
- Custom render using tweet data (no in-card actions).
- Uses Pawkit card padding/rounded corners.

Modal:
- Official embed via widgets.js for full fidelity.

Fallback:
- If embed fails, show standard URL card.

## Reddit

Library:
- Custom render of title/body/media.
- Prefer thumbnails and gallery previews.

Modal:
- Custom render with video playback via HLS when available.

Fallback:
- If Reddit fetch fails, show "Reddit post unavailable" state.

## TikTok

Library:
- Preview with thumbnail + play glyph.
- Uses Pawkit card styling and card padding.

Modal:
- Iframe embed via `https://www.tiktok.com/embed/v2/{id}`.
- Scale to 9:16 container; keep UI visible.
- Dark-mode: no reliable official dark theme; use subtle side vignette only in dark mode.

Fallback:
- If oEmbed/id resolution fails, show "Unable to load TikTok."

## Instagram

Library:
- Uses card image (OG) with Instagram badge.
- Respects post aspect ratio where available (fallback 4:5).

Modal:
- Official Instagram embed via `embed.js`.
- Styled container to match Pawkit depth/borders.

Fallback:
- Private posts or blocked embeds show "Unable to load Instagram."

## Pinterest

Library:
- Uses card image (OG) with Pinterest badge.
- Respects image aspect ratio where available (fallback 2:3).

Modal:
- Image-first modal (pin image + metadata).
- Official Pinterest embed via `pinit.js`/iframe as fallback if no image.
- Styled container to match Pawkit depth/borders.

Fallback:
- If embed fails, show "Unable to load Pinterest."

## Facebook

Library:
- Uses card image (OG) with Facebook badge.
- Respects image aspect ratio where available (fallback 1:1).

Modal:
- Image-first modal (post image + metadata).
- Facebook post/video plugin iframe as fallback if no image.
- Styled container to match Pawkit depth/borders.

Fallback:
- Private posts or blocked embeds show "Unable to load Facebook."

## Prefetching

- Reddit: no hover prefetch; fetch on open and persist metadata.
- TikTok: prefetch oEmbed on hover (seed from persisted metadata first).
- Instagram: prefetch `embed.js` script on hover.
- Pinterest: prefetch `pinit.js` script on hover.

## Caching & Persistence

- Persist embed data to `card.metadata` when we successfully fetch it.
- Use persisted metadata to seed in-memory caches before hitting platform APIs.
- Prefer returning a soft fallback (HTTP 200 with minimal data) over 404s when a platform blocks or rate-limits us.
- When in doubt, persist at modal-load time (fewer requests than hover prefetch).

## Styling Notes

- Embed cards should not include extra in-card actions unless they are essential.
- Prefer Pawkit border/shadow treatments around embeds to maintain depth.
