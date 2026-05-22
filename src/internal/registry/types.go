package registry

// Identity carries the universal atom identity fields per Spec §2.
type Identity struct {
	SpecVersion   string            `toml:"spec_version"`
	CanonicalName string            `toml:"canonical_name"`
	Version       string            `toml:"version"`
	AtomType      string            `toml:"atom_type"`
	AuthoredBy    string            `toml:"authored_by"`
	CreatedAt     string            `toml:"created_at"`
	Signatures    map[string]string `toml:"signatures"`
}

// CatalogIndexEntry is one row of /catalogs/index.toml's body.catalogs array.
type CatalogIndexEntry struct {
	Name            string `toml:"name"`
	Version         string `toml:"version"`
	CanonicalDomain string `toml:"canonical_domain"`
	URL             string `toml:"url"`
}

// CatalogsIndexAtom is /catalogs/index.toml.
type CatalogsIndexAtom struct {
	Identity
	Body struct {
		Class    string              `toml:"class"`
		Total    int                 `toml:"total"`
		Catalogs []CatalogIndexEntry `toml:"catalogs"`
	} `toml:"body"`
}

// CatalogAtom is /catalogs/<name>.toml.
type CatalogAtom struct {
	Identity
	// BodyRaw is the raw text of the [body] section, used for human display
	// without re-canonicalizing. Populated by the client after parse.
	BodyRaw string `toml:"-"`
	Body    struct {
		CatalogName      string   `toml:"catalog_name"`
		CatalogVersion   string   `toml:"catalog_version"`
		CanonicalDomain  string   `toml:"canonical_domain"`
		ImplementsSpec   string   `toml:"implements_spec"`
		Purpose          string   `toml:"purpose"`
		AtomTypes        []string `toml:"atom_types"`
		CompositionType  string   `toml:"composition_type"`
		CompositionDir   string   `toml:"composition_dir"`
		RuleTypes        []string `toml:"rule_types"`
		RuntimeConsumers []string `toml:"runtime_consumers"`
		License          string   `toml:"license"`
		PagesURL         string   `toml:"pages_url"`
		GithubURL        string   `toml:"github_url"`
		Federation       string   `toml:"federation"`
	} `toml:"body"`
}

// SpecAtom is /spec/atom-spec.toml.
type SpecAtom struct {
	Identity
	Body struct {
		Title       string `toml:"title"`
		Status      string `toml:"status"`
		MarkdownURL string `toml:"markdown_url"`
		Markdown    string `toml:"markdown"`
	} `toml:"body"`
}

// RootKeyAtom is /keys/root.toml.
type RootKeyAtom struct {
	Identity
	Body struct {
		Fingerprint     string `toml:"fingerprint"`
		PublicKeyBase64 string `toml:"public_key_base64"`
		PublicKeyPem    string `toml:"public_key_pem"`
		Role            string `toml:"role"`
		Status          string `toml:"status"`
		Authority       string `toml:"authority"`
	} `toml:"body"`
}
