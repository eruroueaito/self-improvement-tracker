<#
Module: Android smoke runner fake ADB
Responsibility: Return deterministic ADB protocol responses for offline contract tests
Input/Output: Accept ADB-style argv and emit scenario-controlled text with a process-style exit code
Dependencies: SIT_FAKE_ADB_SCENARIO and SIT_FAKE_APK_SHA256 environment variables
Notes: Test fixture only; its output must never be treated as Android runtime evidence
#>
Set-StrictMode -Version Latest

$scenario = if ($env:SIT_FAKE_ADB_SCENARIO) { $env:SIT_FAKE_ADB_SCENARIO } else { 'success' }
$arguments = @($args)
$commandArguments = if ($arguments.Count -ge 2 -and $arguments[0] -eq '-s') {
  @($arguments[2..($arguments.Count - 1)])
} else {
  $arguments
}
$command = $commandArguments -join ' '
$global:LASTEXITCODE = 0

if ($command -eq 'devices -l') {
  if ($scenario -eq 'multiple-devices') {
    Write-Output "List of devices attached`nemulator-5554 device product:sdk model:Fake_One`nemulator-5556 device product:sdk model:Fake_Two"
  } else {
    Write-Output "List of devices attached`nemulator-5554 device product:sdk model:Fake_Device"
  }
  return
}

switch -Regex ($command) {
  '^shell getprop ro\.build\.version\.sdk$' {
    Write-Output $(if ($scenario -eq 'api-32') { '32' } else { '36' })
    return
  }
  '^shell getprop ro\.product\.model$' {
    Write-Output 'Fake API 36 Device'
    return
  }
  '^shell getprop ro\.build\.fingerprint$' {
    Write-Output 'fake/sdk_gphone64_x86_64/emu64:16/TEST/1:userdebug/test-keys'
    return
  }
  '^install -r .+$' {
    if ($scenario -eq 'install-text-failure') {
      Write-Output 'Failure [INSTALL_FAILED_TEST_ONLY]'
    } else {
      Write-Output "Performing Streamed Install`nSuccess"
    }
    return
  }
  '^shell pm path dev\.selfimprovement\.tracker$' {
    Write-Output 'package:/data/app/fake/dev.selfimprovement.tracker/base.apk'
    return
  }
  '^shell sha256sum /data/app/fake/dev\.selfimprovement\.tracker/base\.apk$' {
    $hash = if ($scenario -eq 'hash-mismatch') { '0' * 64 } else { $env:SIT_FAKE_APK_SHA256 }
    Write-Output "$hash  /data/app/fake/dev.selfimprovement.tracker/base.apk"
    return
  }
  '^shell date \+%m-%d %H:%M:%S\.000$' {
    Write-Output '08-04 21:10:00.000'
    return
  }
  '^shell am force-stop dev\.selfimprovement\.tracker$' { return }
  '^shell am start -W -n dev\.selfimprovement\.tracker/\.MainActivity$' {
    Write-Output "Starting: Intent { cmp=dev.selfimprovement.tracker/.MainActivity }`nStatus: ok`nLaunchState: COLD`nActivity: dev.selfimprovement.tracker/.MainActivity"
    return
  }
  '^shell pidof dev\.selfimprovement\.tracker$' {
    if ($scenario -ne 'crash') { Write-Output '4242' }
    return
  }
  '^logcat -d -T 08-04 21:10:00\.000 AndroidRuntime:E ActivityTaskManager:W \*:S$' {
    if ($scenario -eq 'crash') {
      Write-Output '08-04 21:10:01.000 E AndroidRuntime: FATAL EXCEPTION: main dev.selfimprovement.tracker'
    }
    return
  }
  '^shell pm check-permission android\.permission\.INTERNET dev\.selfimprovement\.tracker$' {
    Write-Output $(if ($scenario -eq 'internet-granted') { 'granted' } else { 'denied' })
    return
  }
  '^shell pm check-permission android\.permission\.POST_NOTIFICATIONS dev\.selfimprovement\.tracker$' {
    Write-Output 'granted'
    return
  }
  '^shell appops get dev\.selfimprovement\.tracker POST_NOTIFICATION$' {
    Write-Output 'POST_NOTIFICATION: allow'
    return
  }
  '^shell settings get global airplane_mode_on$' {
    Write-Output '1'
    return
  }
  '^shell cmd wifi status$' {
    Write-Output 'Wi-Fi is disabled'
    return
  }
  '^shell run-as dev\.selfimprovement\.tracker ls -la databases$' {
    Write-Output '-rw------- 1 u0_a123 u0_a123 40960 self_improvement_trackerSQLite.db'
    return
  }
  '^shell dumpsys alarm$' {
    Write-Output 'RTC_WAKEUP #0: Alarm{fake type 0 dev.selfimprovement.tracker}'
    return
  }
  '^logcat -d -T 08-04 21:10:00\.000 --pid=4242 \*:E$' { return }
  default {
    Write-Error "Unexpected fake ADB command: $command"
    $global:LASTEXITCODE = 99
    return
  }
}
