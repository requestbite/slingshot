# RequestBite Slingshot Makefile
# Build automation for Preact + Vite application

# Extract version from git tag, fallback to "dev"
VERSION ?= $(shell git describe --tags --abbrev=0 2>/dev/null || echo "dev")

# Output directories
BUILD_DIR := dist
NODE_MODULES := node_modules

# Version injection
TOPBAR_FILE := src/components/layout/TopBar.jsx
VERSION_PLACEHOLDER := v. 9.9.9

# Colors for output
COLOR_RESET := \033[0m
COLOR_BOLD := \033[1m
COLOR_GREEN := \033[32m
COLOR_BLUE := \033[34m
COLOR_YELLOW := \033[33m

.PHONY: all dev build preview clean install lint lint-fix storybook build-storybook help

# Default target
all: build

# Install dependencies
install:
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Installing dependencies...$(COLOR_RESET)"
	@yarn install
	@echo "$(COLOR_GREEN)✓ Dependencies installed$(COLOR_RESET)"

# Run development server with hot reload
dev: $(NODE_MODULES)
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Starting development server...$(COLOR_RESET)"
	@yarn vite

# Build for production (with version injection)
build: $(NODE_MODULES)
	@echo "$(COLOR_BOLD)$(COLOR_BLUE)Building for production ($(VERSION))...$(COLOR_RESET)"
	@cp "$(TOPBAR_FILE)" "$(TOPBAR_FILE).backup"
	@sed -i 's/$(VERSION_PLACEHOLDER)/v. $(VERSION)/g' "$(TOPBAR_FILE)"
	@yarn vite build || (mv "$(TOPBAR_FILE).backup" "$(TOPBAR_FILE)" && exit 1)
	@mv "$(TOPBAR_FILE).backup" "$(TOPBAR_FILE)"
	@echo "$(COLOR_GREEN)✓ Build complete: $(BUILD_DIR)/ ($(VERSION))$(COLOR_RESET)"

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
	@echo "  build          - Build for production (injects version from git tag)"
	@echo "  build-storybook- Build Storybook for production"
	@echo "  preview        - Preview production build locally"
	@echo ""
	@echo "$(COLOR_BOLD)Setup & Cleanup:$(COLOR_RESET)"
	@echo "  install        - Install yarn dependencies"
	@echo "  clean          - Remove build artifacts (dist/, storybook-static/)"
	@echo "  clean-all      - Remove build artifacts and node_modules"
	@echo "  version        - Show current version"
	@echo "  help           - Show this help message"
	@echo ""
	@echo "$(COLOR_BOLD)Examples:$(COLOR_RESET)"
	@echo "  make dev                    # Start dev server"
	@echo "  make build                  # Production build with version"
	@echo "  make storybook              # Start Storybook"
	@echo "  make lint-fix               # Fix lint errors"
	@echo ""
	@echo "$(COLOR_BOLD)Current version:$(COLOR_RESET) $(VERSION)"
