<#
Module: Android native smoke evidence runner
Responsibility: Select one Android device, install/launch the debug APK, enforce native preconditions, and capture privacy-bounded evidence
Input/Output: Accept SDK/APK/device/checkpoint options and write a timestamped evidence directory under output/android-smoke
Dependencies: Android platform-tools, an API 33+ emulator or physical device, and the debug APK
Notes: Never clears app data; UI assertions remain explicit manual checkpoints, while this script captures reproducible native evidence around them
#>
[CmdletBinding()]
param(
  [string]$SdkRoot = 'D:\Android\Sdk',
  [string]$AdbExecutable = '',
  [switch]$AllowTestAdb,
  [string]$ApkPath = '',
  [string]$Serial = '',
  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$')]
  [string]$CheckpointName = 'bootstrap',
  [string]$EvidenceRoot = '',
  [switch]$SkipInstall,
  [switch]$Restart,
  [switch]$PreflightOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$packageName = 'dev.selfimprovement.tracker'
$mainActivity = "$packageName/.MainActivity"
if (-not $ApkPath) {
  $ApkPath = Join-Path $PSScriptRoot '..\android\app\build\outputs\apk\debug\app-debug.apk'
}
if (-not $EvidenceRoot) {
  $EvidenceRoot = Join-Path $PSScriptRoot '..\output\android-smoke'
}
$resolvedSdkRoot = [System.IO.Path]::GetFullPath($SdkRoot)
$resolvedApkPath = [System.IO.Path]::GetFullPath($ApkPath)
$resolvedEvidenceRoot = [System.IO.Path]::GetFullPath($EvidenceRoot)
$resolvedAdbExecutable = if ($AdbExecutable) {
  [System.IO.Path]::GetFullPath($AdbExecutable)
} else {
  Join-Path $resolvedSdkRoot 'platform-tools\adb.exe'
}
$evidenceKind = if ($AdbExecutable) { 'test-double-not-native' } else { 'android-runtime' }

if (-not (Test-Path -LiteralPath $resolvedAdbExecutable -PathType Leaf)) {
  throw "ADB not found at $resolvedAdbExecutable. Pass the pinned Android SDK root with -SdkRoot."
}
if ($AdbExecutable -and -not $AllowTestAdb) {
  throw 'An injected ADB executable is test-only. Re-run with -AllowTestAdb; generated evidence will be permanently marked non-native.'
}
if (-not $PreflightOnly -and -not $SkipInstall -and -not (Test-Path -LiteralPath $resolvedApkPath -PathType Leaf)) {
  throw "Debug APK not found at $resolvedApkPath. Build assembleDebug first or pass -ApkPath."
}
if ([System.IO.Path]::GetPathRoot($resolvedEvidenceRoot) -eq $resolvedEvidenceRoot) {
  throw "Refusing to use a drive root as EvidenceRoot: $resolvedEvidenceRoot"
}

function Invoke-AdbText {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [switch]$AllowFailure
  )

  $lines = & $resolvedAdbExecutable @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = (($lines | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
  if (-not $AllowFailure -and $exitCode -ne 0) {
    throw "adb $($Arguments -join ' ') failed with exit code $exitCode.`n$text"
  }
  return $text
}

function Write-Utf8File {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [string]$Contents
  )

  [System.IO.File]::WriteAllText($Path, $Contents + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
}

function Invoke-DeviceAdbText {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [switch]$AllowFailure
  )

  return Invoke-AdbText -Arguments (@('-s', $script:selectedSerial) + $Arguments) -AllowFailure:$AllowFailure
}

$devicesOutput = Invoke-AdbText -Arguments @('devices', '-l')
$availableDevices = @(
  $devicesOutput -split "`r?`n" |
    ForEach-Object {
      if ($_ -match '^(\S+)\s+device(?:\s|$)') { $Matches[1] }
    }
)

if ($Serial) {
  if ($availableDevices -notcontains $Serial) {
    throw "Requested device '$Serial' is not in the ready 'device' state.`n$devicesOutput"
  }
  $script:selectedSerial = $Serial
} elseif ($availableDevices.Count -eq 1) {
  $script:selectedSerial = $availableDevices[0]
} elseif ($availableDevices.Count -eq 0) {
  throw "No ready Android device found. Start the API 36 AVD after WHPX is available, or connect an authorized API 33+ device.`n$devicesOutput"
} else {
  throw "Multiple Android devices are ready. Re-run with -Serial <serial>.`n$devicesOutput"
}

$apiLevelText = Invoke-DeviceAdbText -Arguments @('shell', 'getprop', 'ro.build.version.sdk')
$apiLevel = 0
if (-not [int]::TryParse($apiLevelText.Trim(), [ref]$apiLevel) -or $apiLevel -lt 33) {
  throw "Device $script:selectedSerial reports unsupported API level '$apiLevelText'; N0 requires API 33+."
}

$model = Invoke-DeviceAdbText -Arguments @('shell', 'getprop', 'ro.product.model')
$fingerprint = Invoke-DeviceAdbText -Arguments @('shell', 'getprop', 'ro.build.fingerprint')
if ($PreflightOnly) {
  Write-Output "Android smoke preflight passed: serial=$script:selectedSerial api=$apiLevel model=$model"
  exit 0
}

$apkSha256 = if (Test-Path -LiteralPath $resolvedApkPath -PathType Leaf) {
  (Get-FileHash -LiteralPath $resolvedApkPath -Algorithm SHA256).Hash.ToLowerInvariant()
} else {
  'not-read-skip-install'
}
$installOutput = if ($SkipInstall) {
  'Skipped by -SkipInstall.'
} else {
  Invoke-DeviceAdbText -Arguments @('install', '-r', $resolvedApkPath)
}
if (-not $SkipInstall -and $installOutput -notmatch '(?m)^Success\s*$') {
  throw "ADB install did not report Success.`n$installOutput"
}
$packagePathOutput = Invoke-DeviceAdbText -Arguments @('shell', 'pm', 'path', $packageName)
$basePackageLine = $packagePathOutput -split "`r?`n" | Where-Object { $_ -match '^package:.*/base\.apk$' } | Select-Object -First 1
if (-not $basePackageLine) {
  throw "Installed base.apk path was not found for $packageName.`n$packagePathOutput"
}
$installedApkPath = $basePackageLine.Substring('package:'.Length)
$installedHashOutput = Invoke-DeviceAdbText -Arguments @('shell', 'sha256sum', $installedApkPath)
if ($installedHashOutput -notmatch '^([0-9a-fA-F]{64})(?:\s|$)') {
  throw "Could not read the installed base.apk SHA-256.`n$installedHashOutput"
}
$installedApkSha256 = $Matches[1].ToLowerInvariant()
if ($apkSha256 -ne 'not-read-skip-install' -and $installedApkSha256 -ne $apkSha256) {
  throw "Installed APK SHA-256 does not match the local debug APK. Re-run without -SkipInstall."
}

$logSince = Invoke-DeviceAdbText -Arguments @('shell', 'date', '+%m-%d %H:%M:%S.000')
if ($Restart) {
  Invoke-DeviceAdbText -Arguments @('shell', 'am', 'force-stop', $packageName) | Out-Null
}
$launchOutput = Invoke-DeviceAdbText -Arguments @('shell', 'am', 'start', '-W', '-n', $mainActivity)
if ($launchOutput -notmatch '(?m)^Status:\s+ok\s*$') {
  throw "Android activity launch did not report Status: ok.`n$launchOutput"
}
Start-Sleep -Seconds 2

$appProcessId = Invoke-DeviceAdbText -Arguments @('shell', 'pidof', $packageName) -AllowFailure
if (-not $appProcessId) {
  $crashLog = Invoke-DeviceAdbText -Arguments @('logcat', '-d', '-T', $logSince, 'AndroidRuntime:E', 'ActivityTaskManager:W', '*:S') -AllowFailure
  $packageCrashLines = (($crashLog -split "`r?`n" | Select-String -Pattern "FATAL EXCEPTION|$([regex]::Escape($packageName))") -join [Environment]::NewLine).Trim()
  throw "The application process is not running after launch.`n$launchOutput`n$packageCrashLines"
}

$internetPermission = Invoke-DeviceAdbText -Arguments @('shell', 'pm', 'check-permission', 'android.permission.INTERNET', $packageName) -AllowFailure
if ($internetPermission -notmatch '(?i)denied') {
  throw "Security gate failed: INTERNET permission was not reported denied. Result: $internetPermission"
}

$notificationPermission = Invoke-DeviceAdbText -Arguments @('shell', 'pm', 'check-permission', 'android.permission.POST_NOTIFICATIONS', $packageName) -AllowFailure
$notificationAppOp = Invoke-DeviceAdbText -Arguments @('shell', 'appops', 'get', $packageName, 'POST_NOTIFICATION') -AllowFailure
$airplaneMode = Invoke-DeviceAdbText -Arguments @('shell', 'settings', 'get', 'global', 'airplane_mode_on') -AllowFailure
$wifiStatus = Invoke-DeviceAdbText -Arguments @('shell', 'cmd', 'wifi', 'status') -AllowFailure
$databaseListing = ''
for ($attempt = 1; $attempt -le 10; $attempt += 1) {
  $databaseListing = Invoke-DeviceAdbText -Arguments @('shell', 'run-as', $packageName, 'ls', '-la', 'databases') -AllowFailure
  if ($databaseListing -match '(?m)self_improvement_trackerSQLite\.db(?:\s|$)') { break }
  Start-Sleep -Seconds 1
}
if ($databaseListing -notmatch '(?m)self_improvement_trackerSQLite\.db(?:\s|$)') {
  throw "SQLite initialization gate failed: expected self_improvement_trackerSQLite.db was not found.`n$databaseListing"
}
$alarmDump = Invoke-DeviceAdbText -Arguments @('shell', 'dumpsys', 'alarm') -AllowFailure
$packageAlarms = (($alarmDump -split "`r?`n" | Select-String -SimpleMatch $packageName) -join [Environment]::NewLine).Trim()
if (-not $packageAlarms) { $packageAlarms = 'No package-specific alarm lines found at this checkpoint.' }
$errorLog = Invoke-DeviceAdbText -Arguments @('logcat', '-d', '-T', $logSince, "--pid=$appProcessId", '*:E') -AllowFailure
$fatalLines = (($errorLog -split "`r?`n" | Select-String -Pattern 'FATAL EXCEPTION|AndroidRuntime') -join [Environment]::NewLine).Trim()
if ($fatalLines) {
  throw "Fatal application log lines found after launch.`n$fatalLines"
}

$safeSerial = $script:selectedSerial -replace '[^A-Za-z0-9._-]', '_'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$evidencePrefix = if ($evidenceKind -eq 'android-runtime') { $timestamp } else { "TEST-ONLY-$timestamp" }
$evidenceDirectory = Join-Path $resolvedEvidenceRoot "$evidencePrefix-$safeSerial-$CheckpointName"
New-Item -ItemType Directory -Path $evidenceDirectory -Force | Out-Null

$metadata = @(
  '# Android smoke checkpoint evidence',
  '',
  "- evidence_kind: $evidenceKind",
  "- checkpoint: $CheckpointName",
  "- captured_at_local: $((Get-Date).ToString('o'))",
  "- serial: $script:selectedSerial",
  "- model: $model",
  "- api_level: $apiLevel",
  "- fingerprint: $fingerprint",
  "- package: $packageName",
  "- process_id: $appProcessId",
  "- local_apk_path: $resolvedApkPath",
  "- local_apk_sha256: $apkSha256",
  "- installed_apk_path: $installedApkPath",
  "- installed_apk_sha256: $installedApkSha256",
  "- restart_before_launch: $([bool]$Restart)",
  "- install_skipped: $([bool]$SkipInstall)",
  "- internet_permission: $internetPermission",
  "- notification_permission: $notificationPermission",
  "- airplane_mode_on: $airplaneMode",
  '',
  'This checkpoint proves installation/runtime state only. Manual UI outcomes must still be checked in docs/testing/android-smoke.md.'
) -join [Environment]::NewLine

Write-Utf8File -Path (Join-Path $evidenceDirectory 'evidence.md') -Contents $metadata
Write-Utf8File -Path (Join-Path $evidenceDirectory 'install.txt') -Contents $installOutput
Write-Utf8File -Path (Join-Path $evidenceDirectory 'launch.txt') -Contents $launchOutput
Write-Utf8File -Path (Join-Path $evidenceDirectory 'notification-appop.txt') -Contents $notificationAppOp
Write-Utf8File -Path (Join-Path $evidenceDirectory 'wifi-status.txt') -Contents $wifiStatus
Write-Utf8File -Path (Join-Path $evidenceDirectory 'database-files.txt') -Contents $databaseListing
Write-Utf8File -Path (Join-Path $evidenceDirectory 'package-alarms.txt') -Contents $packageAlarms
Write-Utf8File -Path (Join-Path $evidenceDirectory 'application-errors.txt') -Contents $errorLog

if ($evidenceKind -eq 'android-runtime') {
  Write-Output "Android smoke checkpoint captured: $evidenceDirectory"
} else {
  Write-Output "Android smoke test-double checkpoint captured (NOT NATIVE EVIDENCE): $evidenceDirectory"
}
Write-Output "Manual checklist remains authoritative: docs/testing/android-smoke.md"
