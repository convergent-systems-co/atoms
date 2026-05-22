package cli

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/convergent-systems-co/atoms/src/internal/registry"
)

func newKeysCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "keys",
		Short: "Show the umbrella's trust roots.",
		Long: `Fetches /keys/root.toml from the umbrella registry and prints
the root signing key's fingerprint, role, status, and public material.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			c := registry.NewClient()
			root, err := c.RootKey(cmd.Context())
			if err != nil {
				return fmt.Errorf("fetch /keys/root.toml: %w", err)
			}
			out := cmd.OutOrStdout()
			fmt.Fprintln(out, "Root key (atoms.convergent-systems.co):")
			fmt.Fprintf(out, "  fingerprint:        %s\n", root.Body.Fingerprint)
			fmt.Fprintf(out, "  role:               %s\n", root.Body.Role)
			fmt.Fprintf(out, "  status:             %s\n", root.Body.Status)
			fmt.Fprintf(out, "  authority:          %s\n", root.Body.Authority)
			fmt.Fprintf(out, "  public_key_base64:  %s\n", root.Body.PublicKeyBase64)
			return nil
		},
	}
}
