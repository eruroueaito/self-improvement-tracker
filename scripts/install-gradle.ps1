<#
Module: Pinned Gradle installer
Responsibility: Download the official Gradle 8.14.3 all distribution through BITS, verify SHA-256, and extract it for local N0 builds
Input/Output: Accept InstallRoot and install Gradle below it
Dependencies: Windows PowerShell 5.1, BITS or Invoke-WebRequest, Expand-Archive, services.gradle.org
Notes: Does not change PATH or user-global Gradle state; CI continues to exercise the checked-in Gradle wrapper
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$InstallRoot
)

$ErrorActionPreference = 'Stop'
$distributionUrl = 'https://services.gradle.org/distributions/gradle-8.14.3-all.zip'
$distributionSha256 = 'ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c'
$resolvedInstallRoot = [System.IO.Path]::GetFullPath($InstallRoot)
if ([System.IO.Path]::GetPathRoot($resolvedInstallRoot) -eq $resolvedInstallRoot) {
  throw "Refusing to use a drive root as Gradle install root: $resolvedInstallRoot"
}

$gradleRoot = Join-Path $resolvedInstallRoot 'gradle-8.14.3'
$gradleExecutable = Join-Path $gradleRoot 'bin\gradle.bat'
if (Test-Path -LiteralPath $gradleExecutable) {
  Write-Output "Skip existing Gradle 8.14.3: $gradleRoot"
  exit 0
}

New-Item -ItemType Directory -Path $resolvedInstallRoot -Force | Out-Null
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("sit-gradle-" + [System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
$archivePath = Join-Path $temporaryRoot 'gradle-8.14.3-all.zip'
$expandedPath = Join-Path $temporaryRoot 'expanded'

try {
  if (Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue) {
    Start-BitsTransfer -Source $distributionUrl -Destination $archivePath -TransferType Download -Priority Foreground -DisplayName 'Self Improvement Tracker Gradle 8.14.3'
  } else {
    Invoke-WebRequest -Uri $distributionUrl -OutFile $archivePath -MaximumRedirection 10 -TimeoutSec 1200
  }
  $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $distributionSha256) { throw "Gradle SHA-256 mismatch: $actualHash" }
  Expand-Archive -LiteralPath $archivePath -DestinationPath $expandedPath
  $sourceRoot = Join-Path $expandedPath 'gradle-8.14.3'
  if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot 'bin\gradle.bat'))) {
    throw "Gradle archive layout mismatch: $sourceRoot"
  }
  Move-Item -LiteralPath $sourceRoot -Destination $gradleRoot
} finally {
  $resolvedTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
  if ($resolvedTemporaryRoot.StartsWith([System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()), [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Write-Output "Gradle 8.14.3 installed: $gradleExecutable"
