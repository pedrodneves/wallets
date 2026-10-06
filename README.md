# wallets.canton.foundation

Public website for the Canton Foundation **Wallet Directory Program**.
All content comes from [canton-foundation/wallets](https://github.com/canton-foundation/wallets);
this repo only holds the site that displays it.

| Page | File | What it does |
|---|---|---|
| Directory | `index.html` | Wallet cards with filters (type, form factor, required feature, search, sort) and the "How listing works" section |
| Feature matrix | `matrix.html` | Every wallet × every feature, with evidence links, primary/all views, "only differences", and side-by-side compare |
| Wallet profile | `wallet.html?id=<slug>` | One wallet's claims, reasons, evidence and suggested tests |

Filters are kept in the URL, so any filtered view can be shared as a link.

A **Light / Dark** button in the header switches theme. Dark is the default; the choice is remembered in the browser (`localStorage` key `wallets-theme`). Theme colours are the tokens in `:root` (dark) and `:root[data-theme="light"]` in `assets/styles.css`.

## Files

```
index.html  matrix.html  wallet.html   page shells (all drawing happens in app.js)
assets/styles.css                     theme tokens in :root + all styles
assets/app.js                         loads data.json and renders each page
assets/Canton-Foundation-Logo-Dark.svg   official wordmark (same as sv-cal)
assets/favicon.png                    Canton "C" favicon (same as sv-cal)
data.json                             generated, do not edit by hand
scripts/build_data.py                 wallets repo YAML -> data.json
.github/workflows/sync-data.yml       hourly refresh of data.json
CNAME                                 wallets.canton.foundation
.nojekyll                             serve files as-is
```

## Deploy on GitHub Pages

1. Push these files to the root of the repo's `main` branch.
2. **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. **Settings → Pages → Custom domain**: `wallets.canton.foundation` (the `CNAME` file sets this too). Tick *Enforce HTTPS* once the certificate is issued.
4. DNS: a `CNAME` record for `wallets` pointing to `<org-or-user>.github.io`.
5. **Settings → Actions → General → Workflow permissions**: *Read and write*, so the sync job can commit `data.json`.

## Updating the data

Automatic: the **Sync wallet data** action runs hourly and commits a new `data.json` only when a listing changed. Run it any time from the Actions tab.

By hand:

```bash
git clone https://github.com/canton-foundation/wallets _wallets_src
pip install pyyaml
python3 scripts/build_data.py --src _wallets_src --out data.json
```

## Testing locally

`fetch()` doesn't work from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

After changing `styles.css` or `app.js`, bump the `?v=` number (currently 3) in the three HTML files so browsers fetch the new version.
