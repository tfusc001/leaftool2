# LeafFilter Norfolk — Make the Field App Truly Work Offline (v60)

## Why reps don't have offline today

The July 1 guide was right, but **step 2 (HTTPS static hosting) never got finished** — reps are opening `Index.html` straight out of an extracted zip in a Temp folder (`file:///C:/Users/...`). Opened that way, the browser refuses to install the service worker, so there is no real "installed field app," no reliable offline cache, and no cloud backup. Every zip re-extract also lands in a new folder, which is how deals and settings get lost.

The fix is to finish the hosting step. You already have the GitHub repo (`tfusc001/leaf-filter-pres.-tool`), and **you don't need to install Git** — everything below happens on github.com in the browser.

## One-time manager setup (about 10 minutes)

### Step 1 — Update Apps Script (cloud backup for Google Sheets)

1. Open the Google Sheet where deals back up → Extensions → Apps Script.
2. Replace **Code.gs** with `LeafFilter Apps Script Upload Files/OPEN_AND_COPY_Code_gs_CODE.txt`.
3. Replace **Index.html** with `LeafFilter Apps Script Upload Files/OPEN_AND_COPY_Index_html_CODE.txt`.
4. Deploy → Manage deployments → Edit (pencil) → Version: **New version** → Deploy.
5. **Copy the Web App URL ending in `/exec`.** You'll use it in Step 3.
   (Deployment must be set to Execute as: Me · Who has access: Anyone.)

### Step 2 — Upload the offline app to GitHub Pages

1. Go to **github.com/tfusc001/leaf-filter-pres.-tool** in your browser.
2. Click **Add file → Upload files**.
3. Drag in all 4 files from the **`Static Hosting Upload (GitHub Pages)`** folder:
   `index.html`, `manifest.webmanifest`, `service-worker.js`, `leaf-filter-icon.svg`
4. Click **Commit changes**.
5. Repo **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → Save.
6. After a minute or two your team link is live at:
   **`https://tfusc001.github.io/leaf-filter-pres.-tool/`**

> These files must be at the top level of the repo (not inside a subfolder) or the link above will change accordingly.

### Step 3 — Connect cloud backup with one link (new in v60)

You no longer have to edit code to connect the static app to Google Sheets. Just add the `/exec` URL from Step 1 to the link **once**:

```
https://tfusc001.github.io/leaf-filter-pres.-tool/?backup=PASTE_YOUR_EXEC_URL_HERE
```

Send **that** link to reps for first-time setup. Opening it once stores the backup endpoint on the device permanently; after that the plain link (or the home-screen icon) is all they use. The status pill will read **"Synced · Cloud backup ready."**

(The old way still works too: edit `STATIC_CLOUD_BACKUP_URL` inside index.html before uploading.)

## Rep setup (2 minutes per iPad, once)

1. While online, open the setup link from Step 3 in **Safari**.
2. Tap **Share → Add to Home Screen → Add** ("LF Planner").
3. Open it from the home-screen icon once while still online.
4. Confirm the yellow note says **"Offline app cache is ready on this device."**
5. Airplane-mode test: the app should open and price fully with no signal.

From then on: deals store on the iPad instantly, even with zero signal, and back up to the Google Sheet automatically the next time the app opens online.

## What v60 fixed for offline specifically

- **Service worker caches files one-by-one** — before, one bad URL silently cancelled the entire offline cache.
- **`index.html` is lowercase** in the static folder — GitHub Pages is case-sensitive and only auto-serves lowercase `index.html`; the capital-I version was another silent offline-killer.
- **`?backup=` setup link** — configures Google Sheets backup on each device with zero code editing.
- **Session autosave** — a mid-appointment tab reload (an iPad habit) restores the deal exactly, including its saved-deal ID, so no duplicates in the Sheet.

## QA checklist before sending the team link (same as the old guide)

1. Open the hosted app online → store one test deal.
2. Status shows **Synced** → open the Google Sheet, confirm the row appeared.
3. Open Deal Library → the deal is listed → Remove it (and delete the Sheet row).
4. Airplane mode → app still opens → store a deal → shows **Pending Sync** → back online → syncs.
