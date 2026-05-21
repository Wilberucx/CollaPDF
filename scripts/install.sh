#!/usr/bin/env bash
set -euo pipefail

# ── CollaPDF Installer ──────────────────────────────────────────────
# Install collapdf from GitHub Releases.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.sh | sh
#   curl -fsSL https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.sh | sh -s -- --version v1.1.0
#   curl -fsSL https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.sh | sh -s -- --dry-run
# ─────────────────────────────────────────────────────────────────────

REPO="Wilberucx/CollaPDF"
BIN_NAME="collapdf"
GITHUB_API="https://api.github.com/repos/${REPO}"

# ── Colors ──────────────────────────────────────────────────────────
if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD="$(tput bold)"
  GREEN="$(tput setaf 2)"
  YELLOW="$(tput setaf 3)"
  RED="$(tput setaf 1)"
  CYAN="$(tput setaf 6)"
  RESET="$(tput sgr0)"
else
  BOLD="" GREEN="" YELLOW="" RED="" CYAN="" RESET=""
fi

info()    { echo "${BOLD}[collapdf]${RESET} $*"; }
ok()      { echo "${GREEN}  ✓${RESET} $*"; }
warn()    { echo "${YELLOW}  ⚠${RESET} $*"; }
err()     { echo "${RED}  ✗${RESET} $*" >&2; }
fatal()   { err "$@"; exit 1; }

# ── Parse flags ─────────────────────────────────────────────────────
VERSION=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      echo "Usage: install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --version <tag>   Install a specific version (e.g. v1.1.0)"
      echo "  --dry-run         Show what would be done without executing"
      echo "  --help, -h        Show this help message"
      echo ""
      echo "Environment:"
      echo "  COLLAPDF_INSTALL_DIR  Override installation directory"
      exit 0
      ;;
    *)
      fatal "Unknown option: $1. Use --help for usage."
      ;;
  esac
done

# ── Detect OS ───────────────────────────────────────────────────────
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$OS" in
  linux|darwin) ;;
  *) fatal "Unsupported OS: ${OS}. Only Linux and macOS are supported." ;;
esac
info "Detected OS: ${OS}"

# ── Detect architecture ─────────────────────────────────────────────
ARCH_RAW="$(uname -m)"
case "$ARCH_RAW" in
  x86_64|amd64)  ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64"  ;;
  *) fatal "Unsupported architecture: ${ARCH_RAW}. Only x86_64 and arm64/aarch64 are supported." ;;
esac
info "Detected architecture: ${ARCH}"

# ── Detect version ──────────────────────────────────────────────────
if [[ -z "$VERSION" ]]; then
  info "Detecting latest version..."
  RELEASE_JSON="$(curl -sf --max-time 15 "${GITHUB_API}/releases/latest" 2>/dev/null)" || \
    fatal "Failed to fetch latest release. Check your internet connection."

  VERSION="$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"//;s/".*//')" || \
    fatal "Could not parse version from GitHub API response."

  [[ -n "$VERSION" ]] || fatal "No releases found for ${REPO}."
  ok "Latest version: ${VERSION}"
else
  info "Using specified version: ${VERSION}"
fi

# ── Build binary name and URL ───────────────────────────────────────
# Strip leading 'v' for the binary name portion
VERSION_NUM="${VERSION#v}"
if [[ "$OS" == "windows" ]]; then
  BIN_FILE="${BIN_NAME}-${VERSION}-${OS}-x86_64.exe"
else
  BIN_FILE="${BIN_NAME}-${VERSION}-${OS}-${ARCH}"
fi

DOWNLOAD_URL="${GITHUB_API}/releases/download/${VERSION}/${BIN_FILE}"
CHECKSUM_URL="${GITHUB_API}/releases/download/${VERSION}/SHA256SUMS"

info "Binary: ${BIN_FILE}"
info "Download URL: ${DOWNLOAD_URL}"

