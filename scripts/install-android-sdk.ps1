<#
Module: Windows Android SDK installer
Responsibility: Download pinned Android archives through BITS, verify them, and install the N0 SDK 36 toolchain
Input/Output: Accept SdkRoot, install packages there, and print shell-local environment instructions
Dependencies: Windows PowerShell 5.1, BITS or Invoke-WebRequest, Windows tar.exe, JDK 21, Google Android SDK repository
Notes: Only writes to the explicit SdkRoot and a unique system temp directory; never changes global environment variables
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$SdkRoot,
  [switch]$SkipEmulator,
  [switch]$AcceptSdkLicense
)

$ErrorActionPreference = 'Stop'
$toolsUrl = 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip'
$toolsSha256 = '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
$resolvedSdkRoot = [System.IO.Path]::GetFullPath($SdkRoot)
if ([System.IO.Path]::GetPathRoot($resolvedSdkRoot) -eq $resolvedSdkRoot) {
  throw "Refusing to use a drive root as Android SDK: $resolvedSdkRoot"
}
if (-not $AcceptSdkLicense) {
  throw 'Android SDK License Agreement acceptance is required. Re-run with -AcceptSdkLicense after reviewing https://developer.android.com/studio/terms.'
}

New-Item -ItemType Directory -Path $resolvedSdkRoot -Force | Out-Null
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("sit-android-sdk-" + [System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
$archivePath = Join-Path $temporaryRoot 'command-line-tools.zip'
$expandedPath = Join-Path $temporaryRoot 'expanded'
$tarExecutable = (Get-Command tar.exe -ErrorAction SilentlyContinue).Source
if (-not $tarExecutable) {
  throw 'Windows tar.exe is required to extract Android ZIP64 archives.'
}

function Expand-AndroidArchive {
  param(
    [Parameter(Mandatory = $true)][string]$Archive,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  & $tarExecutable -xf $Archive -C $Destination
  if ($LASTEXITCODE -ne 0) {
    throw "tar.exe failed to extract Android archive: $Archive"
  }
}

function Receive-AndroidArchive {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string]$DisplayName
  )

  if (Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue) {
    Start-BitsTransfer -Source $Url -Destination $Destination -TransferType Download -Priority Foreground -DisplayName $DisplayName
    return
  }
  Invoke-WebRequest -Uri $Url -OutFile $Destination -MaximumRedirection 10 -TimeoutSec 1200
}

function Test-InstalledAndroidPackage {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string]$RequiredRelativePath,
    [Parameter(Mandatory = $true)][string]$ExpectedRevision
  )

  if (-not (Test-Path -LiteralPath $Destination)) { return $false }
  $requiredPath = Join-Path $Destination $RequiredRelativePath
  $propertiesPath = Join-Path $Destination 'source.properties'
  if (-not (Test-Path -LiteralPath $requiredPath) -or -not (Test-Path -LiteralPath $propertiesPath)) {
    throw "$Name exists but is incomplete at $Destination"
  }
  $revisionPattern = '(?m)^Pkg\.Revision=' + [regex]::Escape($ExpectedRevision) + '$'
  $properties = [System.IO.File]::ReadAllText($propertiesPath)
  if ($properties -notmatch $revisionPattern) {
    throw "$Name revision mismatch at $Destination; expected $ExpectedRevision"
  }
  return $true
}

function Ensure-EmulatorPackageMetadata {
  param([Parameter(Mandatory = $true)][string]$EmulatorRoot)

  $packageXml = Join-Path $EmulatorRoot 'package.xml'
  if (Test-Path -LiteralPath $packageXml) { return }

  # The standalone emulator archive omits package.xml, but avdmanager requires
  # this local SDK registration even when every emulator binary is present.
  $metadata = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><ns2:repository xmlns:ns2="http://schemas.android.com/repository/android/common/02" xmlns:ns4="http://schemas.android.com/repository/android/generic/01" xmlns:ns5="http://schemas.android.com/repository/android/generic/02"><license id="android-sdk-license" type="text"/><localPackage path="emulator" obsolete="false"><type-details xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="ns5:genericDetailsType"/><revision><major>37</major><minor>1</minor><micro>11</micro></revision><display-name>Android Emulator</display-name><uses-license ref="android-sdk-license"/></localPackage></ns2:repository>'
  [System.IO.File]::WriteAllText($packageXml, $metadata, [System.Text.Encoding]::UTF8)
  Write-Output "Registered emulator package metadata: $packageXml"
}

