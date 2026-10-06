#!/usr/bin/env python3
"""
build_data.py -- turns the canton-foundation/wallets repo into data.json
for the wallets.canton.foundation site.

What it reads (from a local checkout of canton-foundation/wallets):
    wallets/_feature_registry.yaml   -> the list of features + categories
    wallets/*.yaml                   -> one listing per wallet provider

What it writes:
    data.json                        -> everything the site's JavaScript needs

The status rules copy scripts/generate_table.py in the wallets repo exactly,
so the website always says the same thing as WALLET_DIRECTORY.md:
    supported: true + proof            -> "proof"       (evidence linked)
    supported: true, no proof          -> "attested"    (claim only)
    supported: true, self_attested_only-> "attested"    (no proof mechanism)
    supported: false + reason          -> "unsupported" (wallet says no)
    anything else                      -> "none"        (no claim either way)

Usage:
    python3 scripts/build_data.py --src ../wallets --out data.json
"""

import argparse          # reads command-line options (--src, --out)
import datetime          # timestamps the build
import glob              # finds every wallets/*.yaml file
import json              # writes data.json
import os                # path handling
import subprocess        # asks git for the source commit hash

import yaml              # PyYAML: pip install pyyaml

# Base URL used to turn repo-relative paths (proofs/..., wallets/...) into
# clickable GitHub links on the website.
REPO_URL = "https://github.com/canton-foundation/wallets"
BLOB_URL = REPO_URL + "/blob/main/"

# These categories make up the "Primary features" view, matching the first
# table in WALLET_DIRECTORY.md. Everything else is "Other features".
PRIMARY_CATEGORIES = {
    "Wallet Type",
    "Canton Coin",
    "Token Standard",
    "dApp Connectivity (CIP-103)",
}


def to_url(path):
    """Turn a repo-relative path into a full GitHub URL.
    Paths that are already full URLs are returned unchanged."""
    if not path:
        return None
    if str(path).startswith("http"):
        return path
    return BLOB_URL + str(path).lstrip("./")


def clean_name(name):
    """Feature names may contain a manual '<br>' meant for the markdown
    table. The website wraps text itself, so swap it for a space."""
    return " ".join(str(name).replace("<br>", " ").split())


def load_registry(src):
    """Read the feature registry and return a clean list of features,
    in registry order, each tagged as primary or not."""
    with open(os.path.join(src, "wallets", "_feature_registry.yaml")) as f:
        raw = yaml.safe_load(f)

    features = []
    for item in raw.get("features", []):
        features.append({
            "id": item["id"],
            "name": clean_name(item["name"]),
            "category": item["category"],
            "type": item["type"],                         # boolean | freetext
            "self_attested_only": bool(item.get("self_attested_only")),
            "suggested_test": " ".join((item.get("suggested_test") or "").split()) or None,
            "primary": item["category"] in PRIMARY_CATEGORIES,
        })
    return features


def boolean_claim(value, feature):
    """Convert one wallet's boolean feature entry into a website-ready
    object: status, links, reason and third-party results."""
    # Nothing written for this feature -> no claim either way.
    if not isinstance(value, dict):
        return {"status": "none"}

    # Said no. Only counts as "Not supported" when a reason is given;
    # a bare supported:false is treated as no claim (same as the repo).
    if not value.get("supported"):
        reason = value.get("reason")
        if reason:
            return {"status": "unsupported", "reason": reason}
        return {"status": "none"}

    # Generic capabilities with no on-network test: a plain claim.
    if feature["self_attested_only"]:
        return {"status": "attested"}

    # Split third-party results into confirmations and disputes.
    verified, disputed = [], []
    for v in value.get("verified_by") or []:
        entry = {"by": v.get("by", "unknown"), "date": v.get("date"), "url": to_url(v.get("proof"))}
        if v.get("result") == "unsupported":
            disputed.append(entry)
        else:
            verified.append(entry)

    proof_url = to_url(value.get("proof"))
    return {
        "status": "proof" if proof_url else "attested",
        "proof_url": proof_url,
        "verified": verified,
        "disputed": disputed,
    }


def freetext_value(value):
    """Freetext features can be a string or a list. Always return a list
    of strings (empty list when missing) so the JS has one shape."""
    if value in (None, "", []):
        return []
    if isinstance(value, list):
        return [str(v) for v in value if v not in (None, "")]
    return [str(value)]


def load_wallets(src, features):
    """Read every wallet listing and normalise its features."""
    wallets = []
    for path in sorted(glob.glob(os.path.join(src, "wallets", "*.yaml"))):
        base = os.path.basename(path)
        # Skip the registry and the blank template.
        if base.startswith("_") or base.upper().startswith("TEMPLATE"):
            continue
        with open(path) as f:
            raw = yaml.safe_load(f) or {}

        raw_features = raw.get("features") or {}
        claims = {}
        for feat in features:
            value = raw_features.get(feat["id"])
            if feat["type"] == "freetext":
                claims[feat["id"]] = {"status": "text", "values": freetext_value(value)}
            else:
                claims[feat["id"]] = boolean_claim(value, feat)

        # Quick counts used on cards and the profile header.
        bools = [c for c in claims.values() if c["status"] != "text"]
        counts = {
            "claimed": sum(c["status"] in ("proof", "attested") for c in bools),
            "proof": sum(c["status"] == "proof" for c in bools),
            "unsupported": sum(c["status"] == "unsupported" for c in bools),
            "verified": sum(bool(c.get("verified")) for c in bools),
            "disputed": sum(bool(c.get("disputed")) for c in bools),
        }

        slug = raw.get("wallet-name") or base[:-5]   # file name without .yaml
        wallets.append({
            "slug": slug,
            "name": raw.get("name", slug),
            "website": raw.get("website"),
            "contact": raw.get("contact"),
            "added": str(raw.get("added")) if raw.get("added") else None,
            "source_url": to_url(f"wallets/{base}"),
            "features": claims,
            "counts": counts,
        })

    # Same order as WALLET_DIRECTORY.md: date added, then name.
    wallets.sort(key=lambda w: (w["added"] or "9999-99-99", w["name"].lower()))
    return wallets


def source_commit(src):
    """Short commit hash of the wallets checkout, or None if unavailable."""
    try:
        out = subprocess.run(["git", "-C", src, "rev-parse", "--short", "HEAD"],
                             capture_output=True, text=True, check=True)
        return out.stdout.strip()
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--src", default="_wallets_src", help="path to a canton-foundation/wallets checkout")
    parser.add_argument("--out", default="data.json", help="where to write the JSON")
    args = parser.parse_args()

    features = load_registry(args.src)
    wallets = load_wallets(args.src, features)

    data = {
        # Build metadata shown in the site footer.
        "generated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "source_repo": REPO_URL,
        "source_commit": source_commit(args.src),
        "features": features,
        "wallets": wallets,
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Wrote {args.out}: {len(wallets)} wallets, {len(features)} features")


if __name__ == "__main__":
    main()
