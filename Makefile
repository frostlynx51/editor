# Deployment Configuration
# Update these variables to match your deployment target
SERVER = user@example.com
REMOTE_PATH = /var/www/html/editor
BUILD_DIR = dist

# Base URL path where the app will be served
# Examples:
#   BASE_PATH = /           (served from root: http://example.com/)
#   BASE_PATH = /editor/    (served from subdirectory: http://example.com/editor/)
BASE_PATH = /editor/

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[0;33m
NC = \033[0m # No Color

.PHONY: help install build deploy clean all

# Default target
all: install build

help:
	@echo "Available targets:"
	@echo "  $(GREEN)install$(NC)  - Install npm dependencies"
	@echo "  $(GREEN)build$(NC)    - Build the project"
	@echo "  $(GREEN)deploy$(NC)   - Deploy to remote server"
	@echo "  $(GREEN)all$(NC)      - Run install and build"
	@echo "  $(GREEN)full$(NC)     - Run install, build, and deploy"
	@echo "  $(GREEN)clean$(NC)    - Remove build directory"
	@echo ""
	@echo "Configuration:"
	@echo "  SERVER      = $(YELLOW)$(SERVER)$(NC)"
	@echo "  REMOTE_PATH = $(YELLOW)$(REMOTE_PATH)$(NC)"
	@echo "  BUILD_DIR   = $(YELLOW)$(BUILD_DIR)$(NC)"
	@echo "  BASE_PATH   = $(YELLOW)$(BASE_PATH)$(NC)"

install:
	@echo "$(GREEN)Installing npm dependencies...$(NC)"
	npm install

build:
	@echo "$(GREEN)Building project with BASE_PATH=$(BASE_PATH)...$(NC)"
	npm run build -- --base=$(BASE_PATH)
	@echo "$(GREEN)Build complete!$(NC)"

deploy: build
	@echo "$(GREEN)Deploying to $(SERVER):$(REMOTE_PATH)...$(NC)"
	@if [ ! -d "$(BUILD_DIR)" ]; then \
		echo "Error: Build directory '$(BUILD_DIR)' not found"; \
		exit 1; \
	fi
	@echo "Creating remote directory if it doesn't exist..."
	ssh $(SSH_OPTIONS) $(SERVER) "mkdir -p $(REMOTE_PATH)"
	@echo "Copying files..."
	rsync -avz --delete $(BUILD_DIR)/ $(SERVER):$(REMOTE_PATH)/
	@echo "$(GREEN)Deployment complete!$(NC)"

full: install build deploy

clean:
	@echo "$(GREEN)Cleaning build directory...$(NC)"
	rm -rf $(BUILD_DIR)
	@echo "$(GREEN)Clean complete!$(NC)"
