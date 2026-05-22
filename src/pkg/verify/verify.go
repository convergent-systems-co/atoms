package verify

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"fmt"

	"github.com/BurntSushi/toml"
)

// Result is the outcome of a signature verification.
type Result struct {
	Valid               bool
	KeyID               string // "ed25519:<fingerprint>" of the signer found in [signatures]
	CanonicalHashBase64 string // base64 of SHA-256(canonical TOML)
}

// Atom recanonicalizes the supplied signed atom, computes its
// canonical SHA-256 hash, and verifies the Ed25519 signature stored
// in its [signatures] table against the supplied 32-byte raw public
// key.
//
// Returns Valid=true when the signature verifies. The KeyID and
// CanonicalHashBase64 fields are always populated so the caller can
// surface them on failure.
func Atom(raw, publicKey []byte) (Result, error) {
	canonical, err := Canonicalize(raw)
	if err != nil {
		return Result{}, err
	}
	hash := sha256.Sum256([]byte(canonical))
	hashB64 := base64.StdEncoding.EncodeToString(hash[:])

	// Parse [signatures] to find the signer's keyID + base64 signature.
	var atom struct {
		Signatures map[string]string `toml:"signatures"`
	}
	if err := toml.Unmarshal(raw, &atom); err != nil {
		return Result{CanonicalHashBase64: hashB64}, fmt.Errorf("parse signatures: %w", err)
	}
	if len(atom.Signatures) == 0 {
		return Result{CanonicalHashBase64: hashB64}, fmt.Errorf("no [signatures] in atom")
	}

	// Use the first signer. (Atoms in this slice carry exactly one.)
	var keyID, sigB64 string
	for k, v := range atom.Signatures {
		keyID, sigB64 = k, v
		break
	}

	sig, err := base64.StdEncoding.DecodeString(sigB64)
	if err != nil {
		return Result{KeyID: keyID, CanonicalHashBase64: hashB64}, fmt.Errorf("decode signature: %w", err)
	}

	if len(publicKey) != ed25519.PublicKeySize {
		return Result{KeyID: keyID, CanonicalHashBase64: hashB64},
			fmt.Errorf("public key wrong length: want %d, got %d", ed25519.PublicKeySize, len(publicKey))
	}

	valid := ed25519.Verify(ed25519.PublicKey(publicKey), hash[:], sig)
	return Result{
		Valid:               valid,
		KeyID:               keyID,
		CanonicalHashBase64: hashB64,
	}, nil
}
