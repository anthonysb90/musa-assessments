# REVERT — Report Design Overhaul

If anything about the report redesign looks wrong and you want to undo it, read this
top to bottom. It is written to be followed first thing in the morning, half awake.

## What changed and where the safety net is is

The reports are React renderers, not standalone templates. Everything visual for a
report lives in:

- `app/results/[token]/page.js` — every report renderer + the print CSS + the PDF path
- `app/components/SampleReport.js` — the small demo versions shown on assessment pages
- `app/lib/content.js`, `app/lib/bigfive.js`, `app/lib/kingdom.js`, `app/lib/gifts.js` — report content/data

**Unmodified copies of all of the above, from before the overhaul, are in
`_backup/reports-original/`.** That folder is the ground truth for "how it was." It is
never deleted or modified by the overhaul work.

## Fastest full revert (restore the report code exactly as it was)

From the repo root, on your Mac:

```
cp "_backup/reports-original/app/results/[token]/page.js" "app/results/[token]/page.js"
cp _backup/reports-original/app/components/SampleReport.js  app/components/SampleReport.js
cp _backup/reports-original/app/lib/content.js  app/lib/content.js
cp _backup/reports-original/app/lib/bigfive.js  app/lib/bigfive.js
cp _backup/reports-original/app/lib/kingdom.js  app/lib/kingdom.js
cp _backup/reports-original/app/lib/gifts.js    app/lib/gifts.js
cp _backup/reports-original/app/lib/headline.js app/lib/headline.js
```

Then commit in GitHub Desktop ("revert report redesign") and push. Done. The design
docs under `design/` and the `_backup/` folder are harmless to leave in place.

## Restore a single report

Report renderers all live in one file (`app/results/[token]/page.js`), so restoring one
report means restoring that file (line above). If a later phase splits reports into
separate files, this section will be updated with per-file paths.

## Git safety net (recommended, do this in GitHub Desktop)

This sandbox cannot run git reliably (it can't remove git lock files and has no push
network), and you handle git yourself, so I did NOT create a branch or tag. Please make
the checkpoint yourself so you have a one-click revert:

1. Before accepting any of this, in GitHub Desktop: History → right-click the last
   commit before the redesign → **Create Tag** → name it `pre-report-redesign`.
2. Optionally create a branch `report-design-overhaul` and review the changes there
   before merging to your working branch.
3. To undo everything later: check out the `pre-report-redesign` tag, or use
   History → right-click the redesign commits → **Revert**.

Never force-push. Never delete `_backup/`.

## Delete the overhaul entirely

Delete the `design/` folder and run the "Fastest full revert" block above. The
`_backup/` folder can stay; it does no harm.
