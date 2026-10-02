// Dev helper: deep-merges a patch {fr:{...}, ar:{...}, en:{...}} into messages/*.json
// and checks that all three languages end up with exactly the same keys.
// Usage: node scripts/i18n-merge.mjs patch.json   |   node scripts/i18n-merge.mjs --check
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const langs = ["fr", "ar", "en"];
const load = (l) => (existsSync(`messages/${l}.json`) ? JSON.parse(readFileSync(`messages/${l}.json`, "utf8")) : {});
const merge = (a, b) => {
  for (const [k, v] of Object.entries(b)) {
    a[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v;
  }
  return a;
};
const keys = (o, p = "") =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

const arg = process.argv[2];
const msgs = Object.fromEntries(langs.map((l) => [l, load(l)]));
if (arg && arg !== "--check") {
  const patch = JSON.parse(readFileSync(arg, "utf8"));
  for (const l of langs) if (patch[l]) merge(msgs[l], patch[l]);
  for (const l of langs) writeFileSync(`messages/${l}.json`, JSON.stringify(msgs[l], null, 2) + "\n");
}
const ref = new Set(keys(msgs.fr));
let ok = true;
for (const l of langs) {
  const ks = new Set(keys(msgs[l]));
  const missing = [...ref].filter((k) => !ks.has(k));
  const extra = [...ks].filter((k) => !ref.has(k));
  if (missing.length || extra.length) {
    ok = false;
    console.error(`${l}: missing ${missing.join(", ") || "-"} | extra ${extra.join(", ") || "-"}`);
  }
}
console.log(ok ? `messages OK (${ref.size} keys)` : "messages MISMATCH");
process.exit(ok ? 0 : 1);
