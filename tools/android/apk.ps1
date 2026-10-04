# APK de TEST (débogage) : compile le jeu et l'installe sur le téléphone branché en USB (débogage USB activé).
# Usage : tools\android\apk.ps1           (compile + installe + lance)
#         tools\android\apk.ps1 -NoInstall (compile seulement : android\app\build\outputs\apk\debug\app-debug.apk)
param([switch]$NoInstall)
. "$PSScriptRoot\env.ps1"
Sync-Web
Step "Compilation de l'APK de débogage (la première fois : plusieurs minutes, Gradle télécharge ce qu'il faut)"
Push-Location $Android
try { & .\gradlew.bat assembleDebug; if ($LASTEXITCODE) { throw "La compilation a échoué (lis les lignes rouges au-dessus)." } }
finally { Pop-Location }
$apk = Join-Path $Android 'app\build\outputs\apk\debug\app-debug.apk'
Done ("APK prêt : $apk  (" + [math]::Round((Get-Item $apk).Length / 1MB, 1) + " Mo)")
if ($NoInstall) { exit 0 }
Step "Installation sur le téléphone"
$devices = & $Adb devices | Select-String "`tdevice$"
if (-not $devices) { throw "Aucun téléphone : branche-le en USB, déverrouille-le et accepte « Autoriser le débogage USB ». Puis relance." }
& $Adb install -r $apk; if ($LASTEXITCODE) { throw "Installation refusée (voir docs/EMBALLAGE.md 6.2)." }
& $Adb shell monkey -p com.cronos2a.troissignes -c android.intent.category.LAUNCHER 1 | Out-Null
Done "Installé et lancé sur le téléphone : Three Signs."
