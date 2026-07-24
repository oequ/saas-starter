#Requires -Version 5.1
<#
.SYNOPSIS
  Local debug APK for apps/native (Expo prebuild + Gradle).

.NOTES
  Requires JDK 17+ and Android SDK. See BUILD_ANDROID.md.
#>
param(
  [ValidateSet('debug', 'release')]
  [string]$Variant = 'debug',
  [switch]$SkipPrebuild
)

$ErrorActionPreference = 'Stop'
$AppRoot = Split-Path -Parent $PSScriptRoot
Set-Location $AppRoot

function Find-AndroidSdk {
  if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) { return $env:ANDROID_HOME }
  if ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) { return $env:ANDROID_SDK_ROOT }
  $candidates = @(
    Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk'
    'C:\Android\Sdk'
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  return $null
}

function Find-JavaHome {
  if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    return $env:JAVA_HOME
  }
  $candidates = @(
    Join-Path ${env:ProgramFiles} 'Android\Android Studio\jbr'
    Join-Path ${env:ProgramFiles} 'Android\Android Studio\jre'
    Join-Path ${env:ProgramFiles} 'Eclipse Adoptium\jdk-17*'
    Join-Path ${env:ProgramFiles} 'Microsoft\jdk-17*'
  )
  foreach ($pattern in $candidates) {
    $hit = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit -and (Test-Path (Join-Path $hit.FullName 'bin\java.exe'))) {
      return $hit.FullName
    }
  }
  return $null
}

Write-Host '== Oequ Companion local APK ==' -ForegroundColor Cyan

$sdk = Find-AndroidSdk
$javaHome = Find-JavaHome

if (-not $sdk) {
  Write-Host @'
Android SDK not found.
Install Android Studio, then re-run this script.
See BUILD_ANDROID.md
'@ -ForegroundColor Yellow
  exit 1
}

if (-not $javaHome) {
  Write-Host @'
JDK not found (need 17+).
Install Android Studio (includes JBR) or Temurin 17, set JAVA_HOME, re-run.
See BUILD_ANDROID.md
'@ -ForegroundColor Yellow
  exit 1
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:JAVA_HOME = $javaHome
$env:PATH = "$(Join-Path $javaHome 'bin');$(Join-Path $sdk 'platform-tools');$env:PATH"

Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
Write-Host "JAVA_HOME=$env:JAVA_HOME"
& java -version

if (-not $SkipPrebuild) {
  Write-Host 'Running expo prebuild (android)...' -ForegroundColor Cyan
  npx expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$gradlew = Join-Path $AppRoot 'android\gradlew.bat'
if (-not (Test-Path $gradlew)) {
  Write-Host 'android/gradlew.bat missing after prebuild.' -ForegroundColor Red
  exit 1
}

# Expo prebuild resets app/build.gradle. Force JS+assets into every APK so
# sideload works without Metro ("Unable to load script").
$appGradle = Join-Path $AppRoot 'android\app\build.gradle'
if (Test-Path $appGradle) {
  $gradleText = Get-Content -Raw -Path $appGradle
  if ($gradleText -notmatch 'debuggableVariants\s*=\s*\[\]') {
    $patched = $gradleText -replace '(bundleCommand\s*=\s*"export:embed")', @"
`$1

    // Bundle JS into every APK (including debug) so sideload works without Metro.
    debuggableVariants = []
"@
    if ($patched -ne $gradleText) {
      Set-Content -Path $appGradle -Value $patched -NoNewline
      Write-Host 'Patched android/app/build.gradle: debuggableVariants = []' -ForegroundColor Cyan
    }
  }
}

$task = if ($Variant -eq 'release') { 'assembleRelease' } else { 'assembleDebug' }
Write-Host "Gradle $task (arm64-v8a) ..." -ForegroundColor Cyan
Push-Location (Join-Path $AppRoot 'android')
try {
  & .\gradlew.bat $task --no-daemon "-PreactNativeArchitectures=arm64-v8a"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
  Pop-Location
}

$apkSrc = if ($Variant -eq 'release') {
  Join-Path $AppRoot 'android\app\build\outputs\apk\release\app-release.apk'
} else {
  Join-Path $AppRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
}

if (-not (Test-Path $apkSrc)) {
  # Some AGP layouts use different names
  $apkSrc = Get-ChildItem -Path (Join-Path $AppRoot 'android\app\build\outputs\apk') -Recurse -Filter '*.apk' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}

if (-not $apkSrc -or -not (Test-Path $apkSrc)) {
  Write-Host 'APK not found under android/app/build/outputs/apk' -ForegroundColor Red
  exit 1
}

$outDir = Join-Path $AppRoot 'dist-apk'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outName = "oequ-companion-$Variant.apk"
$outPath = Join-Path $outDir $outName
Copy-Item -Force $apkSrc $outPath

Write-Host ''
Write-Host "APK ready: $outPath" -ForegroundColor Green
Write-Host "Source:    $apkSrc"
Write-Host 'Install on phone (unknown sources allowed), package io.oequ.companion'
