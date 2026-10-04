# Affiche les empreintes SHA-1 (et SHA-256) de la clé de débogage et de la clé d'envoi (docs/EMBALLAGE.md, étapes 4 et 5).
. "$PSScriptRoot\env.ps1"
$debug = Join-Path $env:USERPROFILE '.android\debug.keystore'
Step "Clé de DÉBOGAGE (APK de test) : $debug"
if (Test-Path $debug) { Show-Fingerprints $debug 'androiddebugkey' 'android' }
else { Write-Host "Pas encore créée : lance d'abord tools\android\apk.ps1 une fois (elle est créée à la première compilation)." -ForegroundColor Yellow }
Step "Clé d'ENVOI (AAB pour la Play Console) : $KeyStore"
if (Test-Path $KeyStore) { $pw = Read-Secret "Mot de passe de la clé d'envoi"; Show-Fingerprints $KeyStore 'upload' $pw; $pw = $null }
else { Write-Host "Pas encore créée : lance tools\android\cle.ps1." -ForegroundColor Yellow }
