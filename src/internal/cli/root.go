// Package cli wires the atoms CLI command tree.
package cli

import (
	"context"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
)

// Build-time metadata is injected from main via Execute().
var (
	buildVersion = "dev"
	buildCommit  = "none"
)

// Execute parses argv and runs the matching command. Returns nil on
// success or the underlying error on failure. Suitable for direct
// return from main().
func Execute(version, commit string) error {
	buildVersion = version
	buildCommit = commit

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	root := newRootCmd()
	return root.ExecuteContext(ctx)
}

func newRootCmd() *cobra.Command {
	root := &cobra.Command{
		Use:   "atoms",
		Short: "CLI for the *-atoms ecosystem catalog-of-catalogs.",
		Long: `atoms — discover, verify, and download from the *-atoms ecosystem.

The umbrella registry lives at https://atoms.convergent-systems.co.
Override with ATOMS_REGISTRY_URL.

Catalog-specific subcommands (atoms brand, atoms theme, ...) are
loaded dynamically from /catalogs/index.toml at startup.`,
		SilenceUsage:  true,
		SilenceErrors: true,
	}

	// Static commands.
	root.AddCommand(newVersionCmd())
	root.AddCommand(newCatalogsCmd())
	root.AddCommand(newSpecCmd())
	root.AddCommand(newKeysCmd())
	root.AddCommand(newVerifyCmd())

	// Dynamic per-catalog subcommands. Tolerate registry-unreachable so
	// `atoms --help` works offline; the per-catalog commands just won't
	// appear in the help output until the registry is reachable.
	if err := attachCatalogCommands(root); err != nil {
		// Suppress: a registry error here is not fatal for static commands.
		// The dynamic commands simply won't be available.
		_ = err
	}

	return root
}
