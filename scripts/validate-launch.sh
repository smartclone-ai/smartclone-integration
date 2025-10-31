#!/bin/bash

# SmartClone Core - Pre-launch validation checks
# This script validates that the repository is ready for open source launch

set -e

echo "🚀 SmartClone Core - Launch Readiness Validation"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0
WARNINGS=0

function validate_repo_config() {
  echo "🔍 Validating Repository Configuration..."

  # Check critical files exist
  declare -a required_files=(
    "README.md"
    "CONTRIBUTING.md"
    "CODE_OF_CONDUCT.md"
    "LICENSE"
    "SECURITY.md"
    "CHANGELOG.md"
    "ROADMAP.md"
    "package.json"
    ".npmrc"
    ".gitignore"
    "tsconfig.json"
  )

  local missing_files=0
  for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
      echo -e "${RED}❌ Missing required file: $file${NC}"
      missing_files=$((missing_files + 1))
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${GREEN}✅ Found: $file${NC}"
    fi
  done

  if [ $missing_files -eq 0 ]; then
    echo -e "${GREEN}✅ All required files present${NC}"
  else
    echo -e "${RED}❌ Missing $missing_files required files${NC}"
  fi
  echo ""
}

function check_placeholders() {
  echo "🕵️ Checking for unresolved placeholders..."

  local placeholder_files=(
    "README.md"
    "SECURITY.md"
    "CHANGELOG.md"
    "ROADMAP.md"
    "package.json"
  )

  local placeholders=(
    "yourusername"
    "your-email@example.com"
    "Your Name"
    "INSERT CONTACT EMAIL"
  )

  local found_placeholders=0
  for file in "${placeholder_files[@]}"; do
    if [ -f "$file" ]; then
      for placeholder in "${placeholders[@]}"; do
        if grep -q "$placeholder" "$file" 2>/dev/null; then
          echo -e "${YELLOW}⚠️  Unresolved placeholder '$placeholder' found in $file${NC}"
          found_placeholders=$((found_placeholders + 1))
          WARNINGS=$((WARNINGS + 1))
        fi
      done
    fi
  done

  if [ $found_placeholders -eq 0 ]; then
    echo -e "${GREEN}✅ No unresolved placeholders detected${NC}"
  else
    echo -e "${YELLOW}⚠️  Found $found_placeholders placeholder(s) that should be updated before launch${NC}"
  fi
  echo ""
}

function validate_github_config() {
  echo "📋 Validating GitHub Configuration..."

  local github_files=(
    ".github/workflows/ci.yml"
    ".github/workflows/publish.yml"
    ".github/workflows/code-quality.yml"
    ".github/ISSUE_TEMPLATE/bug_report.yml"
    ".github/ISSUE_TEMPLATE/feature_request.yml"
    ".github/PULL_REQUEST_TEMPLATE.md"
    ".github/settings.yml"
    ".github/FUNDING.yml"
  )

  local missing_github=0
  for file in "${github_files[@]}"; do
    if [ ! -f "$file" ]; then
      echo -e "${RED}❌ Missing: $file${NC}"
      missing_github=$((missing_github + 1))
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${GREEN}✅ Found: $file${NC}"
    fi
  done

  if [ $missing_github -eq 0 ]; then
    echo -e "${GREEN}✅ All GitHub configuration files present${NC}"
  fi
  echo ""
}

function validate_npm_config() {
  echo "📦 Validating NPM Configuration..."

  # Check if package.json exists and is valid JSON
  if ! jq empty package.json 2>/dev/null; then
    echo -e "${RED}❌ package.json is not valid JSON${NC}"
    ERRORS=$((ERRORS + 1))
    return
  fi

  # Check critical package.json fields
  local name=$(jq -r '.name' package.json)
  local version=$(jq -r '.version' package.json)
  local description=$(jq -r '.description' package.json)
  local license=$(jq -r '.license' package.json)
  local private=$(jq -r '.private' package.json)

  echo "  Name: $name"
  echo "  Version: $version"
  echo "  Description: $description"
  echo "  License: $license"
  echo "  Private: $private"

  if [ "$private" = "true" ]; then
    echo -e "${RED}❌ Package is marked as private - cannot be published to npm${NC}"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}✅ Package is public${NC}"
  fi

  # Check if main entry points exist
  local main=$(jq -r '.main' package.json)
  local module=$(jq -r '.module' package.json)
  local types=$(jq -r '.types' package.json)

  echo -e "\n  Entry Points:"
  echo "    Main (CJS): $main"
  echo "    Module (ESM): $module"
  echo "    Types: $types"

  echo ""
}

function validate_build() {
  echo "🏗️ Validating Build Configuration..."

  # Check build files
  if [ ! -f "rollup.config.js" ] && [ ! -f "rollup.config.ts" ]; then
    echo -e "${YELLOW}⚠️  No rollup config found${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✅ Build configuration present${NC}"
  fi

  # Check TypeScript config
  if [ ! -f "tsconfig.json" ]; then
    echo -e "${RED}❌ Missing tsconfig.json${NC}"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}✅ TypeScript configuration present${NC}"
  fi
  echo ""
}

function check_git_status() {
  echo "🔍 Checking Git Status..."

  # Check if we're in a git repo
  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not a git repository${NC}"
    ERRORS=$((ERRORS + 1))
    return
  fi

  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
  fi

  # Check current branch
  local branch=$(git rev-parse --abbrev-ref HEAD)
  echo "  Current branch: $branch"

  if [ "$branch" != "main" ] && [ "$branch" != "master" ]; then
    echo -e "${YELLOW}⚠️  Not on main/master branch${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
  echo ""
}

function generate_report() {
  echo "📊 Launch Readiness Summary"
  echo "================================================"

  if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 SmartClone Core is LAUNCH READY!${NC}"
    echo ""
    echo "All validation checks passed successfully."
    echo ""
    echo "Next steps:"
    echo "1. Update any placeholder values (yourusername, emails, etc.)"
    echo "2. Create GitHub repository"
    echo "3. Push code to GitHub"
    echo "4. Set up NPM_TOKEN secret in GitHub"
    echo "5. Create first release on GitHub"
    echo "6. Share with the community!"
    return 0
  elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  SmartClone Core is mostly ready${NC}"
    echo ""
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""
    echo "Please review warnings above before launching."
    return 0
  else
    echo -e "${RED}❌ SmartClone Core is NOT ready for launch${NC}"
    echo ""
    echo -e "${RED}Errors: $ERRORS${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""
    echo "Please fix all errors before launching."
    return 1
  fi
}

# Run all validation checks
validate_repo_config
check_placeholders
validate_github_config
validate_npm_config
validate_build
check_git_status
generate_report
