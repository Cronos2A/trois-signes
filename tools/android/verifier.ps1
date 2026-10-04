# Vérifie l'APK de test compilé (docs/EMBALLAGE.md, étape 6.4) : permissions réellement demandées (manifeste fusionné)
# et compatibilité avec les pages mémoire de 16 Ko (alignement). Lancer après tools\android\apk.ps1.
. "$PSScriptRoot\env.ps1"
$apk = Join-Path $Android 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apk)) { throw "Pas d'APK : lance d'abord tools\android\apk.ps1 -NoInstall." }
$bt = Get-ChildItem (Join-Path $env:ANDROID_HOME 'build-tools') -Directory | Sort-Object { [version]($_.Name -replace '-.*','') } | Select-Object -Last 1
if (-not $bt) { throw "build-tools introuvables dans le SDK (Android Studio → SDK Manager → SDK Tools → Android SDK Build-Tools)." }
Step "Permissions demandées par l'application ($($bt.Name))"
& (Join-Path $bt.FullName 'aapt.exe') dump permissions $apk
Step "Alignement 16 Ko (pages mémoire)"
& (Join-Path $bt.FullName 'zipalign.exe') -c -P 16 -v 4 $apk | Select-Object -Last 1
$so = & (Join-Path $bt.FullName 'aapt.exe') list $apk | Select-String '\.so$'
if ($so) { Write-Host "Bibliothèques natives :"; $so } else { Done "Aucune bibliothèque native (.so) : compatible 16 Ko d'office." }
