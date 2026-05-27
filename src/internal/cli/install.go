// install.go — atoms fetch, list, fork, publish, gc commands.
//
// These commands implement the atom lifecycle management surface:
// downloading, inspecting, forking, and publishing constitution atoms
// (tar.gz bundles containing an atom.toml manifest plus content files).
//
// Migrated from convergent-systems-co/aiConstitution where they were
// incorrectly scoped. The atoms binary is the canonical home for atom
// lifecycle management.
//
// Cache root: ~/.atoms/ (override: $ATOMS_CACHE_DIR).
// Index:      ~/.atoms/atoms.json
//
// Design notes:
//   - All filesystem roots resolve through install.CacheDir() so tests
//     can redirect via $ATOMS_CACHE_DIR.
//   - HTTP downloads go to os.CreateTemp so there is no persistent temp
//     file on error paths.
//   - Tar.gz extraction enforces a path-prefix check to prevent directory
//     traversal.
//   - verify-cache is distinct from the existing `atoms verify` command
//     (which does Ed25519 signature verification).
package cli

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"text/tabwriter"

	"github.com/convergent-systems-co/atoms/src/internal/install"
	"github.com/spf13/cobra"
)

// ---- fetch -------------------------------------------------------------------

func newFetchCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "fetch <url-or-id>",
		Short: "Download and extract a constitution atom (tar.gz) to ~/.atoms/",
		Long: `fetch downloads a constitution atom archive from a URL and installs it
into the local cache at ~/.atoms/<name>/.

The archive must contain an atom.toml with at minimum:
  name     — kebab-case atom name
  version  — SemVer string

If atom.toml includes a sha256 field the downloaded archive is checked
against it; a mismatch aborts the install.

The local index at ~/.atoms/atoms.json is updated on success.

Override the cache root with $ATOMS_CACHE_DIR.`,
		Args: cobra.ExactArgs(1),
		RunE: runFetch,
	}
}

func runFetch(cmd *cobra.Command, args []string) error {
	rawArg := args[0]

	// Resolve to a URL. If the arg looks like a URL (contains "://") use it
	// directly. Otherwise treat it as "name@version" and return a helpful error
	// since catalog resolution is not yet implemented.
	var downloadURL string
	if strings.Contains(rawArg, "://") {
		downloadURL = rawArg
	} else {
		return fmt.Errorf("atom ID %q: catalog resolution not yet supported — pass a full URL (https://... or file://...)", rawArg)
	}

	// Download to a temporary file so we can stream-hash it.
	tmp, err := os.CreateTemp("", "atoms-fetch-*.tar.gz")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName) //nolint:errcheck

	if err := install.DownloadToFile(downloadURL, tmp); err != nil {
		tmp.Close() //nolint:errcheck
		return fmt.Errorf("fetch %q: %w", downloadURL, err)
	}
	tmp.Close() //nolint:errcheck

	// Compute SHA256 of the downloaded archive.
	downloadedSHA, err := install.SHA256OfFile(tmpName)
	if err != nil {
		return fmt.Errorf("hash downloaded file: %w", err)
	}

	// Extract the archive to a staging directory under ~/.atoms/.
	// We first extract to a temp-named dir so we can read atom.toml before
	// deciding the final destination name.
	cacheRoot := install.CacheDir()
	if err := os.MkdirAll(cacheRoot, 0755); err != nil {
		return fmt.Errorf("create cache root: %w", err)
	}
	stageDir, err := os.MkdirTemp(cacheRoot, ".staging-*")
	if err != nil {
		return fmt.Errorf("create staging dir: %w", err)
	}
	// Clean up staging dir on error.
	staged := false
	defer func() {
		if !staged {
			os.RemoveAll(stageDir) //nolint:errcheck
		}
	}()

	if err := install.ExtractTarGz(tmpName, stageDir); err != nil {
		return fmt.Errorf("extract atom archive: %w", err)
	}

	// Find atom.toml. The archive is expected to contain a single top-level
	// directory whose name matches the atom name.
	tomlPath, err := install.FindAtomTOML(stageDir)
	if err != nil {
		return fmt.Errorf("atom.toml not found in archive: %w", err)
	}

	manifest, err := install.ParseAtomTOML(tomlPath)
	if err != nil {
		return fmt.Errorf("parse atom.toml: %w", err)
	}

	// Validate name and version fields.
	if manifest.Name == "" {
		return fmt.Errorf("atom.toml missing required field: name")
	}
	if manifest.Version == "" {
		return fmt.Errorf("atom.toml missing required field: version")
	}

	// Verify SHA256 if the manifest provides one.
	if manifest.SHA256 != "" && manifest.SHA256 != downloadedSHA {
		return fmt.Errorf("hash mismatch — expected %s, got %s. Aborting", manifest.SHA256, downloadedSHA)
	}

	// Determine the directory that contains atom.toml. When the archive
	// wraps everything in a single top-level directory (the common case),
	// tomlPath is stageDir/<subdir>/atom.toml and we should move <subdir>,
	// not stageDir itself.
	tomlDir := filepath.Dir(tomlPath)
	var moveFrom string
	if tomlDir == stageDir {
		// Flat archive: atom.toml is directly in the staging root.
		moveFrom = stageDir
	} else {
		// Standard archive: atom.toml is in a subdirectory of the staging root.
		moveFrom = tomlDir
	}

	// Move to final destination ~/.atoms/<name>/.
	destDir := filepath.Join(cacheRoot, manifest.Name)
	// Remove any prior installation of this atom at the destination.
	if err := os.RemoveAll(destDir); err != nil {
		return fmt.Errorf("clear existing atom dir: %w", err)
	}
	if err := os.Rename(moveFrom, destDir); err != nil {
		// Rename across filesystems can fail — fall back to copy+delete.
		if cpErr := install.CopyDir(moveFrom, destDir); cpErr != nil {
			return fmt.Errorf("install atom dir: %w (rename failed: %v)", cpErr, err)
		}
		os.RemoveAll(moveFrom) //nolint:errcheck
	}
	// When moveFrom is a subdirectory of stageDir, the parent staging dir
	// remains as an empty directory after the rename. Clean it up explicitly
	// so we do not leave orphaned .staging-* dirs under cacheRoot.
	if moveFrom != stageDir {
		os.RemoveAll(stageDir) //nolint:errcheck // best-effort; errors are non-fatal
	}
	staged = true // moveFrom is gone; stageDir (if different) was just cleaned up.

	// Update atoms.json index.
	indexPath := filepath.Join(cacheRoot, "atoms.json")
	entry := install.AtomsIndexEntry{
		Name:     manifest.Name,
		Version:  manifest.Version,
		Path:     destDir,
		Upstream: manifest.UpstreamURL,
	}
	if err := install.UpdateAtomsIndex(indexPath, entry); err != nil {
		return fmt.Errorf("update atoms index: %w", err)
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Fetched %s@%s → %s\n", manifest.Name, manifest.Version, destDir) //nolint:errcheck
	return nil
}

