// Canonical TOML serializer for atom-spec hashing.
//
// Canonical form rules (per Spec §6):
//   - Identity fields emitted in a fixed order (see IDENTITY_ORDER).
//   - All other tables/keys sorted alphabetically at every level.
//   - No comments. No trailing whitespace. LF line endings.
//   - Strings escaped via TOML basic-string rules. Multi-line bodies use """...""".
//   - Inline arrays of primitive values; one element per line for object arrays.
//   - [signatures] EXCLUDED from canonical form (the hash covers everything *but* signatures).

const IDENTITY_ORDER = [
  "spec_version",
  "canonical_name",
  "version",
  "atom_type",
  "authored_by",
  "signed_by",
  "created_at",
  "dependencies",
];

export function canonicalize(atom) {
  const lines = [];
  for (const key of IDENTITY_ORDER) {
    if (atom[key] === undefined || atom[key] === null) continue;
    lines.push(`${key} = ${renderValue(atom[key])}`);
  }
  // Any non-identity, non-body, non-signatures top-level fields, sorted.
  const otherTopKeys = Object.keys(atom)
    .filter((k) => !IDENTITY_ORDER.includes(k) && k !== "body" && k !== "signatures")
    .sort();
  for (const k of otherTopKeys) {
    lines.push(`${k} = ${renderValue(atom[k])}`);
  }
  if (atom.body) {
    lines.push("");
    lines.push("[body]");
    lines.push(...renderTable(atom.body));
  }
  return lines.join("\n") + "\n";
}

export function renderFinal(atom, signatures) {
  // Same as canonicalize, plus the [signatures] table inserted before [body].
  const lines = [];
  for (const key of IDENTITY_ORDER) {
    if (atom[key] === undefined || atom[key] === null) continue;
    lines.push(`${key} = ${renderValue(atom[key])}`);
  }
  const otherTopKeys = Object.keys(atom)
    .filter((k) => !IDENTITY_ORDER.includes(k) && k !== "body" && k !== "signatures")
    .sort();
  for (const k of otherTopKeys) {
    lines.push(`${k} = ${renderValue(atom[k])}`);
  }
  if (signatures && Object.keys(signatures).length > 0) {
    lines.push("");
    lines.push("[signatures]");
    for (const fp of Object.keys(signatures).sort()) {
      lines.push(`"${fp}" = ${renderValue(signatures[fp])}`);
    }
  }
  if (atom.body) {
    lines.push("");
    lines.push("[body]");
    lines.push(...renderTable(atom.body));
  }
  return lines.join("\n") + "\n";
}

function renderTable(tbl) {
  const out = [];
  const keys = Object.keys(tbl).sort();
  // Scalars and arrays first; nested tables and arrays-of-tables after.
  const scalars = keys.filter((k) => !isTable(tbl[k]) && !isTableArray(tbl[k]));
  const tables = keys.filter((k) => isTable(tbl[k]));
  const tableArrays = keys.filter((k) => isTableArray(tbl[k]));
  for (const k of scalars) {
    out.push(`${k} = ${renderValue(tbl[k])}`);
  }
  for (const k of tables) {
    out.push("");
    out.push(`[body.${k}]`);
    out.push(...renderTable(tbl[k]).map((line) => line));
  }
  for (const k of tableArrays) {
    for (const entry of tbl[k]) {
      out.push("");
      out.push(`[[body.${k}]]`);
      out.push(...renderTable(entry));
    }
  }
  return out;
}

function isTable(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isTableArray(v) {
  return Array.isArray(v) && v.length > 0 && isTable(v[0]);
}

function renderValue(v) {
  if (typeof v === "string") return renderString(v);
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    return "[" + v.map(renderValue).join(", ") + "]";
  }
  if (v && typeof v === "object") {
    // Inline table fallback (rare in our atoms).
    const inner = Object.keys(v)
      .sort()
      .map((k) => `${k} = ${renderValue(v[k])}`)
      .join(", ");
    return `{ ${inner} }`;
  }
  throw new Error(`unrenderable value: ${typeof v}`);
}

function renderString(s) {
  // Prefer multi-line basic string for any value containing a newline.
  if (s.includes("\n")) {
    const safe = s.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
    return `"""\n${safe}"""`;
  }
  // Basic string: escape \, ", control chars.
  const escaped = s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
  return `"${escaped}"`;
}
