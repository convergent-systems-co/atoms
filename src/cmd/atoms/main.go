// Package main is the atoms CLI entry point.
//
// Per GOALS.md, the atoms CLI mirrors the *-atoms.com command surface:
// `atoms brand`, `atoms theme`, ... enabling search, list, download,
// and convert operations against the live ecosystem.
//
// This is the slice-3 placeholder. The CLI itself is implemented in
// slice 4 (see CHANGELOG.md and GOALS.md).
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
)

// Build-time variables, set by goreleaser via -ldflags.
var (
	version = "dev"
	commit  = "none"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := run(ctx); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(ctx context.Context) error {
	fmt.Printf("atoms %s (%s) — CLI implementation pending (slice 4)\n", version, commit)
	fmt.Println("see https://github.com/convergent-systems-co/atoms/blob/main/GOALS.md")
	<-ctx.Done()
	if err := ctx.Err(); err != nil && err != context.Canceled {
		return err
	}
	return nil
}
