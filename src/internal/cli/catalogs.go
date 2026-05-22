package cli

import (
	"fmt"
	"text/tabwriter"

	"github.com/spf13/cobra"

	"github.com/convergent-systems-co/atoms/src/internal/registry"
)

func newCatalogsCmd() *cobra.Command {
	c := &cobra.Command{
		Use:   "catalogs",
		Short: "List or show entries from the umbrella catalog registry.",
	}
	c.AddCommand(newCatalogsListCmd())
	c.AddCommand(newCatalogsShowCmd())
	c.RunE = newCatalogsListCmd().RunE // default to list
	return c
}

func newCatalogsListCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List all registered catalogs.",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := registry.NewClient()
			idx, err := c.CatalogsIndex(cmd.Context())
			if err != nil {
				return fmt.Errorf("fetch /catalogs/index.toml: %w", err)
			}
			tw := tabwriter.NewWriter(cmd.OutOrStdout(), 0, 0, 2, ' ', 0)
			fmt.Fprintln(tw, "NAME\tVERSION\tDOMAIN\tURL")
			for _, c := range idx.Body.Catalogs {
				fmt.Fprintf(tw, "%s\t%s\t%s\t%s\n", c.Name, c.Version, c.CanonicalDomain, c.URL)
			}
			return tw.Flush()
		},
	}
}

func newCatalogsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "show <name>",
		Short: "Show a single catalog's signed registry entry.",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			c := registry.NewClient()
			atom, raw, err := c.CatalogEntry(cmd.Context(), args[0])
			if err != nil {
				return err
			}
			out := cmd.OutOrStdout()
			fmt.Fprintf(out, "canonical_name:   %s\n", atom.CanonicalName)
			fmt.Fprintf(out, "version:          %s\n", atom.Version)
			fmt.Fprintf(out, "atom_type:        %s\n", atom.AtomType)
			fmt.Fprintf(out, "authored_by:      %s\n", atom.AuthoredBy)
			fmt.Fprintf(out, "created_at:       %s\n", atom.CreatedAt)
			for fp := range atom.Signatures {
				fmt.Fprintf(out, "signed_by:        %s\n", fp)
			}
			fmt.Fprintln(out, "")
			fmt.Fprintln(out, "[body]")
			fmt.Fprintln(out, atom.BodyRaw)
			_ = raw
			return nil
		},
	}
}