// ---- list -------------------------------------------------------------------

func newListCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List installed atoms",
		Args:  cobra.NoArgs,
		RunE:  runList,
	}
}

func runList(cmd *cobra.Command, _ []string) error {
	indexPath := filepath.Join(install.CacheDir(), "atoms.json")
	entries, err := install.ReadAtomsIndex(indexPath)
	if err != nil {
		return fmt.Errorf("read atoms index: %w", err)
	}

	out := cmd.OutOrStdout()
	if len(entries) == 0 {
		fmt.Fprintln(out, "(no atoms installed)") //nolint:errcheck
		return nil
	}

	// Aligned table via tabwriter.
	tw := tabwriter.NewWriter(out, 0, 0, 2, ' ', 0)
	fmt.Fprintln(tw, "NAME\tVERSION\tUPSTREAM\tPATH") //nolint:errcheck
	for _, e := range entries {
		fmt.Fprintf(tw, "%s\t%s\t%s\t%s\n", e.Name, e.Version, e.Upstream, e.Path) //nolint:errcheck
	}
	return tw.Flush()
}

// ---- fork -------------------------------------------------------------------

func newForkCmd() *cobra.Command {
	var asName string
	c := &cobra.Command{
		Use:   "fork <atom-name>",
		Short: "Fork an installed atom to a local copy for customization",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runFork(cmd, args[0], asName)
		},
	}
	c.Flags().StringVar(&asName, "as", "", "local name for the fork (default: <name>-local)")
	return c
}

func runFork(cmd *cobra.Command, name, asName string) error {
	if asName == "" {
		asName = name + "-local"
	}

	cacheRoot := install.CacheDir()
	srcDir := filepath.Join(cacheRoot, name)
	dstDir := filepath.Join(cacheRoot, asName)

	// Source must exist.
	if _, err := os.Stat(srcDir); os.IsNotExist(err) {
		return fmt.Errorf("atom %q not installed — run `atoms fetch` first", name)
	}

	// Read the source manifest to capture the upstream_ref value.
	srcTOML := filepath.Join(srcDir, "atom.toml")
	manifest, err := install.ParseAtomTOML(srcTOML)
	if err != nil {
		return fmt.Errorf("read source atom.toml: %w", err)
	}

	// Copy the directory.
	if err := os.RemoveAll(dstDir); err != nil {
		return fmt.Errorf("clear existing fork dir: %w", err)
	}
	if err := install.CopyDir(srcDir, dstDir); err != nil {
		return fmt.Errorf("copy atom dir: %w", err)
	}

	// Patch atom.toml in the fork: add upstream_ref, update name.
	forkManifest := manifest
	forkManifest.Name = asName
	forkManifest.UpstreamRef = name + "@" + manifest.Version
	dstTOML := filepath.Join(dstDir, "atom.toml")
	if err := install.WriteAtomTOML(dstTOML, forkManifest); err != nil {
		return fmt.Errorf("write forked atom.toml: %w", err)
	}

	// Update atoms.json index.
	indexPath := filepath.Join(cacheRoot, "atoms.json")
	entry := install.AtomsIndexEntry{
		Name:     asName,
		Version:  manifest.Version,
		Path:     dstDir,
		Upstream: manifest.UpstreamURL,
	}
	if err := install.UpdateAtomsIndex(indexPath, entry); err != nil {
		return fmt.Errorf("update atoms index: %w", err)
	}

	fmt.Fprintf(cmd.OutOrStdout(), //nolint:errcheck
		"Forked %s → %s. Edit %s and run atoms publish.\n",
		name, asName, dstDir)
	return nil
}

