// Package registry is the HTTP client for the atoms.convergent-systems.co
// catalog-of-catalogs. It fetches signed TOML atoms and parses them into
// typed Go structs.
package registry

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/BurntSushi/toml"
)

const defaultRegistryURL = "https://atoms.convergent-systems.co"

// Client fetches signed atoms from the umbrella registry.
type Client struct {
	BaseURL    string
	HTTPClient *http.Client
}

// NewClient returns a Client configured from ATOMS_REGISTRY_URL or the
// default https://atoms.convergent-systems.co. HTTP timeout is 10s.
func NewClient() *Client {
	base := os.Getenv("ATOMS_REGISTRY_URL")
	if base == "" {
		base = defaultRegistryURL
	}
	base = strings.TrimRight(base, "/")
	return &Client{
		BaseURL:    base,
		HTTPClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// fetch performs a GET against the registry, returning the raw body.
func (c *Client) fetch(ctx context.Context, path string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+path, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET %s: HTTP %d", path, resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}

// CatalogsIndex fetches /catalogs/index.toml.
func (c *Client) CatalogsIndex(ctx context.Context) (*CatalogsIndexAtom, error) {
	raw, err := c.fetch(ctx, "/catalogs/index.toml")
	if err != nil {
		return nil, err
	}
	var idx CatalogsIndexAtom
	if err := toml.Unmarshal(raw, &idx); err != nil {
		return nil, fmt.Errorf("parse /catalogs/index.toml: %w", err)
	}
	return &idx, nil
}

// CatalogEntry fetches /catalogs/<name>.toml. Returns the parsed atom
// plus the raw bytes (useful for verification).
func (c *Client) CatalogEntry(ctx context.Context, name string) (*CatalogAtom, []byte, error) {
	path := "/catalogs/" + name + ".toml"
	raw, err := c.fetch(ctx, path)
	if err != nil {
		return nil, nil, err
	}
	var atom CatalogAtom
	if err := toml.Unmarshal(raw, &atom); err != nil {
		return nil, nil, fmt.Errorf("parse %s: %w", path, err)
	}
	atom.BodyRaw = extractBody(string(raw))
	return &atom, raw, nil
}

// Spec fetches /spec/atom-spec.toml.
func (c *Client) Spec(ctx context.Context) (*SpecAtom, error) {
	raw, err := c.fetch(ctx, "/spec/atom-spec.toml")
	if err != nil {
		return nil, err
	}
	var s SpecAtom
	if err := toml.Unmarshal(raw, &s); err != nil {
		return nil, fmt.Errorf("parse /spec/atom-spec.toml: %w", err)
	}
	return &s, nil
}

// RootKey fetches /keys/root.toml.
func (c *Client) RootKey(ctx context.Context) (*RootKeyAtom, error) {
	raw, err := c.fetch(ctx, "/keys/root.toml")
	if err != nil {
		return nil, err
	}
	var r RootKeyAtom
	if err := toml.Unmarshal(raw, &r); err != nil {
		return nil, fmt.Errorf("parse /keys/root.toml: %w", err)
	}
	return &r, nil
}

// extractBody returns the [body] section of a TOML atom as a string
// (everything from the first [body] header to end of input). Used to
// render the body verbatim without re-canonicalizing.
func extractBody(raw string) string {
	idx := strings.Index(raw, "\n[body]\n")
	if idx == -1 {
		idx = strings.Index(raw, "[body]\n")
		if idx == -1 {
			return ""
		}
	}
	return strings.TrimLeft(raw[idx:], "\n")
}
