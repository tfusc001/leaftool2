# LeafFilter Norfolk Planner — v60/v61 "Faster Rep Workflow"

## v61 — Decision Screen pricing story

The Today's Investment card on the Decision screen now reads as one simple top-to-bottom story a customer can verify with their own math:

1. **Retail Price** (crossed out) — the anchor
2. **Your Savings Today** — every discount as its own green line (senior/military included, no hidden math)
3. **Total Savings From Retail** — highlighted box
4. **Your Price Today** — large white box
5. **Easy Pay** — largest box, green, `$XX/mo`

Also fixed: discounts are now rounded to whole dollars **as they are applied**, so the lines always add up penny-exact to the total and final price. Before, each line rounded independently, and the card could be $1 off from its own total — the kind of mismatch that kills trust at the kitchen table. This applies consistently across every screen, the print proposal, and the Google Sheets backup (final prices may shift by ~$1 vs. the old build).


Built from the exact v56/v59 package the reps have today. **All branding, colors, logos, screens, wording, and pricing math are unchanged.** Every change below is about speed and not losing work in the field.

## What reps will notice

1. **Nothing gets lost anymore.** The app now autosaves the work-in-progress deal on the iPad as the rep types. If Safari reloads the tab mid-appointment (which iPads do constantly), the app reopens exactly where they left off — customer, prices, options, everything.

2. **Rep name and branch are remembered.** Enter them once; every new deal and every new day starts pre-filled.

3. **New "New Deal" button** in the top bar. One tap automatically stores the current deal in the Deal Library, resets the form for the next customer (keeping rep name/branch and today's date), and puts the cursor in Customer Name.

4. **Store Deal is instant.** No more pop-up alerts to dismiss and no waiting on the Google Sheets round-trip. The deal saves to the iPad immediately, a small toast confirms it, and the cloud backup happens in the background. Toasts also confirm when the cloud backup completes.

5. **Typing is much faster.** The app used to rebuild the entire presentation view AND the full print proposal on every single keystroke. Now the Live Price Build still updates instantly, the presentation view refreshes a beat later, and the print proposal is only built when someone actually prints. On an older iPad this is a big difference.

6. **Cloud sync runs automatically on launch.** Any deals that were saved offline push to Google Sheets as soon as the app opens with internet — no need to open the Deal Library and tap Sync.

7. **Better iPad keyboards.** Phone field brings up the phone keypad; custom coupon brings up the number pad.

## Bug fixed along the way

- If Safari reloaded the tab after a deal was stored, storing again would create a **duplicate deal** (and a duplicate row in Google Sheets). The deal ID now survives reloads, so re-storing updates the same deal/row.

## How to deploy (same as before)

1. Open the Apps Script project → replace **Index.html** with `OPEN_AND_COPY_Index_html_CODE.txt` contents.
2. Replace **Code.gs** with `OPEN_AND_COPY_Code_gs_CODE.txt` contents (only change: service-worker cache bumped v59 → v60 so installed field apps pick up the new build).
3. Deploy → Manage deployments → Edit → New version → Deploy.
4. Reps just reopen the app while online; installed field apps refresh automatically.

## Technical notes (for the next developer)

- New localStorage keys: `lf-norfolk-planner-working-state-v60` (session autosave, written ~500ms after changes and immediately on Store Deal), `lf-norfolk-planner-rep-info` (rep name + branch).
- Deal Library storage and cloud queue keys are unchanged, so existing saved deals on rep iPads carry over untouched.
- `saveCurrentDeal()` is now synchronous-return (queues cloud sync in background); `startNewDeal()` quiet-stores before resetting.
- Print sheet renders lazily via `ensurePrintSheet()` (print buttons + `beforeprint` event).
- All `alert()` calls replaced with non-blocking toasts; destructive confirms (`confirm()`) kept.