// ---- publish ----------------------------------------------------------------

func newPublishCmd() *cobra.Command {
	var atomName, atomVersion string
	var dryRun bool
	c := &cobra.Command{
		Use:   "publish",
		Short: "Package ~/.atoms/ content as a constitution atom and (optionally) publish it",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runPublish(cmd, atomName, atomVersion, dryRun)
		},
	}
	c.Flags().StringVar(&atomName, "name", "", "atom name (required)")
	c.Flags().StringVar(&atomVersion, "version", "", "atom version, e.g. 1.0.0 (required)")
	c.Flags().BoolVar(&dryRun, "dry-run", false, "preview without uploading")
	_ = c.MarkFlagRequired("name")
	_ = c.MarkFlagRequired("version")
	return c
}

func runPublish(cmd *cobra.Command, name, version string, dryRun bool) error {
	cacheRoot := install.CacheDir()

	// Walk cacheRoot excluding .git/ and the atoms index itself.
	// Hash all file contents to produce a combined SHA256.
	hasher := sha256.New()
	var fileList []string
	skipDirs := map[string]bool{".git": true}

	err := filepath.WalkDir(cacheRoot, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		rel, relErr := filepath.Rel(cacheRoot, path)
		if relErr != nil {
			return relErr
		}
		// Skip excluded top-level directories.
		topLevel := strings.SplitN(rel, string(filepath.Separator), 2)[0]
		if d.IsDir() && skipDirs[topLevel] {
			return filepath.SkipDir
		}
		if d.IsDir() {
			return nil
		}
		// Skip the index itself.
		if rel == "atoms.json" {
			return nil
		}
		// Hash this file's contents.
		data, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %q for hashing: %w", path, err)
		}
		hasher.Write(data)
		fileList = append(fileList, rel)
		return nil
	})
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("walk cache root for publish: %w", err)
	}

	combinedSHA := hex.EncodeToString(hasher.Sum(nil))
	fileCount := len(fileList)

	// Write / update atom.toml in a named sub-directory of the cache.
	atomDir := filepath.Join(cacheRoot, name)
	if err := os.MkdirAll(atomDir, 0755); err != nil {
		return fmt.Errorf("create atom dir: %w", err)
	}
	manifest := install.AtomManifest{
		Name:    name,
		Version: version,
		SHA256:  combinedSHA,
		Files:   fileList,
	}
	tomlPath := filepath.Join(atomDir, "atom.toml")
	if err := install.WriteAtomTOML(tomlPath, manifest); err != nil {
		return fmt.Errorf("write atom.toml: %w", err)
	}

	out := cmd.OutOrStdout()
	if dryRun {
		fmt.Fprintf(out, "Would publish: %s@%s (%d files, SHA256: %s)\n", name, version, fileCount, combinedSHA) //nolint:errcheck
		return nil
	}

	// Full publish is not yet implemented — inform the user.
	fmt.Fprintln(out, "Publishing not yet supported. Use --dry-run to preview.") //nolint:errcheck
	return nil
}

// ---- gc (stub) --------------------------------------------------------------

func newGCCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "gc",
		Short: "Garbage-collect unreferenced atom cache entries (stub)",
		RunE: func(cmd *cobra.Command, _ []string) error {
			fmt.Fprintln(cmd.ErrOrStderr(), "[atoms] gc: would walk caches and delete entries past gcUnusedDays AND unreferenced.") //nolint:errcheck
			return fmt.Errorf("atoms gc: not yet implemented")
		},
	}
}

// ---- verify-cache (stub) ----------------------------------------------------
//
// Named verify-cache to distinguish it from the existing `atoms verify`
// command, which performs Ed25519 signature verification on atom manifests.

func newInstallVerifyCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "verify-cache",
		Short: "Verify SHA-256 content hashes of every cached atom (stub)",
		RunE: func(cmd *cobra.Command, _ []string) error {
			fmt.Fprintln(cmd.ErrOrStderr(), "[atoms] verify-cache: would re-hash every cache entry and compare to atom.toml sha256.") //nolint:errcheck
			return fmt.Errorf("atoms verify-cache: not yet implemented")
		},
	}
}