if [[ "$DRY_RUN" == true ]]; then
  info "[DRY RUN] Would download from: ${DOWNLOAD_URL}"
  info "[DRY RUN] Would verify checksum against: ${CHECKSUM_URL}"

  # Determine install dir
  INSTALL_DIR=""
  if [[ -n "${COLLAPDF_INSTALL_DIR:-}" ]]; then
    INSTALL_DIR="$COLLAPDF_INSTALL_DIR"
  elif [[ -d "$HOME/.local/bin" ]]; then
    INSTALL_DIR="$HOME/.local/bin"
  elif [[ -w "/usr/local/bin" ]]; then
    INSTALL_DIR="/usr/local/bin"
  else
    INSTALL_DIR="$HOME/.local/bin"
  fi
  info "[DRY RUN] Would install to: ${INSTALL_DIR}/${BIN_NAME}"
  info "[DRY RUN] Would run: chmod +x ${INSTALL_DIR}/${BIN_NAME}"
  ok "[DRY RUN] Done. Remove --dry-run to actually install."
  exit 0
fi

# ── Create temp directory ───────────────────────────────────────────
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

# ── Download binary ─────────────────────────────────────────────────
info "Downloading ${BIN_FILE}..."
if ! curl -fSL --max-time 120 --connect-timeout 15 -o "${TMPDIR}/${BIN_FILE}" "$DOWNLOAD_URL" 2>/dev/null; then
  fatal "Failed to download binary. The file may not exist for this version/platform."
fi
ok "Downloaded ${BIN_FILE}"

# ── Download SHA256SUMS ────────────────────────────────────────────
info "Downloading SHA256SUMS..."
if ! curl -fSL --max-time 30 --connect-timeout 15 -o "${TMPDIR}/SHA256SUMS" "$CHECKSUM_URL" 2>/dev/null; then
  fatal "Failed to download SHA256SUMS."
fi
ok "Downloaded SHA256SUMS"

# ── Verify checksum ─────────────────────────────────────────────────
info "Verifying checksum..."
EXPECTED="$(grep "${BIN_FILE}" "${TMPDIR}/SHA256SUMS" | awk '{print $1}')"
if [[ -z "$EXPECTED" ]]; then
  fatal "Checksum for ${BIN_FILE} not found in SHA256SUMS."
fi

ACTUAL="$(shasum -a 256 "${TMPDIR}/${BIN_FILE}" | awk '{print $1}')"

if [[ "$EXPECTED" != "$ACTUAL" ]]; then
  fatal "Checksum mismatch! Expected: ${EXPECTED}, Got: ${ACTUAL}. Aborting for security."
fi
ok "Checksum verified"

# ── Determine install directory ─────────────────────────────────────
INSTALL_DIR=""
if [[ -n "${COLLAPDF_INSTALL_DIR:-}" ]]; then
  INSTALL_DIR="$COLLAPDF_INSTALL_DIR"
  info "Using COLLAPDF_INSTALL_DIR: ${INSTALL_DIR}"
elif [[ -d "$HOME/.local/bin" ]]; then
  INSTALL_DIR="$HOME/.local/bin"
  info "Installing to ~/.local/bin"
elif [[ -w "/usr/local/bin" ]]; then
  INSTALL_DIR="/usr/local/bin"
  info "Installing to /usr/local/bin"
else
  INSTALL_DIR="$HOME/.local/bin"
  info "~/.local/bin does not exist, creating it..."
  mkdir -p "$INSTALL_DIR"
  ok "Created ${INSTALL_DIR}"
fi

# Ensure the directory exists
mkdir -p "$INSTALL_DIR"

# ── Install ─────────────────────────────────────────────────────────
info "Installing ${BIN_NAME} to ${INSTALL_DIR}..."
cp "${TMPDIR}/${BIN_FILE}" "${INSTALL_DIR}/${BIN_NAME}"
chmod +x "${INSTALL_DIR}/${BIN_NAME}"
ok "Installed ${INSTALL_DIR}/${BIN_NAME}"

# ── Check if install dir is in PATH ─────────────────────────────────
if [[ ":${PATH}:" != *":${INSTALL_DIR}:"* ]]; then
  warn "${INSTALL_DIR} is not in your PATH."
  warn "Add it by running:"
  echo "  export PATH=\"${INSTALL_DIR}:\$PATH\" >> ~/.bashrc  # or ~/.zshrc"
fi

# ── Done ────────────────────────────────────────────────────────────
echo ""
info "${GREEN}${BOLD}CollaPDF ${VERSION} installed successfully!${RESET}"
info "Run: ${CYAN}${BIN_NAME}${RESET}"