function Install-AndroidArchive {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Sha1,
    [Parameter(Mandatory = $true)][long]$ExpectedBytes,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string]$RequiredRelativePath,
    [Parameter(Mandatory = $true)][string]$ExpectedRevision
  )

  if (Test-InstalledAndroidPackage -Name $Name -Destination $Destination -RequiredRelativePath $RequiredRelativePath -ExpectedRevision $ExpectedRevision) {
    Write-Output "Skip verified package: $Name -> $Destination"
    return
  }

  $packageArchive = Join-Path $temporaryRoot ($Name + '.zip')
  $packageExpanded = Join-Path $temporaryRoot ($Name + '-expanded')
  Receive-AndroidArchive -Url $Url -Destination $packageArchive -DisplayName "Self Improvement Tracker $Name"
  $downloaded = Get-Item -LiteralPath $packageArchive
  if ($downloaded.Length -ne $ExpectedBytes) { throw "$Name size mismatch: $($downloaded.Length), expected $ExpectedBytes" }
  $actualSha1 = (Get-FileHash -LiteralPath $packageArchive -Algorithm SHA1).Hash.ToLowerInvariant()
  if ($actualSha1 -ne $Sha1) { throw "$Name SHA-1 mismatch: $actualSha1" }

  Expand-AndroidArchive -Archive $packageArchive -Destination $packageExpanded
  $rootEntries = @(Get-ChildItem -LiteralPath $packageExpanded -Force)
  if ($rootEntries.Count -ne 1 -or -not ($rootEntries[0].PSIsContainer)) {
    throw "$Name archive must contain one top-level directory; found $($rootEntries.Count) entries"
  }
  New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
  Move-Item -LiteralPath $rootEntries[0].FullName -Destination $Destination
  Write-Output "Installed package: $Name -> $Destination"
}

try {
  $latestRoot = Join-Path $resolvedSdkRoot 'cmdline-tools\latest'
  $toolsInstalled = Test-InstalledAndroidPackage -Name 'command-line-tools-15859902' -Destination $latestRoot -RequiredRelativePath 'bin\sdkmanager.bat' -ExpectedRevision '22.0'
  if (-not $toolsInstalled) {
    Receive-AndroidArchive -Url $toolsUrl -Destination $archivePath -DisplayName 'Self Improvement Tracker Android SDK tools'
    $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $toolsSha256) { throw "command-line tools SHA-256 mismatch: $actualHash" }
    Expand-AndroidArchive -Archive $archivePath -Destination $expandedPath
    New-Item -ItemType Directory -Path (Split-Path -Parent $latestRoot) -Force | Out-Null
    Move-Item -LiteralPath (Join-Path $expandedPath 'cmdline-tools') -Destination $latestRoot
  } else {
    Write-Output "Skip verified package: command-line-tools-15859902 -> $latestRoot"
  }

  $sdkManager = Join-Path $latestRoot 'bin\sdkmanager.bat'
  if (-not (Test-Path -LiteralPath $sdkManager)) { throw "sdkmanager missing at expected path: $sdkManager" }

  Write-Output 'Android SDK License Agreement accepted through explicit -AcceptSdkLicense.'

  $repositoryBase = 'https://dl.google.com/android/repository'
  Install-AndroidArchive -Name 'platform-tools-37.0.1' -Url "$repositoryBase/platform-tools_r37.0.1-win.zip" -Sha1 'e03e78b1d80b396f1c3358e31251cb31740e1110' -ExpectedBytes 8044989 -Destination (Join-Path $resolvedSdkRoot 'platform-tools') -RequiredRelativePath 'adb.exe' -ExpectedRevision '37.0.1'
  Install-AndroidArchive -Name 'platform-36-r02' -Url "$repositoryBase/platform-36_r02.zip" -Sha1 '2c1a80dd4d9f7d0e6dd336ec603d9b5c55a6f576' -ExpectedBytes 65878410 -Destination (Join-Path $resolvedSdkRoot 'platforms\android-36') -RequiredRelativePath 'android.jar' -ExpectedRevision '2'
  Install-AndroidArchive -Name 'build-tools-35.0.0' -Url "$repositoryBase/build-tools_r35_windows.zip" -Sha1 'af059bb67cf7786f45ee0db85e2d24985df1b4b6' -ExpectedBytes 59878107 -Destination (Join-Path $resolvedSdkRoot 'build-tools\35.0.0') -RequiredRelativePath 'aapt2.exe' -ExpectedRevision '35.0.0'

  if (-not $SkipEmulator) {
    $emulatorRoot = Join-Path $resolvedSdkRoot 'emulator'
    Install-AndroidArchive -Name 'emulator-37.1.11' -Url "$repositoryBase/emulator-windows_x64-15917651.zip" -Sha1 '54fa750822ff462d57e04fc8e98e60f08df2bb61' -ExpectedBytes 441926448 -Destination $emulatorRoot -RequiredRelativePath 'emulator.exe' -ExpectedRevision '37.1.11'
    Ensure-EmulatorPackageMetadata -EmulatorRoot $emulatorRoot
    Install-AndroidArchive -Name 'system-image-api36-google-apis-x86_64-r07' -Url "$repositoryBase/sys-img/google_apis/x86_64-36_r07.zip" -Sha1 'c6bf44bdcd885bb902b4ba752d111a073ad7a817' -ExpectedBytes 1895447397 -Destination (Join-Path $resolvedSdkRoot 'system-images\android-36\google_apis\x86_64') -RequiredRelativePath 'system.img' -ExpectedRevision '7'
  }
} finally {
  $resolvedTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
  if ($resolvedTemporaryRoot.StartsWith([System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()), [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Write-Output "Android SDK installed: $resolvedSdkRoot"
Write-Output "Set for the current shell: `$env:ANDROID_SDK_ROOT='$resolvedSdkRoot'; `$env:ANDROID_HOME='$resolvedSdkRoot'"
