# RequestBite Slingshot Makefile
# Build automation for Preact + Vite application

# Output directories
BUILD_DIR := dist
NODE_MODULES := node_modules

# Variables for versioned builds
BUILD_DATE := $(shell date +%Y-%m-%d)
GIT_HASH := $(shell git rev-parse --short HEAD)
BUILD_SUBDIR := $(BUILD_DATE)-$(GIT_HASH)
BUILD_PATH := $(BUILD_DIR)/$(BUILD_SUBDIR)
VERSION := $(shell git describe --tags --abbrev=0 2>/dev/null || echo "dev")

# Version injection
TOPBAR_FILE := src/components/layout/TopBar.jsx
VERSION_PLACEHOLDER := v. 9.9.9

# Colors for output
COLOR_RESET := \033[0m
COLOR_BOLD := \033[1m
COLOR_GREEN := \033[32m
COLOR_BLUE := \033[34m
COLOR_YELLOW := \033[33m
COLOR_RED := \033[31m

.PHONY: all dev build preview clean install lint lint-fix storybook build-storybook deploy help

# Default target
all: build

# Install dependencies
install:
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Installing dependencies...$(COLOR_RESET)"
	@yarn install
	@echo "$(COLOR_GREEN)✓ Dependencies installed$(COLOR_RESET)"

# Run development server with hot reload
dev: $(NODE_MODULES)
ifeq ($(word 1,$(MAKECMDGOALS)),deploy)
	@:
else
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Starting development server...$(COLOR_RESET)"
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Version: $(VERSION)$(COLOR_RESET)"
	@VITE_VERSION=$(VERSION) yarn vite
endif

# Build for production (with version injection)
build: $(NODE_MODULES)
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Building for production...$(COLOR_RESET)"
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Version: $(VERSION)$(COLOR_RESET)"
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Build directory: $(BUILD_SUBDIR)$(COLOR_RESET)"
	@cp "$(TOPBAR_FILE)" "$(TOPBAR_FILE).backup"
	@sed -i 's/$(VERSION_PLACEHOLDER)/v. $(VERSION)/g' "$(TOPBAR_FILE)"
	@yarn vite build --outDir=$(BUILD_PATH) || (mv "$(TOPBAR_FILE).backup" "$(TOPBAR_FILE)" && exit 1)
	@mv "$(TOPBAR_FILE).backup" "$(TOPBAR_FILE)"
	@echo "$(COLOR_GREEN)✓ Build complete: $(BUILD_PATH)/$(COLOR_RESET)"

# Deploy to Bunny.net CDN
# Usage: make deploy dev/prod dist/YYYY-MM-DD-hash
deploy:
	@ARGS="$$(echo '$(filter-out $@,$(MAKECMDGOALS))' | xargs)"; \
	ENV="$$(echo $$ARGS | awk '{print $$1}')"; \
	DEPLOY_DIR="$$(echo $$ARGS | awk '{print $$2}')"; \
	if [ -z "$$ENV" ] || [ -z "$$DEPLOY_DIR" ]; then \
		echo "$(COLOR_BOLD)$(COLOR_RED)Error: Please specify environment and build directory$(COLOR_RESET)"; \
		echo "Usage: make deploy dev/prod dist/YYYY-MM-DD-hash"; \
		exit 1; \
	fi; \
	if [ "$$ENV" != "dev" ] && [ "$$ENV" != "prod" ]; then \
		echo "$(COLOR_BOLD)$(COLOR_RED)Error: Environment must be 'dev' or 'prod'$(COLOR_RESET)"; \
		echo "Usage: make deploy dev/prod dist/YYYY-MM-DD-hash"; \
		exit 1; \
	fi; \
	DEPLOY_DIR=$${DEPLOY_DIR%/}; \
	if [ ! -d "$$DEPLOY_DIR" ]; then \
		echo "$(COLOR_BOLD)$(COLOR_RED)Error: Directory not found: $$DEPLOY_DIR$(COLOR_RESET)"; \
		exit 1; \
	fi; \
	if [ ! -f .env.production ]; then \
		echo "$(COLOR_BOLD)$(COLOR_RED)Error: .env.production not found$(COLOR_RESET)"; \
		exit 1; \
	fi; \
	set -a; . ./.env.production; set +a; \
	if [ "$$ENV" = "dev" ]; then \
		BUNNY_ZONE_NAME="$$DEV_BUNNY_ZONE_NAME"; \
		BUNNY_ACCESS_KEY="$$DEV_BUNNY_ACCESS_KEY"; \
		BUNNY_PULL_ID="$$DEV_BUNNY_PULL_ID"; \
	else \
		BUNNY_ZONE_NAME="$$PROD_BUNNY_ZONE_NAME"; \
		BUNNY_ACCESS_KEY="$$PROD_BUNNY_ACCESS_KEY"; \
		BUNNY_PULL_ID="$$PROD_BUNNY_PULL_ID"; \
	fi; \
	if [ -z "$$BUNNY_ZONE_NAME" ] || [ -z "$$BUNNY_ACCESS_KEY" ]; then \
		echo "$(COLOR_BOLD)$(COLOR_RED)Error: $${ENV^^}_BUNNY_ZONE_NAME and $${ENV^^}_BUNNY_ACCESS_KEY must be set in .env.production$(COLOR_RESET)"; \
		exit 1; \
	fi; \
	echo "$(COLOR_BOLD)$(COLOR_BLUE)Deploying $$DEPLOY_DIR to Bunny.net CDN [$$ENV] ($$BUNNY_ZONE_NAME)...$(COLOR_RESET)"; \
	FILE_COUNT=0; \
	UPLOAD_ERRORS=0; \
	find "$$DEPLOY_DIR" -type f | while read -r file; do \
		rel_path=$${file#$$DEPLOY_DIR/}; \
		mime_type=$$(file -b --mime-type "$$file" 2>/dev/null || echo "application/octet-stream"); \
		printf "  Uploading $$rel_path... "; \
		if curl -X PUT \
			"https://storage.bunnycdn.com/$$BUNNY_ZONE_NAME/$$rel_path" \
			-H "AccessKey: $$BUNNY_ACCESS_KEY" \
			-H "Content-Type: $$mime_type" \
			--upload-file "$$file" \
			-f -s -S 2>&1 > /dev/null; then \
			echo "$(COLOR_GREEN)✓$(COLOR_RESET)"; \
		else \
			echo "$(COLOR_RED)✗$(COLOR_RESET)"; \
			exit 1; \
		fi; \
	done; \
	if [ $$? -eq 0 ]; then \
		echo "$(COLOR_GREEN)✓ Deployment complete!$(COLOR_RESET)"; \
		echo "$(COLOR_BOLD)$(COLOR_BLUE)CDN URL: https://$$BUNNY_ZONE_NAME.b-cdn.net/$(COLOR_RESET)"; \
		echo "$(COLOR_BOLD)$(COLOR_BLUE)Purging CDN cache...$(COLOR_RESET)"; \
		if curl --request POST \
			--url "https://api.bunny.net/pullzone/$$BUNNY_PULL_ID/purgeCache" \
			--header "AccessKey: $$BUNNY_PULL_ACCESS_KEY" \
			--header "Content-Type: application/json" \
			--data '{}' \
			-f -s -S 2>&1 > /dev/null; then \
			echo "$(COLOR_GREEN)✓ CDN cache purged$(COLOR_RESET)"; \
		else \
			echo "$(COLOR_YELLOW)⚠ Cache purge failed (continuing anyway)$(COLOR_RESET)"; \
		fi; \
	else \
		echo "$(COLOR_BOLD)$(COLOR_RED)Deployment failed$(COLOR_RESET)"; \
		exit 1; \
	fi

# If deploying, prevent make from trying to build the arguments as targets
ifeq ($(word 1,$(MAKECMDGOALS)),deploy)
ARG2 := $(word 2,$(MAKECMDGOALS))
ARG3 := $(word 3,$(MAKECMDGOALS))
# Only create dummy targets if not already defined
ifeq ($(filter $(ARG2),all dev build preview clean install lint lint-fix storybook build-storybook deploy help),)
$(eval $(ARG2): ; @:)
endif
ifneq ($(ARG3),)
ifeq ($(filter $(ARG3),all dev build preview clean install lint lint-fix storybook build-storybook deploy help),)
$(eval $(ARG3): ; @:)
endif
endif
endif

# Preview production build
preview: $(NODE_MODULES)
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Starting preview server...$(COLOR_RESET)"
	@yarn vite preview

# Run ESLint
lint: $(NODE_MODULES)
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Running linter...$(COLOR_RESET)"
	@yarn eslint . --ext .js,.jsx

# Run ESLint with auto-fix
lint-fix: $(NODE_MODULES)
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Running linter with auto-fix...$(COLOR_RESET)"
	@yarn eslint . --ext .js,.jsx --fix
	@echo "$(COLOR_GREEN)✓ Lint fixes applied$(COLOR_RESET)"

# Run Storybook development server
storybook: $(NODE_MODULES)
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Starting Storybook...$(COLOR_RESET)"
	@yarn storybook

# Build Storybook for production
build-storybook: $(NODE_MODULES)
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Building Storybook...$(COLOR_RESET)"
	@yarn storybook build
	@echo "$(COLOR_GREEN)✓ Storybook build complete$(COLOR_RESET)"

# Ensure node_modules exists
$(NODE_MODULES):
	@echo "$(COLOR_YELLOW)node_modules not found, installing dependencies...$(COLOR_RESET)"
	@$(MAKE) install

# Clean build artifacts
clean:
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Cleaning build artifacts...$(COLOR_RESET)"
	@rm -rf $(BUILD_DIR)
	@rm -rf storybook-static
	@echo "$(COLOR_GREEN)✓ Clean complete$(COLOR_RESET)"

# Deep clean (including node_modules)
clean-all: clean
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Removing node_modules...$(COLOR_RESET)"
	@rm -rf $(NODE_MODULES)
	@rm -f yarn.lock
	@echo "$(COLOR_GREEN)✓ Deep clean complete$(COLOR_RESET)"

# Show version
version:
	@echo "$(VERSION)"

# Show help
help:
	@echo "$(COLOR_BOLD)RequestBite Slingshot - Build System$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_BOLD)Usage:$(COLOR_RESET)"
	@echo "  make [target]"
	@echo ""
	@echo "$(COLOR_BOLD)Development:$(COLOR_RESET)"
	@echo "  dev            - Start development server with hot reload (default: http://localhost:5173)"
	@echo "  storybook      - Start Storybook dev server (default: http://localhost:6006)"
	@echo "  lint           - Run ESLint"
	@echo "  lint-fix       - Run ESLint with auto-fix"
	@echo ""
	@echo "$(COLOR_BOLD)Build:$(COLOR_RESET)"
	@echo "  build          - Build for production (injects version from git tag, creates versioned build dir)"
	@echo "  build-storybook- Build Storybook for production"
	@echo "  preview        - Preview production build locally"
	@echo "  deploy         - Deploy built website to Bunny.net CDN (requires env and build directory)"
	@echo ""
	@echo "$(COLOR_BOLD)Setup & Cleanup:$(COLOR_RESET)"
	@echo "  install        - Install yarn dependencies"
	@echo "  clean          - Remove build artifacts (dist/, storybook-static/)"
	@echo "  clean-all      - Remove build artifacts and node_modules"
	@echo "  version        - Show current version"
	@echo "  help           - Show this help message"
	@echo ""
	@echo "$(COLOR_BOLD)Examples:$(COLOR_RESET)"
	@echo "  make dev                                      # Start dev server"
	@echo "  make build                                    # Production build with version"
	@echo "  make deploy dev dist/2026-02-25-a1b2c3d      # Deploy to dev CDN"
	@echo "  make deploy prod dist/2026-02-25-a1b2c3d     # Deploy to prod CDN"
	@echo "  make storybook                                # Start Storybook"
	@echo "  make lint-fix                                 # Fix lint errors"
	@echo ""
	@echo "$(COLOR_BOLD)Current version:$(COLOR_RESET) $(VERSION)"
