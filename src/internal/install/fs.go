// fs.go — filesystem and HTTP transport helpers for atom installation.
//
// Security note: atomExtractTarGz enforces a prefix check on every
// tar entry so that a crafted archive cannot write outside destDir
// (directory-traversal protection).
package install

import (
	"archive/tar"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// DownloadToFile streams the response body of url into dst.
// Returns an error if the HTTP status is not 2xx.
func DownloadToFile(url string, dst *os.File) error {
	resp, err := http.Get(url) //nolint:noctx // CLI tool; context threading out of scope for MVP
	if err != nil {
		return fmt.Errorf("HTTP GET: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("HTTP %d from %s", resp.StatusCode, url)
	}
	if _, err := io.Copy(dst, resp.Body); err != nil {
		return fmt.Errorf("stream response body: %w", err)
	}
	return nil
}

// SHA256OfFile returns the hex-encoded SHA256 of the file at path.
func SHA256OfFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// ExtractTarGz extracts the tar.gz at srcPath into destDir.
// Entries whose resolved path does not start with destDir are rejected
// (directory traversal protection).
func ExtractTarGz(srcPath, destDir string) error {
	f, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer f.Close()

	gz, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("open gzip: %w", err)
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("read tar entry: %w", err)
		}

		// Reject absolute paths and path traversal.
		clean := filepath.Clean(hdr.Name)
		if filepath.IsAbs(clean) || strings.HasPrefix(clean, "..") {
			return fmt.Errorf("tar entry %q is outside the extraction root", hdr.Name)
		}

		target := filepath.Join(destDir, clean)
		// Verify the resolved path is still under destDir.
		if !strings.HasPrefix(target, filepath.Clean(destDir)+string(os.PathSeparator)) &&
			target != filepath.Clean(destDir) {
			return fmt.Errorf("tar entry %q would escape extraction root", hdr.Name)
		}

		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return fmt.Errorf("mkdir %q: %w", target, err)
			}
		case tar.TypeReg, tar.TypeRegA:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return fmt.Errorf("mkdir parent of %q: %w", target, err)
			}
			out, err := os.Create(target)
			if err != nil {
				return fmt.Errorf("create %q: %w", target, err)
			}
			if _, err := io.Copy(out, tr); err != nil {
				out.Close() //nolint:errcheck
				return fmt.Errorf("write %q: %w", target, err)
			}
			out.Close() //nolint:errcheck
		}
	}
	return nil
}

// FindAtomTOML searches destDir (one level deep) for atom.toml and
// returns its absolute path. The archive is expected to contain a
// single top-level directory (standard shape) or be a flat archive
// with atom.toml directly in destDir.
func FindAtomTOML(destDir string) (string, error) {
	entries, err := os.ReadDir(destDir)
	if err != nil {
		return "", err
	}
	// Search directly in destDir first (flat archives).
	direct := filepath.Join(destDir, "atom.toml")
	if _, err := os.Stat(direct); err == nil {
		return direct, nil
	}
	// Search one level deep (standard: single top-level dir).
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		candidate := filepath.Join(destDir, e.Name(), "atom.toml")
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("no atom.toml found in extracted archive under %q", destDir)
}

// CopyDir copies the directory tree at src to dst, creating dst if needed.
func CopyDir(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		return CopyFile(path, target)
	})
}

// CopyFile copies the file at src to dst.
func CopyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}
