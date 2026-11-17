# HANDOFF.md — techguruofficial.us (TechGuruServices/techguruofficial)

## Current state snapshot

- Site: GitHub Pages from `main`. Homepage + `/products` now link the Contractor Pro live demo (branch `feature/contractor-pro-demo-links`, PR pending Lucas's merge — nothing deployed yet).
- Contractor Pro: live demo https://demo.crm.techguruofficial.us (demo login admin@contractor.local), production https://crm.techguruofficial.us, Microsoft Store https://apps.microsoft.com/detail/9N1V9390VPVR. $9.99/mo after a 14-day free trial.
- Untracked local files NOT part of any commit: `links.html` is tracked upstream now; `workers/deploy-techguru-api.py` and `.preview-step5/` (local preview screenshots) are untracked — leave alone.

---

## HANDOFF: Link Contractor Pro demo from homepage + /products (Step 5)

**2026-11-15 16:32 UTC / 09:32 AM MST — TECHGURU-MUSE (subagent)**

**What changed (branch `feature/contractor-pro-demo-links`, from main @ 398380f):**
- `index.html` — Contractor Pro card added FIRST in the homepage `.va-grid` (before Review Rocket): hard-hat-on-toolbox icon, status "Live on Microsoft Store", pitch "Your whole crew, in one app.", desc, price line "$9.99/mo after a 14-day free trial", primary button "Try the live demo" → https://demo.crm.techguruofficial.us, visible "Demo login: admin@contractor.local" (email only, no password shown), secondary link "Open Contractor Pro →" → https://crm.techguruofficial.us. Added two small CSS rules (`.va-card .price`, `.va-demo-login`) in the section's inline style block.
- `products.html` — Contractor Pro added as card 06 after DemoGlide, following the `.pc-item`/`.pc` pattern (`--a:#f97316;--b:#ea580c`, status "Live on Microsoft Store", kind "Web app · CRM, time & reviews", num 06). Same copy/pricing/demo-login as homepage, plus a "Go further" row (Microsoft Store listing + "Open Contractor Pro →"). Headline "Five ways to put your time back." → "Six ways to put your time back." Meta description (name + og + twitter) now includes Contractor Pro. "Contractor Growth Suite" section rewritten: no longer "Coming soon" — Contractor Pro is live now with demo link + demo login; flow is now 3 nodes (1 Estimate Closer → 2 Contractor Pro "runs the crew" → 3 Review Rocket), existing two nodes intact.
- `images/icons/contractor-pro-icon.png` — NEW, copied from the official mark `~/workspace/crm-store-assets/contractor-pro-logo-final.png` (571×573, essentially square). No new logo generated.
- No other copy, pricing, or files changed. Nothing deployed (GitHub Pages deploys from main after Lucas merges).

**How it was verified (local preview, python http.server :8765, headless Chromium via CDP):**
- Desktop 1440px + mobile 390px screenshots of (a) homepage products grid, (b) /products Contractor Pro card, (c) updated Suite section — saved under `.preview-step5/` (NOT committed). No horizontal overflow at either width; icon renders; demo links present and correct in source.
- Caught and fixed during preview: first products.html edit accidentally dropped DemoGlide's closing `</aside></article></div>` tags, nesting card 06 inside DemoGlide's aside (desktop card rendered squeezed). Restored the closers; re-verified tag balance (article 6/6, aside 9/9 file-wide) and re-shot — card now renders full-width correctly.

**Needs Lucas's tap:** review + merge the PR "Link Contractor Pro demo from homepage + /products" on GitHub. After merge, GitHub Pages deploys from main automatically.
