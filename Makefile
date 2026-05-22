# Defaults
GO        ?= go
GOFLAGS   ?= -trimpath
APP       ?= atoms
ENV       ?= prod

.PHONY: help build test lint fmt tidy tf-init tf-plan tf-apply tf-fmt clean sign web-build web-dev

help: ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the Go binary into dist/
	mkdir -p dist
	$(GO) build $(GOFLAGS) -o dist/$(APP) ./src/cmd/$(APP)

test: ## Run unit tests across workspace modules
	@set -e; \
	$(GO) list -m -f '{{.Dir}}' | while IFS= read -r dir; do \
		if (cd "$$dir" && $(GO) list ./... 2>/dev/null | grep -q .); then \
			(cd "$$dir" && $(GO) test ./... -race); \
		fi; \
	done

lint: ## Run golangci-lint across workspace modules
	@set -e; \
	$(GO) list -m -f '{{.Dir}}' | while IFS= read -r dir; do \
		if (cd "$$dir" && $(GO) list ./... 2>/dev/null | grep -q .); then \
			(cd "$$dir" && golangci-lint run); \
		fi; \
	done

fmt: ## Run gofmt + tofu fmt
	gofmt -s -w .
	tofu fmt -recursive infra/

tidy: ## go work sync + go mod tidy per workspace module
	$(GO) work sync
	@set -e; \
	$(GO) list -m -f '{{.Dir}}' | while IFS= read -r dir; do \
		if (cd "$$dir" && $(GO) list ./... 2>/dev/null | grep -q .); then \
			(cd "$$dir" && $(GO) mod tidy); \
		fi; \
	done

sign: ## Sign Spec + catalog registry + key records (requires 1Password CLI session)
	node scripts/sign-atoms.mjs

web-dev: ## Run the Astro umbrella site in dev mode
	cd web && pnpm dev

web-build: ## Build the Astro umbrella site
	cd web && pnpm install --frozen-lockfile && pnpm build

tf-init: ## Init the selected TF env (ENV=dev|prod)
	cd infra/terraform/envs/$(ENV) && tofu init

tf-plan: ## Plan against the selected TF env (ENV=dev|prod)
	cd infra/terraform/envs/$(ENV) && tofu plan

tf-apply: ## Apply the selected TF env (ENV=dev|prod)
	cd infra/terraform/envs/$(ENV) && tofu apply

tf-fmt: ## Format TF files
	tofu fmt -recursive infra/

clean: ## Remove build artifacts
	rm -rf dist/ web/dist/
