<#
Module: Android smoke runner offline contract tests
Responsibility: Exercise runner success and safety branches without claiming native Android evidence
Input/Output: Creates isolated temporary fixtures, asserts results, removes them, and returns a process exit code
Dependencies: Windows PowerShell 5.1, run-android-smoke.ps1, and test-fixtures/fake-adb.ps1
Notes: Fake ADB proves orchestration only; N0 still requires a real emulator or physical device
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$runnerPath = Join-Path $PSScriptRoot 'run-android-smoke.ps1'
$fakeAdbPath = Join-Path $PSScriptRoot 'test-fixtures\fake-adb.ps1'
$temporaryBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$testRoot = [System.IO.Path]::GetFullPath((Join-Path $temporaryBase ("sit-android-smoke-contract-" + [guid]::NewGuid().ToString('N'))))
if (-not $testRoot.StartsWith($temporaryBase, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing unsafe test root outside the system temp directory: $testRoot"
}

function Invoke-Runner {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Scenario,
    [Parameter(Mandatory = $true)]
    [string]$EvidenceRoot,
    [string[]]$AdditionalArguments = @(),
    [switch]$OmitTestAdbAuthorization
  )

  $env:SIT_FAKE_ADB_SCENARIO = $Scenario
  $runnerArguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $runnerPath,
    '-AdbExecutable', $fakeAdbPath,
    '-ApkPath', $script:fakeApkPath,
    '-EvidenceRoot', $EvidenceRoot
  )
  if (-not $OmitTestAdbAuthorization) { $runnerArguments += '-AllowTestAdb' }
  $runnerArguments += $AdditionalArguments
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & powershell.exe @runnerArguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  return [pscustomobject]@{
    ExitCode = $exitCode
    Text = (($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine)
  }
}

function Assert-Result {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Result,
    [Parameter(Mandatory = $true)]
    [int]$ExpectedExitCode,
    [Parameter(Mandatory = $true)]
    [string]$ExpectedText
  )

  if ($Result.ExitCode -ne $ExpectedExitCode) {
    throw "Expected exit $ExpectedExitCode, got $($Result.ExitCode).`n$($Result.Text)"
  }
  if ($Result.Text -notmatch [regex]::Escape($ExpectedText)) {
    throw "Expected output to contain '$ExpectedText'.`n$($Result.Text)"
  }
}

New-Item -ItemType Directory -Path $testRoot | Out-Null
$script:fakeApkPath = Join-Path $testRoot 'app-debug.apk'
[System.IO.File]::WriteAllBytes($script:fakeApkPath, [byte[]](0..255))
$env:SIT_FAKE_APK_SHA256 = (Get-FileHash -LiteralPath $script:fakeApkPath -Algorithm SHA256).Hash.ToLowerInvariant()

try {
  $successRoot = Join-Path $testRoot 'success-evidence'
  $success = Invoke-Runner -Scenario 'success' -EvidenceRoot $successRoot -AdditionalArguments @('-Restart', '-CheckpointName', 'contract-success')
  Assert-Result -Result $success -ExpectedExitCode 0 -ExpectedText 'Android smoke test-double checkpoint captured (NOT NATIVE EVIDENCE):'
  $evidenceDirectories = @(Get-ChildItem -LiteralPath $successRoot -Directory)
  if ($evidenceDirectories.Count -ne 1) { throw "Expected one evidence directory, found $($evidenceDirectories.Count)." }
  if ($evidenceDirectories[0].Name -notmatch '^TEST-ONLY-') { throw 'Fake ADB evidence directory is missing its TEST-ONLY prefix.' }
  $requiredFiles = @('evidence.md', 'install.txt', 'launch.txt', 'notification-appop.txt', 'wifi-status.txt', 'database-files.txt', 'package-alarms.txt', 'application-errors.txt')
  foreach ($requiredFile in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $evidenceDirectories[0].FullName $requiredFile) -PathType Leaf)) {
      throw "Missing contract evidence file: $requiredFile"
    }
  }
  $metadata = Get-Content -Raw -Encoding utf8 (Join-Path $evidenceDirectories[0].FullName 'evidence.md')
  foreach ($expectedMetadata in @('evidence_kind: test-double-not-native', 'api_level: 36', 'internet_permission: denied', "local_apk_sha256: $env:SIT_FAKE_APK_SHA256", "installed_apk_sha256: $env:SIT_FAKE_APK_SHA256")) {
    if ($metadata -notmatch [regex]::Escape($expectedMetadata)) { throw "Missing evidence metadata: $expectedMetadata" }
  }

  $api32 = Invoke-Runner -Scenario 'api-32' -EvidenceRoot (Join-Path $testRoot 'api32') -AdditionalArguments @('-PreflightOnly')
  Assert-Result -Result $api32 -ExpectedExitCode 1 -ExpectedText 'N0 requires API 33+'

  $injectionGuard = Invoke-Runner -Scenario 'success' -EvidenceRoot (Join-Path $testRoot 'injection-guard') -AdditionalArguments @('-PreflightOnly') -OmitTestAdbAuthorization
  Assert-Result -Result $injectionGuard -ExpectedExitCode 1 -ExpectedText 'An injected ADB executable is test-only'

  $multiple = Invoke-Runner -Scenario 'multiple-devices' -EvidenceRoot (Join-Path $testRoot 'multiple') -AdditionalArguments @('-PreflightOnly')
  Assert-Result -Result $multiple -ExpectedExitCode 1 -ExpectedText 'Multiple Android devices are ready'
  $selected = Invoke-Runner -Scenario 'multiple-devices' -EvidenceRoot (Join-Path $testRoot 'selected') -AdditionalArguments @('-PreflightOnly', '-Serial', 'emulator-5554')
  Assert-Result -Result $selected -ExpectedExitCode 0 -ExpectedText 'Android smoke preflight passed:'

  $hashMismatch = Invoke-Runner -Scenario 'hash-mismatch' -EvidenceRoot (Join-Path $testRoot 'hash-mismatch')
  Assert-Result -Result $hashMismatch -ExpectedExitCode 1 -ExpectedText 'Installed APK SHA-256 does not match'

  $installTextFailure = Invoke-Runner -Scenario 'install-text-failure' -EvidenceRoot (Join-Path $testRoot 'install-text-failure')
  Assert-Result -Result $installTextFailure -ExpectedExitCode 1 -ExpectedText 'ADB install did not report Success'

  $internetGranted = Invoke-Runner -Scenario 'internet-granted' -EvidenceRoot (Join-Path $testRoot 'internet-granted')
  Assert-Result -Result $internetGranted -ExpectedExitCode 1 -ExpectedText 'Security gate failed: INTERNET permission'

  $crash = Invoke-Runner -Scenario 'crash' -EvidenceRoot (Join-Path $testRoot 'crash')
  Assert-Result -Result $crash -ExpectedExitCode 1 -ExpectedText 'The application process is not running after launch'

  Write-Output 'Android smoke runner offline contract passed: success, API gate, device selection, install/hash, network permission, and crash paths.'
} finally {
  Remove-Item Env:SIT_FAKE_ADB_SCENARIO -ErrorAction SilentlyContinue
  Remove-Item Env:SIT_FAKE_APK_SHA256 -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $testRoot) {
    $resolvedDeleteTarget = [System.IO.Path]::GetFullPath($testRoot)
    if (-not $resolvedDeleteTarget.StartsWith($temporaryBase, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing unsafe recursive test cleanup: $resolvedDeleteTarget"
    }
    [System.IO.Directory]::Delete($resolvedDeleteTarget, $true)
  }
}
