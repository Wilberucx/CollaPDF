#Requires -Version 5.1
<#
.SYNOPSIS
    Install CollaPDF from GitHub Releases.

.DESCRIPTION
    Downloads and installs the latest (or specified) version of CollaPDF
    for Windows x86_64 from GitHub Releases.

.EXAMPLE
    irm https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.ps1 | iex

.EXAMPLE
    irm https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.ps1 | iex -Args @{ Version = "v1.1.0" }

.PARAMETER Version
    Install a specific version tag (e.g. "v1.1.0"). Defaults to latest.

.PARAMETER DryRun
    Show what would be done without executing.
#>

[CmdletBinding()]
param(
    [string]$Version = "",
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ── Constants ───────────────────────────────────────────────────────
$Repo = "Wilberucx/CollaPDF"
$BinName = "collapdf"
$GitHubApi = "https://api.github.com/repos/$Repo"

# ── Helpers ─────────────────────────────────────────────────────────
function Write-Info  { param([string]$Msg) Write-Host "[collapdf] $Msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Msg) Write-Host "  ✓ $Msg" -ForegroundColor Green }
function Write-Warn  { param([string]$Msg) Write-Host "  ⚠ $Msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$Msg) Write-Host "  ✗ $Msg" -ForegroundColor Red }
function Write-Fatal { param([string]$Msg) Write-Err $Msg; exit 1 }

# ── Detect architecture ─────────────────────────────────────────────
$ArchRaw = $env:PROCESSOR_ARCHITECTURE
if ($ArchRaw -match "AMD64|x64") {
    $Arch = "x86_64"
} elseif ($ArchRaw -match "ARM64|AARCH64") {
    Write-Fatal "ARM64 is not yet supported for Windows. Only x86_64 is available."
} else {
    Write-Fatal "Unsupported architecture: $ArchRaw. Only x86_64 is supported."
}
Write-Info "Detected architecture: $Arch"

# ── Detect version ──────────────────────────────────────────────────
if ([string]::IsNullOrEmpty($Version)) {
    Write-Info "Detecting latest version..."
    try {
        $ReleaseJson = Invoke-RestMethod -Uri "$GitHubApi/releases/latest" -TimeoutSec 15 -ErrorAction Stop
    } catch {
        Write-Fatal "Failed to fetch latest release. Check your internet connection. Error: $_"
    }

    $Version = $ReleaseJson.tag_name
    if ([string]::IsNullOrEmpty($Version)) {
        Write-Fatal "No releases found for $Repo."
    }
    Write-Ok "Latest version: $Version"
} else {
    Write-Info "Using specified version: $Version"
}

# ── Build binary name and URL ───────────────────────────────────────
$BinFile = "${BinName}-${Version}-windows-${Arch}.exe"
$DownloadUrl = "$GitHubApi/releases/download/$Version/$BinFile"
$ChecksumUrl = "$GitHubApi/releases/download/$Version/SHA256SUMS"

Write-Info "Binary: $BinFile"
Write-Info "Download URL: $DownloadUrl"

if ($DryRun) {
    Write-Info "[DRY RUN] Would download from: $DownloadUrl"
    Write-Info "[DRY RUN] Would verify checksum against: $ChecksumUrl"

    if ($env:COLLAPDF_INSTALL_DIR) {
        $InstallDir = $env:COLLAPDF_INSTALL_DIR
    } else {
        $InstallDir = Join-Path $env:LOCALAPPDATA "collapdf"
    }
    Write-Info "[DRY RUN] Would install to: $InstallDir\$BinName.exe"
    Write-Ok "[DRY RUN] Done. Remove -DryRun to actually install."
    exit 0
}

# ── Create temp directory ───────────────────────────────────────────
$TempDir = Join-Path $env:TEMP "collapdf-install-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

try {
    # ── Download binary ─────────────────────────────────────────────
    Write-Info "Downloading $BinFile..."
    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile (Join-Path $TempDir $BinFile) -TimeoutSec 120 -ErrorAction Stop
    } catch {
        Write-Fatal "Failed to download binary. The file may not exist for this version. Error: $_"
    }
    Write-Ok "Downloaded $BinFile"

    # ── Download SHA256SUMS ────────────────────────────────────────
    Write-Info "Downloading SHA256SUMS..."
    try {
        Invoke-WebRequest -Uri $ChecksumUrl -OutFile (Join-Path $TempDir "SHA256SUMS") -TimeoutSec 30 -ErrorAction Stop
    } catch {
        Write-Fatal "Failed to download SHA256SUMS. Error: $_"
    }
    Write-Ok "Downloaded SHA256SUMS"

    # ── Verify checksum ─────────────────────────────────────────────
    Write-Info "Verifying checksum..."
    $ChecksumContent = Get-Content (Join-Path $TempDir "SHA256SUMS") -Raw
    $Expected = ($ChecksumContent -split "`n" | Where-Object { $_ -match $BinFile } | ForEach-Object { ($_ -split "\s+")[0] }).Trim()

    if ([string]::IsNullOrEmpty($Expected)) {
        Write-Fatal "Checksum for $BinFile not found in SHA256SUMS."
    }

    $ActualHash = (Get-FileHash -Path (Join-Path $TempDir $BinFile) -Algorithm SHA256).Hash.ToLower()
    $Expected = $Expected.ToLower()

    if ($Expected -ne $ActualHash) {
        Write-Fatal "Checksum mismatch! Expected: $Expected, Got: $ActualHash. Aborting for security."
    }
    Write-Ok "Checksum verified"

    # ── Determine install directory ─────────────────────────────────
    if ($env:COLLAPDF_INSTALL_DIR) {
        $InstallDir = $env:COLLAPDF_INSTALL_DIR
        Write-Info "Using COLLAPDF_INSTALL_DIR: $InstallDir"
    } else {
        $InstallDir = Join-Path $env:LOCALAPPDATA "collapdf"
        Write-Info "Installing to $InstallDir"
    }

    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
        Write-Ok "Created $InstallDir"
    }

    # ── Install ─────────────────────────────────────────────────────
    Write-Info "Installing $BinName.exe to $InstallDir..."
    Copy-Item -Path (Join-Path $TempDir $BinFile) -Destination (Join-Path $InstallDir "${BinName}.exe") -Force
    Write-Ok "Installed $(Join-Path $InstallDir "${BinName}.exe")"

    # ── Add to PATH ─────────────────────────────────────────────────
    $CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $InstallDirResolved = (Resolve-Path $InstallDir).Path

    if ($env:PATH -notlike "*$InstallDirResolved*") {
        Write-Info "Adding $InstallDirResolved to user PATH..."
        $NewPath = if ($CurrentPath) { "$CurrentPath;$InstallDirResolved" } else { $InstallDirResolved }
        [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
        Write-Ok "Added to user PATH (persistent)"

        # Update current session PATH
        $env:PATH = "$env:PATH;$InstallDirResolved"
        Write-Ok "Updated current session PATH"
    } else {
        Write-Ok "$InstallDirResolved is already in PATH"
    }

    # ── Done ────────────────────────────────────────────────────────
    Write-Host ""
    Write-Info "CollaPDF $Version installed successfully!"
    Write-Info "Run: collapdf"

} finally {
    # Cleanup temp directory
    if (Test-Path $TempDir) {
        Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
