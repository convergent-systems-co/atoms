package cli

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/convergent-systems-co/atoms/src/internal/registry"
)

func newSpecCmd() *cobra.Command {
	c := &cobra.Command{
		Use:   "spec",
		Short: "Fetch and print the Atom Spec.",
		Long: `Fetches /spec/atom-spec.toml from the umbrella registry and prints
the body's markdown to stdout. The Spec atom is signed by the root
key — use ` + "`atoms verify`" + ` to check.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			c := registry.NewClient()
			spec, err := c.Spec(cmd.Context())
			if err != nil {
				return fmt.Errorf("fetch /spec/atom-spec.toml: %w", err)
			}
			fmt.Fprintf(cmd.OutOrStdout(), "%s\n", spec.Body.Markdown)
			return nil
		},
	}
	return c
}
