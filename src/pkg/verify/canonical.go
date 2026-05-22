// Package verify implements canonical TOML serialization + Ed25519
// signature verification for atoms.convergent-systems.co atoms,
// matching scripts/lib/canonical-toml.mjs byte-for-byte.
//
// Canonical form rules (Spec §6):
//   - Identity fields emitted in a fixed order (see identityOrder).
//   - All other tables/keys sorted alphabetically at every level.
//   - No comments. LF line endings. UTF-8.
//   - Strings: multi-line basic string when value contains a newline;
//     basic string otherwise (escape \, ", \t, \r, \n).
//   - Inline arrays of scalars; one [[body.<k>]] block per entry for
//     arrays of tables.
//   - [signatures] EXCLUDED from canonical form (Spec §6).
package verify

import (
	"fmt"
	"sort"
	"strings"

	"github.com/BurntSushi/toml"
)

var identityOrder = []string{
	"spec_version",
	"canonical_name",
	"version",
	"atom_type",
	"authored_by",
	"signed_by",
	"created_at",
	"dependencies",
}

// Canonicalize parses raw TOML and emits its canonical form. The
// [signatures] section is excluded — this is the form that gets
// SHA-256'd and signed.
func Canonicalize(raw []byte) (string, error) {
	var atom map[string]interface{}
	if err := toml.Unmarshal(raw, &atom); err != nil {
		return "", fmt.Errorf("parse: %w", err)
	}
	return canonicalizeMap(atom), nil
}

func canonicalizeMap(atom map[string]interface{}) string {
	var lines []string

	// Identity fields in fixed order.
	for _, k := range identityOrder {
		v, ok := atom[k]
		if !ok || v == nil {
			continue
		}
		lines = append(lines, fmt.Sprintf("%s = %s", k, renderValue(v)))
	}

	// Other top-level fields (not identity, not body, not signatures), sorted.
	var otherKeys []string
	for k := range atom {
		if k == "body" || k == "signatures" {
			continue
		}
		if inIdentity(k) {
			continue
		}
		otherKeys = append(otherKeys, k)
	}
	sort.Strings(otherKeys)
	for _, k := range otherKeys {
		lines = append(lines, fmt.Sprintf("%s = %s", k, renderValue(atom[k])))
	}

	// Body, if present.
	if body, ok := atom["body"].(map[string]interface{}); ok {
		lines = append(lines, "")
		lines = append(lines, "[body]")
		lines = append(lines, renderTable(body, "body")...)
	}

	return strings.Join(lines, "\n") + "\n"
}

func inIdentity(k string) bool {
	for _, id := range identityOrder {
		if id == k {
			return true
		}
	}
	return false
}

// renderTable returns the lines for a single TOML table, sorted with
// scalars/arrays first, then nested tables, then table arrays. parent
// is the dotted path used to prefix [parent.k] / [[parent.k]] headers.
func renderTable(tbl map[string]interface{}, parent string) []string {
	var keys []string
	for k := range tbl {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var scalars, tables, tableArrays []string
	for _, k := range keys {
		switch {
		case isTable(tbl[k]):
			tables = append(tables, k)
		case isTableArray(tbl[k]):
			tableArrays = append(tableArrays, k)
		default:
			scalars = append(scalars, k)
		}
	}

	var out []string
	for _, k := range scalars {
		out = append(out, fmt.Sprintf("%s = %s", k, renderValue(tbl[k])))
	}
	for _, k := range tables {
		out = append(out, "")
		out = append(out, fmt.Sprintf("[%s.%s]", parent, k))
		out = append(out, renderTable(tbl[k].(map[string]interface{}), parent+"."+k)...)
	}
	for _, k := range tableArrays {
		entries := tbl[k].([]map[string]interface{})
		for _, entry := range entries {
			out = append(out, "")
			out = append(out, fmt.Sprintf("[[%s.%s]]", parent, k))
			out = append(out, renderTable(entry, parent+"."+k)...)
		}
	}
	return out
}

func isTable(v interface{}) bool {
	_, ok := v.(map[string]interface{})
	return ok
}

func isTableArray(v interface{}) bool {
	arr, ok := v.([]map[string]interface{})
	return ok && len(arr) > 0
}

// renderValue emits a TOML literal matching the JS canonicalizer.
func renderValue(v interface{}) string {
	switch x := v.(type) {
	case string:
		return renderString(x)
	case bool:
		if x {
			return "true"
		}
		return "false"
	case int64:
		return fmt.Sprintf("%d", x)
	case float64:
		// BurntSushi may decode small integers as float64 only if written that
		// way. Detect integers-as-float and emit without trailing zeros.
		if x == float64(int64(x)) {
			return fmt.Sprintf("%d", int64(x))
		}
		return fmt.Sprintf("%g", x)
	case []interface{}:
		parts := make([]string, len(x))
		for i, e := range x {
			parts[i] = renderValue(e)
		}
		return "[" + strings.Join(parts, ", ") + "]"
	case []string:
		parts := make([]string, len(x))
		for i, e := range x {
			parts[i] = renderString(e)
		}
		return "[" + strings.Join(parts, ", ") + "]"
	}
	return fmt.Sprintf("%v", v)
}

func renderString(s string) string {
	if strings.Contains(s, "\n") {
		safe := strings.ReplaceAll(s, `\`, `\\`)
		safe = strings.ReplaceAll(safe, `"""`, `\"\"\"`)
		return "\"\"\"\n" + safe + "\"\"\""
	}
	// Basic string. Escape order matters: backslash first.
	r := strings.NewReplacer(
		`\`, `\\`,
		`"`, `\"`,
		"\t", `\t`,
		"\r", `\r`,
		"\n", `\n`,
	)
	return `"` + r.Replace(s) + `"`
}
