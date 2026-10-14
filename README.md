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
assets/logos/                         wallet logos, named by listing slug (see below)
data.json                             generated, do not edit by hand
scripts/build_data.py                 wallets repo YAML -> data.json
.github/workflows/sync-data.yml       hourly refresh of data.json
CNAME                                 wallets.canton.foundation
.nojekyll                             serve files as-is
```

## Updating the data

Automatic: the **Sync wallet data** action runs hourly and commits a new `data.json` only when a listing changed. Run it any time from the Actions tab.

By hand:

```bash
git clone https://github.com/canton-foundation/wallets _wallets_src
pip install pyyaml
python3 scripts/build_data.py --src _wallets_src --out data.json
```

## Wallet logos

Each wallet's logo sits in the square tile beside its name on cards, in the matrix header and on its profile. Logos live in this repo, not the wallets repo, so the data sync never touches them. A wallet without a logo shows its two-letter monogram instead.

To add or change one:

1. Put the file in `assets/logos/`, named after the wallet's slug (the `id` in `wallet.html?id=…`). Use the brand's square icon or symbol, not the wide wordmark, as SVG where possible.
2. Add the slug to `LOGOS` near the top of `assets/app.js`:
   - `src` is the file for the dark theme (the default).
   - `onLight` is a second file for the light theme, for marks that disappear on a light tile (white or pale logos).
   - `fill: true` is for complete app icons with their own background. They cover the whole tile instead of sitting inset.
3. Bump `?v=` and add a row to the table below.

| Wallet | Files | Source |
|---|---|---|
| Dfns | `dfns.svg`, `dfns-on-light.svg` | No current kit: `dfns.co/brand` was taken down after the 2026 rebrand, and the archived kit shows the retired cube logo. Navy symbol from Dfns's dashboard (`app.dfns.io/img/dfns2026/brand/cube.svg`); the pale one is the same mark taken from the on-dark logo on docs.dfns.co. |
| Send | `send.svg`, `send-on-light.svg` | Send brand assets, [info.send.it](https://info.send.it/docs/miscellaneous/brand-links-assets): green and dark logomarks. |
| Askardex Wallet | `askardex-wallet.png` | No kit or SVG published. `wallet.askardex.com/icon-512.png`, resized to 256px. |
| Walley | `walley.svg`, `walley-on-light.svg` | No kit published. White mark from `walley.cc/favicon.svg`; the light-theme file is the same paths filled `#0A0A0A`, the site's own light-theme text colour. |
| Blockdaemon Institutional Vault | `blockdaemon-institutional-vault.svg`, `…-on-light.svg` | [Blockdaemon media kit](https://www.blockdaemon.com/media-kit), Badge pack: White and Purple. |
| Nightly | `nightly.svg` | [Nightly branding](https://nightly.app/branding), Nightly Wallet Logo Pack: "Nightly Logo Dark Square". |
| Metatarz | `metatarz.png` | Metatarz brand kit ("Download brand kit" in the metatarz.xyz footer): `metatarz-logo-square.png`, resized to 256px. The kit's SVGs are wrapped PNGs, so the PNG is used. |
| Ledger Wallet | `ledger-wallet.svg`, `ledger-wallet-on-light.svg` | [Ledger brand site](https://brand.ledger.com/brand-design/logo): single-character mark, white and black RGB. |

## Testing locally

`fetch()` doesn't work from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

After changing `styles.css` or `app.js`, bump the `?v=` number (currently 6) in the three HTML files so browsers fetch the new version.
