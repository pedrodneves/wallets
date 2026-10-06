/* ==========================================================================
   wallets.canton.foundation — app.js
   One script for all three pages. Each HTML page sets
   <body data-page="directory|matrix|wallet"> and this file draws the
   matching page from data.json (built by scripts/build_data.py).
   No frameworks, no build step: works as-is on GitHub Pages.
   ========================================================================== */

(function () {
  "use strict";

  // ---- Constants ---------------------------------------------------------

  // Public repo the whole site is generated from.
  const REPO = "https://github.com/canton-foundation/wallets";
  const CONTRIBUTING = REPO + "/blob/main/CONTRIBUTING.md";

  // The four features shown on every directory card, with short labels.
  const KEY_FEATURES = [
    ["cc_support", "Canton Coin"],
    ["cip_0056_transfer", "CIP-0056 transfers"],
    ["cip_0103_dapp_api", "CIP-0103 dApp API"],
    ["walletconnect_support", "WalletConnect"],
  ];

  // Inline SVG icons (stroke uses currentColor so CSS sets the colour).
  const ICON = {
    check: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    shield: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5l4.5 1.8v3.4c0 2.8-2 4.8-4.5 5.8-2.5-1-4.5-3-4.5-5.8V3.3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    cross: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    github: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
  };

  // ---- Small helpers -----------------------------------------------------

  // Escape text before putting it into HTML (data comes from YAML files
  // anyone can open a PR against, so never trust it as markup).
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Only allow http(s) links into href attributes.
  function safeUrl(url) {
    return /^https?:\/\//i.test(url || "") ? esc(url) : "#";
  }

  // Two-letter monogram tile text: "Ledger Wallet" -> "LW", "Dfns" -> "Df".
  function initials(name) {
    const words = String(name).split(/\s+/).filter(Boolean);
    if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
    return (name.slice(0, 1).toUpperCase() + name.slice(1, 2).toLowerCase());
  }

  // "https://www.dfns.co/path" -> "dfns.co"
  function domain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return url || ""; }
  }

  // Values of a freetext feature for a wallet, as an array of strings.
  function textOf(wallet, id) {
    const claim = wallet.features[id];
    return claim && claim.values ? claim.values : [];
  }

  // "Browser-extension" -> "Browser extension" for display.
  function pretty(value) {
    return String(value).replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  }

  // Does this claim count as "the wallet says yes"?
  function isYes(claim) {
    return claim && (claim.status === "proof" || claim.status === "attested");
  }

  // Read / write query-string state so filtered views can be shared as links.
  function getParams() { return new URLSearchParams(location.search); }
  function setParams(obj) {
    const p = new URLSearchParams();
    Object.keys(obj).forEach((k) => {
      const v = obj[k];
      if (v === "" || v == null || v === false || (Array.isArray(v) && !v.length)) return;
      p.set(k, Array.isArray(v) ? v.join(",") : v === true ? "1" : v);
    });
    const qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  // ---- Shared chrome: header and footer ---------------------------------

  function renderHeader(active) {
    const link = (href, label, key) =>
      `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`;
    document.getElementById("site-header").innerHTML = `
      <div class="wrap">
        <a class="brand" href="index.html" aria-label="Canton Foundation Wallet Directory, home">
          <!-- Official wordmark, same file as the SV Calendar header -->
          <img class="brand-logo" src="assets/Canton-Foundation-Logo-Dark.svg" alt="Canton Foundation">
          <span class="brand-divider" aria-hidden="true"></span>
          <span class="brand-title">Wallet Directory</span>
        </a>
        <nav class="nav" aria-label="Main">
          ${link("index.html", "Directory", "directory")}
          ${link("matrix.html", "Feature matrix", "matrix")}
          ${link("index.html#how", "How listing works", "how")}
          <a href="${REPO}" target="_blank" rel="noopener">${ICON.github}GitHub</a>
        </nav>
      </div>`;
  }

  function renderFooter(data) {
    const commit = data && data.source_commit
      ? ` at <a href="${REPO}/commit/${esc(data.source_commit)}" target="_blank" rel="noopener"><code>${esc(data.source_commit)}</code></a>` : "";
    const when = data ? ` · updated ${esc(data.generated_at)}` : "";
    document.getElementById("site-footer").innerHTML = `
      <div class="wrap">
        <span>Generated from <a href="${REPO}" target="_blank" rel="noopener">canton-foundation/wallets</a>${commit}${when}</span>
        <nav aria-label="Footer">
          <a href="${REPO}" target="_blank" rel="noopener">Source</a>
          <a href="${CONTRIBUTING}" target="_blank" rel="noopener">Contributing</a>
          <a href="https://canton.foundation" target="_blank" rel="noopener">canton.foundation</a>
        </nav>
      </div>`;
  }

  // ---- Data loading -------------------------------------------------------

  async function loadData() {
    // no-cache: always ask the server so an hourly data refresh shows up.
    const res = await fetch("data.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("data.json returned HTTP " + res.status);
    return res.json();
  }

  function showError(root, err) {
    root.innerHTML = `<div class="wrap state-msg">
      <p>The wallet data didn't load (${esc(err.message)}). Refresh the page, or read the same data in
      <a href="${REPO}/blob/main/WALLET_DIRECTORY.md">WALLET_DIRECTORY.md</a> on GitHub.</p></div>`;
  }

  // ========================================================================
  // PAGE 1 — Directory (index.html)
  // ========================================================================

  function directoryPage(data, root) {
    const wallets = data.wallets;
    const boolFeatures = data.features.filter((f) => f.type === "boolean");

    // Every form factor any wallet lists, in a stable order.
    const FF_ORDER = ["Browser", "Mobile", "Browser-extension", "Desktop", "Hardware"];
    const formFactors = [...new Set(wallets.flatMap((w) => textOf(w, "form_factor")))]
      .sort((a, b) => (FF_ORDER.indexOf(a) + 99) % 99 - (FF_ORDER.indexOf(b) + 99) % 99);

    // Filter state, seeded from the URL (?type=Retail&ff=Mobile&need=cc_support&q=…&sort=name)
    const p = getParams();
    const state = {
      type: p.get("type") || "all",
      ff: (p.get("ff") || "").split(",").filter(Boolean),
      need: p.get("need") || "",
      q: p.get("q") || "",
      sort: p.get("sort") || "added",
    };

    // Headline numbers, all computed from the data.
    const totalProof = wallets.reduce((n, w) => n + w.counts.proof, 0);
    const totalVerified = wallets.reduce((n, w) => n + w.counts.verified, 0);

    root.innerHTML = `
      <section class="hero"><div class="wrap">
        <div class="pill-intro"><span class="dot"></span>Wallet Directory Program</div>
        <h1>Wallets that work on Canton Network, and the evidence behind every claim.</h1>
        <p>Each listing is a provider's self-attestation against the feature registry, linked to public proof and open to independent verification by anyone in the ecosystem.</p>
        <div class="hero-actions">
          <a class="btn btn--primary" href="matrix.html">Compare all features</a>
          <a class="btn" href="${CONTRIBUTING}#applying-as-a-new-wallet-provider" target="_blank" rel="noopener">List your wallet</a>
        </div>
        <div class="stats">
          <div class="stat"><b>${wallets.length}</b><span>Wallets listed</span></div>
          <div class="stat"><b>${boolFeatures.length}</b><span>Features in the registry</span></div>
          <div class="stat"><b class="is-green">${totalProof}</b><span>Claims linked to public evidence</span></div>
          <div class="stat"><b class="is-purple">${totalVerified}</b><span>Independent verifications so far</span></div>
        </div>
      </div></section>

      <section class="wrap" aria-label="Filter wallets">
        <div class="toolbar">
          <div class="seg" role="group" aria-label="Wallet type" id="seg-type">
            ${[["all", "All wallets"], ["Retail", "Retail"], ["Enterprise", "Enterprise"]]
              .map(([v, l]) => `<button type="button" data-type="${v}">${l}</button>`).join("")}
          </div>
          <div class="toolbar-group" role="group" aria-label="Form factor" id="ff-group">
            <span class="field-label">Form factor</span>
            ${formFactors.map((f) => `<button type="button" class="chip" data-ff="${esc(f)}">${esc(pretty(f))}</button>`).join("")}
          </div>
          <label class="field" style="flex: 1 1 240px">
            <span class="sr-only">Must support</span>
            <select id="need">
              <option value="">Must support: any feature</option>
              ${boolFeatures.map((f) => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            ${ICON.search}<span class="sr-only">Search wallets</span>
            <input id="q" type="search" placeholder="Search by name or asset" autocomplete="off">
          </label>
          <label class="field" style="flex: 0 1 190px">
            <span class="sr-only">Sort</span>
            <select id="sort">
              <option value="added">Sort: date added</option>
              <option value="name">Sort: name</option>
              <option value="claims">Sort: most features</option>
              <option value="proof">Sort: most evidence</option>
            </select>
          </label>
        </div>
        <div class="result-line"><span id="result-count" aria-live="polite"></span><button type="button" class="linkish" id="reset">Clear filters</button></div>
        <div class="cards" id="cards"></div>
      </section>

      <section class="band" id="how"><div class="wrap">
        <h2>How a listing earns trust</h2>
        <p>Everything lives in the public repository. No claim appears here that isn't in a pull request anyone can review.</p>
        <ol class="steps">
          <li><span class="step-n" style="color: var(--green)">Step 1</span><h3>The provider self-attests</h3>
            <p>One YAML file per wallet in <code>wallets/</code>, with each claim linked to a proof document that follows the registry's suggested test.</p></li>
          <li><span class="step-n" style="color: var(--purple-text)">Step 2</span><h3>A third party reproduces it</h3>
            <p>Anyone can rerun a test on MainNet and add themselves to <code>verified_by</code> with their own evidence.</p></li>
          <li><span class="step-n" style="color: var(--orange)">Step 3</span><h3>Or shows a claim doesn't hold</h3>
            <p>A contradicting result is recorded beside the claim, so readers see both sides and the evidence for each.</p></li>
        </ol>
        <div class="hero-actions">
          <a class="btn btn--primary" href="${CONTRIBUTING}" target="_blank" rel="noopener">Read the contributing guide</a>
          <a class="btn" href="${CONTRIBUTING}#third-party-verification" target="_blank" rel="noopener">Verify a claim</a>
        </div>
      </div></section>`;

    // Grab controls once.
    const $cards = root.querySelector("#cards");
    const $count = root.querySelector("#result-count");
    const $need = root.querySelector("#need");
    const $q = root.querySelector("#q");
    const $sort = root.querySelector("#sort");

    // Put the URL state into the controls.
    $need.value = state.need;
    $q.value = state.q;
    $sort.value = state.sort;

    // Text a search can match: name, domain, and the assets list.
    const haystack = (w) => [w.name, domain(w.website), ...textOf(w, "assets_supported")].join(" ").toLowerCase();

    // One card's HTML.
    function card(w) {
      const types = textOf(w, "wallet_model");
      const custody = textOf(w, "custody_model");
      const form = textOf(w, "form_factor").map(pretty).join(", ");
      const deploy = textOf(w, "deployment_model").join(", ");
      const keys = KEY_FEATURES.map(([id, label]) => {
        const c = w.features[id] || { status: "none" };
        let status = '<span class="st-none">No claim</span>';
        if (isYes(c)) status = `<span class="st-yes">${ICON.check}Attested</span>`;
        else if (c.status === "unsupported") status = '<span class="st-no">Not supported</span>';
        return `<li><span>${label}</span>${status}</li>`;
      }).join("");
      const href = `wallet.html?id=${encodeURIComponent(w.slug)}`;
      return `<article class="card">
        <div class="card-head">
          <div class="mono-tile" aria-hidden="true">${esc(initials(w.name))}</div>
          <div><h2><a href="${href}">${esc(w.name)}</a></h2><div class="domain">${esc(domain(w.website))}</div></div>
        </div>
        <div class="tags">${[...types, ...custody].map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        <div class="form-line">${esc(form)}${deploy ? " · " + esc(deploy) : ""}</div>
        <ul class="keylist">${keys}</ul>
        <div class="card-foot"><span><strong>${w.counts.claimed}</strong> features · ${w.counts.proof} with evidence</span>
          <a href="${href}">View listing</a></div>
      </article>`;
    }

    // Apply filters + sort and redraw the grid.
    function draw() {
      // Reflect state on the toggle buttons.
      root.querySelectorAll("#seg-type button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === state.type)));
      root.querySelectorAll("#ff-group .chip").forEach((b) => b.setAttribute("aria-pressed", String(state.ff.includes(b.dataset.ff))));

      const q = state.q.trim().toLowerCase();
      let list = wallets.filter((w) =>
        (state.type === "all" || textOf(w, "wallet_model").includes(state.type)) &&
        (!state.ff.length || state.ff.some((f) => textOf(w, "form_factor").includes(f))) &&
        (!state.need || isYes(w.features[state.need])) &&
        (!q || haystack(w).includes(q))
      );

      // Sort a copy (data.json is already in date-added order).
      const by = {
        added: () => 0,
        name: (a, b) => a.name.localeCompare(b.name),
        claims: (a, b) => b.counts.claimed - a.counts.claimed,
        proof: (a, b) => b.counts.proof - a.counts.proof,
      }[state.sort] || (() => 0);
      list = list.slice().sort(by);

      $count.textContent = `Showing ${list.length} of ${wallets.length} wallets`;
      $cards.innerHTML = list.length
        ? list.map(card).join("")
        : `<div class="empty">No wallet matches these filters. <button type="button" class="linkish" data-reset>Clear filters</button> to see all ${wallets.length}.</div>`;

      setParams({ type: state.type === "all" ? "" : state.type, ff: state.ff, need: state.need, q: state.q, sort: state.sort === "added" ? "" : state.sort });
    }

    function reset() {
      Object.assign(state, { type: "all", ff: [], need: "", q: "", sort: "added" });
      $need.value = ""; $q.value = ""; $sort.value = "added";
      draw();
    }

    // Wire up controls.
    root.querySelector("#seg-type").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      state.type = b.dataset.type; draw();
    });
    root.querySelector("#ff-group").addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      const f = b.dataset.ff;
      state.ff = state.ff.includes(f) ? state.ff.filter((x) => x !== f) : [...state.ff, f];
      draw();
    });
    $need.addEventListener("change", () => { state.need = $need.value; draw(); });
    $q.addEventListener("input", () => { state.q = $q.value; draw(); });
    $sort.addEventListener("change", () => { state.sort = $sort.value; draw(); });
    root.querySelector("#reset").addEventListener("click", reset);
    $cards.addEventListener("click", (e) => { if (e.target.closest("[data-reset]")) reset(); });

    draw();

    // If the page was opened at #how, jump there now that it exists.
    if (location.hash === "#how") document.getElementById("how").scrollIntoView();
  }

  // ========================================================================
  // PAGE 2 — Feature matrix (matrix.html)
  // ========================================================================

  // One matrix cell for a boolean claim.
  function claimCell(w, f) {
    const c = w.features[f.id] || { status: "none" };
    const who = `${w.name}, ${f.name}`;
    let html = "";
    if (c.status === "proof") {
      html += `<a class="badge badge--proof" href="${safeUrl(c.proof_url)}" target="_blank" rel="noopener" title="Self-attested. Open the evidence." aria-label="${esc(who)}: self-attested, open evidence">${ICON.check}</a>`;
    } else if (c.status === "attested") {
      html += `<span class="badge badge--attested" title="Self-attested, no evidence linked" role="img" aria-label="${esc(who)}: self-attested, no evidence linked">${ICON.check}</span>`;
    } else if (c.status === "unsupported") {
      return `<a class="unsup" href="${safeUrl(w.source_url)}" target="_blank" rel="noopener" title="${esc(c.reason)}">Not supported</a>`;
    } else {
      return `<span class="nil" role="img" aria-label="${esc(who)}: no claim">—</span>`;
    }
    // Third-party results sit next to the claim.
    (c.verified || []).forEach((v) => {
      html += `<a class="badge badge--verified" href="${safeUrl(v.url)}" target="_blank" rel="noopener" title="Verified by ${esc(v.by)}" aria-label="Verified by ${esc(v.by)}">${ICON.shield}</a>`;
    });
    (c.disputed || []).forEach((v) => {
      html += `<a class="badge badge--disputed" href="${safeUrl(v.url)}" target="_blank" rel="noopener" title="Disputed by ${esc(v.by)}" aria-label="Disputed by ${esc(v.by)}">${ICON.cross}</a>`;
    });
    return `<span class="cell-stack">${html}</span>`;
  }

  function matrixPage(data, root) {
    const p = getParams();
    const state = {
      view: p.get("view") === "all" ? "all" : "primary",       // primary | all
      diff: p.get("diff") === "1",                             // only rows that differ
      type: p.get("type") || "all",                            // Retail | Enterprise | all
      pick: (p.get("w") || "").split(",").filter(Boolean),     // specific wallets (from Compare)
    };

    root.innerHTML = `
      <div class="wrap wrap--wide">
        <div class="page-head">
          <div>
            <h1>Feature matrix</h1>
            <p>Every cell is a claim from the wallet's own listing. Select a check mark to open the evidence it links to, or "Not supported" to read the wallet's reason.</p>
          </div>
        </div>
        <div class="matrix-controls">
          <div class="seg" role="group" aria-label="Features shown" id="seg-view">
            <button type="button" data-view="primary">Primary features</button>
            <button type="button" data-view="all">All features</button>
          </div>
          <div class="seg" role="group" aria-label="Wallet type" id="seg-type">
            <button type="button" data-type="all">All wallets</button>
            <button type="button" data-type="Retail">Retail</button>
            <button type="button" data-type="Enterprise">Enterprise</button>
          </div>
          <button type="button" class="chip" id="diff">Only show differences</button>
          <span id="pick-note" class="field-label"></span>
        </div>
        <div class="legend" aria-label="Legend">
          <span><span class="badge badge--sm badge--proof">${ICON.check}</span>Self-attested, evidence linked</span>
          <span><span class="badge badge--sm badge--attested">${ICON.check}</span>Self-attested, no evidence linked</span>
          <span><span class="badge badge--sm badge--verified">${ICON.shield}</span>Verified by a third party</span>
          <span><span class="badge badge--sm badge--disputed">${ICON.cross}</span>Disputed by a third party</span>
          <span><span class="unsup">Not supported</span>Wallet says no, with a reason</span>
          <span><span class="nil">—</span>No claim either way</span>
        </div>
        <div class="table-box" tabindex="0" aria-label="Feature matrix, scrolls sideways"><table class="matrix" id="matrix"></table></div>
        <p class="note">Built from <code>wallets/*.yaml</code> and <code>wallets/_feature_registry.yaml</code>. The same data as <a href="${REPO}/blob/main/WALLET_DIRECTORY.md" target="_blank" rel="noopener">WALLET_DIRECTORY.md</a>.</p>
      </div>`;

    const $table = root.querySelector("#matrix");

    function draw() {
      root.querySelectorAll("#seg-view button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
      root.querySelectorAll("#seg-type button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === state.type)));
      root.querySelector("#diff").setAttribute("aria-pressed", String(state.diff));

      // Which wallets are columns.
      let cols = data.wallets.filter((w) => state.type === "all" || textOf(w, "wallet_model").includes(state.type));
      if (state.pick.length) cols = cols.filter((w) => state.pick.includes(w.slug));
      root.querySelector("#pick-note").innerHTML = state.pick.length
        ? `Comparing ${cols.map((w) => esc(w.name)).join(" and ")} · <button type="button" class="linkish" id="show-all">Show all wallets</button>` : "";

      // Which features are rows.
      let feats = data.features.filter((f) => state.view === "all" || f.primary);
      if (state.diff) {
        // Keep a row only if the visible wallets don't all say the same thing.
        feats = feats.filter((f) => {
          const keys = cols.map((w) => {
            const c = w.features[f.id];
            return f.type === "freetext" ? (c.values || []).join("|") : (isYes(c) ? "yes" : c.status);
          });
          return new Set(keys).size > 1;
        });
      }

      const colspan = cols.length + 1;
      let html = `<thead><tr><th scope="col" class="feat-col">Feature</th>${cols.map((w) => `
        <th scope="col"><a class="wallet-head" href="wallet.html?id=${encodeURIComponent(w.slug)}">
          <span class="mono-tile" aria-hidden="true">${esc(initials(w.name))}</span>
          <b>${esc(w.name)}</b><small>${esc(textOf(w, "wallet_model").join(" · "))}</small></a></th>`).join("")}
        </tr></thead><tbody>`;

      let section = null, category = null;
      feats.forEach((f) => {
        // In the "all" view, label the two halves like WALLET_DIRECTORY.md.
        const sec = f.primary ? "Primary Canton Network features" : "Other features";
        if (state.view === "all" && sec !== section) {
          section = sec;
          html += `<tr class="section-row"><th colspan="${colspan}" scope="colgroup">${sec}</th></tr>`;
        }
        if (f.category !== category) {
          category = f.category;
          html += `<tr class="cat-row"><th colspan="${colspan}" scope="colgroup">${esc(category)}</th></tr>`;
        }
        html += `<tr><th scope="row">${esc(f.name)}<div class="feat-id">${esc(f.id)}</div></th>`;
        cols.forEach((w) => {
          if (f.type === "freetext") {
            const vals = textOf(w, f.id);
            html += vals.length ? `<td class="text-cell">${esc(vals.join(", "))}</td>` : `<td><span class="nil">—</span></td>`;
          } else {
            html += `<td>${claimCell(w, f)}</td>`;
          }
        });
        html += "</tr>";
      });

      if (!feats.length) html += `<tr><th colspan="${colspan}" scope="row" style="padding: 30px 20px; color: var(--text-2)">These wallets give the same answer on every feature in this view.</th></tr>`;
      if (!cols.length) html = `<tbody><tr><th scope="row" style="padding: 30px 20px; color: var(--text-2)">No wallets match. Choose "All wallets".</th></tr>`;
      $table.innerHTML = html + "</tbody>";

      setParams({ view: state.view === "all" ? "all" : "", diff: state.diff, type: state.type === "all" ? "" : state.type, w: state.pick });
    }

    // Controls.
    root.querySelector("#seg-view").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { state.view = b.dataset.view; draw(); } });
    root.querySelector("#seg-type").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { state.type = b.dataset.type; draw(); } });
    root.querySelector("#diff").addEventListener("click", () => { state.diff = !state.diff; draw(); });
    root.querySelector("#pick-note").addEventListener("click", (e) => { if (e.target.id === "show-all") { state.pick = []; draw(); } });

    draw();
  }

  // ========================================================================
  // PAGE 3 — Wallet profile (wallet.html?id=<slug>)
  // ========================================================================

  function walletPage(data, root) {
    const slug = getParams().get("id");
    const w = data.wallets.find((x) => x.slug === slug);

    // Unknown or missing id: point back to the directory.
    if (!w) {
      root.innerHTML = `<div class="wrap state-msg"><h1>Wallet not found</h1>
        <p>No listing matches "${esc(slug || "")}". <a href="index.html">Browse the directory</a> to find it.</p></div>`;
      return;
    }
    document.title = `${w.name} — Canton Wallet Directory`;

    const tags = [...textOf(w, "wallet_model"), ...textOf(w, "custody_model"), ...textOf(w, "form_factor").map(pretty), ...textOf(w, "deployment_model")];

    // Freetext details for the sidebar (skip the Wallet Type ones: they're tags).
    const facts = data.features
      .filter((f) => f.type === "freetext" && f.category !== "Wallet Type")
      .map((f) => [f.name, textOf(w, f.id)])
      .filter(([, v]) => v.length);

    // Boolean features grouped by category, in registry order.
    const groups = [];
    data.features.filter((f) => f.type === "boolean").forEach((f) => {
      let g = groups[groups.length - 1];
      if (!g || g.title !== f.category) groups.push((g = { title: f.category, rows: [] }));
      g.rows.push(f);
    });

    // One feature row in the main list.
    function row(f) {
      const c = w.features[f.id] || { status: "none" };
      const pills = [];
      if (c.status === "proof") pills.push(`<span class="pill pill--proof">${ICON.check}Self-attested</span>`);
      if (c.status === "attested") pills.push(`<span class="pill pill--attested">${ICON.check}Self-attested</span>`);
      if (c.status === "unsupported") pills.push('<span class="pill pill--unsupported">Not supported</span>');
      if (c.status === "none") pills.push('<span class="pill pill--none">No claim</span>');
      (c.verified || []).forEach((v) => pills.push(`<span class="pill pill--verified">${ICON.shield}Verified by ${esc(v.by)}</span>`));
      (c.disputed || []).forEach((v) => pills.push(`<span class="pill pill--disputed">${ICON.cross}Disputed by ${esc(v.by)}</span>`));
      if (isYes(c) && !f.self_attested_only && !(c.verified || []).length && !(c.disputed || []).length) {
        pills.push('<span class="pill pill--pending">Not yet verified</span>');
      }

      // Links under the row.
      const links = [];
      if (c.status === "proof") links.push(`<a href="${safeUrl(c.proof_url)}" target="_blank" rel="noopener">Open evidence</a>`);
      (c.verified || []).concat(c.disputed || []).forEach((v) => {
        if (v.url) links.push(`<a href="${safeUrl(v.url)}" target="_blank" rel="noopener">${esc(v.by)}'s evidence</a>`);
      });
      if (isYes(c) && !f.self_attested_only) links.push(`<a href="${CONTRIBUTING}#third-party-verification" target="_blank" rel="noopener" style="color: var(--muted)">Verify this claim</a>`);
      if (f.self_attested_only && isYes(c)) links.push('<span style="color: var(--muted)">General capability, self-attested only</span>');

      return `<div class="feature-row">
        <div class="feature-top">
          <div><div class="name">${esc(f.name)}</div><div class="fid">${esc(f.id)}</div></div>
          <div class="pills">${pills.join("")}</div>
        </div>
        ${c.status === "unsupported" ? `<p class="reason">${esc(c.reason)}</p>` : ""}
        ${links.length ? `<div class="row-links">${links.join("")}</div>` : ""}
        ${f.suggested_test ? `<details class="test"><summary>Suggested test</summary><p>${esc(f.suggested_test)}</p></details>` : ""}
      </div>`;
    }

    const others = data.wallets.filter((x) => x.slug !== w.slug);

    root.innerHTML = `
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Directory</a><span>/</span>${esc(w.name)}</nav>
        <div class="profile-head">
          <div class="profile-id">
            <div class="mono-tile" aria-hidden="true">${esc(initials(w.name))}</div>
            <div><h1>${esc(w.name)}</h1>
              <div class="profile-meta">
                ${w.website ? `<a href="${safeUrl(w.website)}" target="_blank" rel="noopener">${esc(domain(w.website))}</a>` : ""}
                ${w.added ? `<span>Listed ${esc(w.added)}</span>` : ""}
              </div></div>
          </div>
          <div class="hero-actions" style="margin: 0">
            ${w.website ? `<a class="btn btn--primary" href="${safeUrl(w.website)}" target="_blank" rel="noopener">Visit wallet</a>` : ""}
            <a class="btn" href="${safeUrl(w.source_url)}" target="_blank" rel="noopener">${ICON.github}View listing source</a>
          </div>
        </div>
        <div class="tags profile-tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        <div class="profile-stats">
          <div><b style="color: var(--green)">${w.counts.claimed}</b><span>Features attested</span></div>
          <div><b>${w.counts.proof}</b><span>Linked to evidence</span></div>
          <div><b style="color: var(--purple-text)">${w.counts.verified}</b><span>Third-party verified</span></div>
          <div><b style="color: #c8c8da">${w.counts.unsupported}</b><span>Declared not supported</span></div>
        </div>

        <div class="profile-body">
          <div class="profile-main">
            ${groups.map((g) => `<section><h2 class="group-title">${esc(g.title)}</h2>
              <div class="feature-list">${g.rows.map(row).join("")}</div></section>`).join("")}
          </div>
          <aside class="profile-side">
            ${facts.length ? `<div class="panel"><h2>At a glance</h2><dl>
              ${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v.join(", "))}</dd></div>`).join("")}
              ${w.contact ? `<div><dt>Contact</dt><dd>${/@/.test(w.contact) && !/\s/.test(w.contact) ? `<a href="mailto:${esc(w.contact)}">${esc(w.contact)}</a>` : esc(w.contact)}</dd></div>` : ""}
            </dl></div>` : ""}
            <div class="panel panel--accent">
              <h2>Tested this wallet yourself?</h2>
              <p>Rerun any suggested test on MainNet and open a pull request adding your evidence. Confirming or contradicting a claim both help.</p>
              <div class="stack">
                <a class="btn btn--primary" href="${CONTRIBUTING}#third-party-verification" target="_blank" rel="noopener">Submit a verification</a>
                <a class="btn" href="${REPO}/issues/new?title=${encodeURIComponent("Discrepancy: " + w.name)}" target="_blank" rel="noopener">Report a discrepancy</a>
              </div>
            </div>
            <form class="panel compare-form" action="matrix.html" method="get">
              <label for="compare" style="font-size: 15px; font-weight: 600">Compare ${esc(w.name)} with</label>
              <div class="field"><select id="compare">${others.map((o) => `<option value="${esc(o.slug)}">${esc(o.name)}</option>`).join("")}</select></div>
              <input type="hidden" name="view" value="all">
              <input type="hidden" name="w" id="compare-w">
              <button type="submit" class="btn">Open side-by-side</button>
            </form>
          </aside>
        </div>
      </div>`;

    // Compare form: send both slugs to the matrix as ?w=a,b
    const $sel = root.querySelector("#compare");
    const $w = root.querySelector("#compare-w");
    const sync = () => { $w.value = w.slug + "," + $sel.value; };
    $sel.addEventListener("change", sync);
    sync();
  }

  // ---- Boot ---------------------------------------------------------------

  async function boot() {
    const page = document.body.dataset.page;
    const root = document.getElementById("main");
    renderHeader(page);
    try {
      const data = await loadData();
      renderFooter(data);
      if (page === "directory") directoryPage(data, root);
      else if (page === "matrix") matrixPage(data, root);
      else if (page === "wallet") walletPage(data, root);
    } catch (err) {
      renderFooter(null);
      showError(root, err);
      console.error(err);
    }
  }

  boot();
})();
