package cli

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/convergent-systems-co/atoms/src/internal/registry"
)

// attachCatalogCommands fetches /catalogs/index.toml and adds one
// top-level subcommand per registered catalog. Catalog name is
// stripped of the "-atoms" suffix per GOALS (`atoms brand`, not
// `atoms brand-atoms`). Each catalog command has `list` and `show`
// children. Failures are reported by the returned error and should be
// swallowed by the caller — they should not block static commands.
func attachCatalogCommands(root *cobra.Command) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	c := registry.NewClient()
	idx, err := c.CatalogsIndex(ctx)
	if err != nil {
		return err
	}
	for _, entry := range idx.Body.Catalogs {
		root.AddCommand(newCatalogCmd(entry))
	}
	return nil
}

func newCatalogCmd(entry registry.CatalogIndexEntry) *cobra.Command {
	short := strings.TrimSuffix(entry.Name, "-atoms")
	c := &cobra.Command{
		Use:   short,
		Short: fmt.Sprintf("Operate on %s (%s).", entry.Name, entry.CanonicalDomain),
		Long: fmt.Sprintf(`Subcommands for the %s catalog.

Registry entry: https://atoms.convergent-systems.co%s
Canonical domain: %s
GitHub: https://github.com/convergent-systems-co/%s`, entry.Name, entry.URL, entry.CanonicalDomain, entry.Name),
	}
	c.AddCommand(newCatalogListCmd(entry))
	c.AddCommand(newCatalogShowRegistryCmd(entry))
	return c
}

func newCatalogListCmd(entry registry.CatalogIndexEntry) *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: fmt.Sprintf("List atoms in %s (live catalog endpoint).", entry.Name),
		RunE: func(cmd *cobra.Command, args []string) error {
			// Without a live <catalog>.com deploy yet, every catalog is bootstrap.
			// Surface that honestly with a useful pointer.
			fmt.Fprintf(cmd.OutOrStdout(),
				`%s is in bootstrap status — its canonical domain (%s) is not
yet serving atoms. To browse the registry entry instead:

  atoms catalogs show %s

To inspect the catalog's source:

  https://github.com/convergent-systems-co/%s
`,
				entry.Name, entry.CanonicalDomain, entry.Name, entry.Name,
			)
			return nil
		},
	}
}

func newCatalogShowRegistryCmd(entry registry.CatalogIndexEntry) *cobra.Command {
	return &cobra.Command{
		Use:   "registry",
		Short: "Show the umbrella's registry entry for this catalog.",
		RunE: func(cmd *cobra.Command, args []string) error {
			c := registry.NewClient()
			atom, _, err := c.CatalogEntry(cmd.Context(), entry.Name)
			if err != nil {
				return err
			}
			fmt.Fprintf(cmd.OutOrStdout(), "canonical_name: %s\nversion:        %s\ncreated_at:     %s\n\n%s\n",
				atom.CanonicalName, atom.Version, atom.CreatedAt, atom.BodyRaw)
			return nil
		},
	}
}
