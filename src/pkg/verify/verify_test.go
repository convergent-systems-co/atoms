package verify

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// rootKeyBase64 is the umbrella root key's raw 32-byte public material
// (base64). Sourced from keys/root.toml in this repo. Hard-coded so
// the test stays self-contained.
const rootKeyBase64 = "1UZtIKkLRMM8PAfvTKHuMvoIE1KVcZ9AjbVk9Bdtrs0="

func rootPublicKey(t *testing.T) []byte {
	t.Helper()
	k, err := base64.StdEncoding.DecodeString(rootKeyBase64)
	if err != nil {
		t.Fatalf("decode root key: %v", err)
	}
	return k
}

func repoRoot(t *testing.T) string {
	t.Helper()
	// Tests run with cwd = src/pkg/verify; root is three levels up.
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	return filepath.Join(wd, "..", "..", "..")
}

// TestVerifyLiveAtoms verifies every committed signed atom against the
// hard-coded root key. If this passes, the Go canonicalizer matches the
// Node canonicalizer byte-for-byte for every atom we publish.
func TestVerifyLiveAtoms(t *testing.T) {
	root := repoRoot(t)
	pubKey := rootPublicKey(t)

	cases := []string{
		"spec/atom-spec.toml",
		"spec/atom-spec@1.0.0.toml",
		"spec/index.toml",
		"catalogs/index.toml",
		"keys/root.toml",
		"keys/index.toml",
		"keys.toml",
	}
	// Plus every catalog entry.
	entries, err := os.ReadDir(filepath.Join(root, "catalogs"))
	if err != nil {
		t.Fatalf("read catalogs/: %v", err)
	}
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".toml") || e.Name() == "index.toml" {
			continue
		}
		cases = append(cases, "catalogs/"+e.Name())
	}

	for _, rel := range cases {
		t.Run(rel, func(t *testing.T) {
			raw, err := os.ReadFile(filepath.Join(root, rel))
			if err != nil {
				t.Fatalf("read %s: %v", rel, err)
			}
			result, err := Atom(raw, pubKey)
			if err != nil {
				t.Fatalf("verify %s: %v", rel, err)
			}
			if !result.Valid {
				t.Errorf("%s: signature INVALID (hash=%s, signer=%s)", rel, result.CanonicalHashBase64, result.KeyID)
			}
		})
	}
}

// TestVerifyRejectsTamperedAtom flips one byte in a known-good atom
// and confirms verification fails.
func TestVerifyRejectsTamperedAtom(t *testing.T) {
	root := repoRoot(t)
	pubKey := rootPublicKey(t)

	raw, err := os.ReadFile(filepath.Join(root, "catalogs/prompt-atoms.toml"))
	if err != nil {
		t.Fatalf("read prompt-atoms.toml: %v", err)
	}
	// Replace "prompt-atoms" with "prompt-fakes" in the body. Same length,
	// stays-parseable TOML, but changes the canonical hash.
	tampered := strings.Replace(string(raw), "prompt-atoms.com", "prompt-fakes.com", 1)
	if tampered == string(raw) {
		t.Fatal("no replacement happened — test is broken")
	}
	result, err := Atom([]byte(tampered), pubKey)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if result.Valid {
		t.Error("tampered atom verified as VALID — should be INVALID")
	}
}
