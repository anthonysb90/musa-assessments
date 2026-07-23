# Asset Licenses & Sources

Every sourced or generated asset used in reports, with source and license. Nothing is
hotlinked at render time; all assets are (to be) downloaded, optimized, and committed
under `public/reports/` before use.

## Fonts (LOCKED faces)

| Asset | Source | License | Status |
|---|---|---|---|
| Fraunces (400/500/600) | Google Fonts (SIL OFL 1.1) | OFL — self-hosting permitted | **TODO: self-host** under `public/fonts/`, remove CDN link |
| Inter (400/500/600/700) | Google Fonts (SIL OFL 1.1) | OFL — self-hosting permitted | **TODO: self-host** |

## Higgsfield-generated (cap: 40 assets total for the whole job; 4 used)

| Asset | Report | Prompt intent | License | Status |
|---|---|---|---|---|
| Temperament emblem — Pillars (SJ) | Kingdom Design | engraved medallion, columns | Higgsfield-generated (user's account) | Live (CDN URL) — **TODO: download + commit to `public/reports/kdp/`**, normalize |
| Temperament emblem — Responders (SP) | Kingdom Design | flame + hand | same | same |
| Temperament emblem — Encouragers (NF) | Kingdom Design | heart + dove | same | same |
| Temperament emblem — Architects (NT) | Kingdom Design | compass + blueprint | same | same |

Note: the KDP emblems currently load from the Higgsfield CDN (`d8j0ntlcm91z4.cloudfront.net`).
The report renderer hides them gracefully on load failure, but per the no-hotlink rule they
must be downloaded, optimized to `webp`/`png`, committed to `public/reports/kdp/`, and the
URLs in `app/lib/kingdom.js` repointed to the local paths. Logged as a build task.

## Photographic / cover textures (Unsplash / Pexels)

| Asset | Report | Source | License | Status |
|---|---|---|---|---|
| Cover photo | Big Five | Higgsfield (generated, prior) | user's account | Live CDN — **TODO: localize** |
| Cover photo | Kingdom Design | Unsplash `photo-1499750310107-...` | Unsplash License (free, no attribution required) | Live CDN — **TODO: localize + desaturate** |

Per the brief, any photographic texture must be desaturated / opacity-reduced / overlaid
so it reads as an intentional surface, never a photograph of a person or a stock scene.
No people, no faces, no stock-ministry imagery is used or permitted.

## Textures to generate (per Table B, batched, within the 40-cap)

Parchment grain (Gifts), horizontal-rule field (Fivefold), soft grid wash (DISC/Leadership),
soil strata (Rooted), concentric rings (Spiritual Growth), point-lattice (Enneagram),
dot-grid (Big Five), blueprint fold (Planter), stone-column motif (Pastor), interlocking-rings
(Called Together), grid-cell field (Church Health), ascending steps (Church Growth). Most
are pure SVG line patterns (no generation needed); only richer surfaces use Higgsfield,
counting against the cap. Each will be logged here as produced.
