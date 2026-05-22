package cli

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/convergent-systems-co/atoms/src/internal/registry"
	"github.com/convergent-systems-co/atoms/src/pkg/verify"
)

func newVerifyCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "verify <url-or-path>",
		Short: "Verify the Ed25519 signature on an atom.",
		Long: `Reads a signed atom from a local file or HTTPS URL, recomputes the
canonical hash (SHA-256 of canonical TOML with [signatures] removed),
and checks the signature against the umbrella root key at /keys/root.toml.

Examples:
  atoms verify https://atoms.convergent-systems.co/catalogs/prompt-atoms.toml
  atoms verify ./catalogs/prompt-atoms.toml`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			raw, err := readAtom(cmd.Context(), args[0])
			if err != nil {
				return err
			}

			c := registry.NewClient()
			root, err := c.RootKey(cmd.Context())
			if err != nil {
				return fmt.Errorf("fetch root key: %w", err)
			}
			pubKey, err := base64.StdEncoding.DecodeString(root.Body.PublicKeyBase64)
			if err != nil {
				return fmt.Errorf("decode root public key: %w", err)
			}

			result, err := verify.Atom(raw, pubKey)
			if err != nil {
				return fmt.Errorf("verify: %w", err)
			}
			out := cmd.OutOrStdout()
			if result.Valid {
				_, _ = fmt.Fprintf(out, "VALID — %s\n", args[0])
			} else {
				_, _ = fmt.Fprintf(out, "INVALID — %s\n", args[0])
			}
			_, _ = fmt.Fprintf(out, "  canonical hash (sha256-b64): %s\n", result.CanonicalHashBase64)
			_, _ = fmt.Fprintf(out, "  signed by:                   %s\n", result.KeyID)
			if !result.Valid {
				return fmt.Errorf("signature did not verify")
			}
			return nil
		},
	}
}

func readAtom(ctx context.Context, src string) ([]byte, error) {
	if strings.HasPrefix(src, "http://") || strings.HasPrefix(src, "https://") {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, src, nil)
		if err != nil {
			return nil, err
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer func() { _ = resp.Body.Close() }()
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("HTTP %d fetching %s", resp.StatusCode, src)
		}
		return io.ReadAll(resp.Body)
	}
	// User-supplied path is the expected input for the `atoms verify <path>`
	// invocation. Clean it to mitigate the most common path-traversal patterns
	// while still allowing arbitrary user-chosen paths.
	clean := filepath.Clean(src)
	return os.ReadFile(clean) //nolint:gosec // intentional — CLI accepts arbitrary user paths
}
