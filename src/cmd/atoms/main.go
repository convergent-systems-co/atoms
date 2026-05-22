// Package main is the atoms CLI entry point.
//
// Subcommand structure mirrors the *-atoms catalogs registered at
// atoms.convergent-systems.co/catalogs/index.toml — `atoms brand`,
// `atoms theme`, `atoms prompt`, etc. — plus a small set of static
// commands (version, catalogs, spec, keys, verify) defined in
// src/internal/cli.
package main

import (
	"fmt"
	"os"

	"github.com/convergent-systems-co/atoms/src/internal/cli"
)

// Build-time variables, set by goreleaser via -ldflags.
var (
	version = "dev"
	commit  = "none"
)

func main() {
	if err := cli.Execute(version, commit); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
