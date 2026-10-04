# AAB de PRODUCTION signé avec la clé d'envoi : le fichier à envoyer à la Play Console (docs/EMBALLAGE.md, étape 4.4).
. "$PSScriptRoot\env.ps1"
if (-not (Test-Path $KeyProps) -or -not (Test-Path $KeyStore)) { throw "Clé d'envoi absente : lance d'abord tools\android\cle.ps1." }
$v = Get-Content (Join-Path $Root 'data\version.json') -Raw | ConvertFrom-Json
$eco = Get-Content (Join-Path $Root 'data\economy.json') -Raw | ConvertFrom-Json
if ($eco.test.autorise) { throw "data\economy.json : test.autorise doit valoir false dans une application publiée." }
Write-Host ("Version : " + $v.version + "   versionCode : " + $v.build) -ForegroundColor Yellow
Write-Host "Chaque envoi à la Play Console doit avoir un versionCode PLUS GRAND que le précédent (data\version.json → build)."
$ok = Read-Host "Continuer avec ce versionCode ? (o/n)"
if ($ok -notmatch '^[oOyY]') { exit 1 }
$env:TS_STORE_PASSWORD = Read-Secret "Mot de passe de la clé d'envoi"
$env:TS_KEY_PASSWORD = $env:TS_STORE_PASSWORD
try {
  Sync-Web
  Step "Compilation de l'AAB signé"
  Push-Location $Android
  try { & .\gradlew.bat bundleRelease; if ($LASTEXITCODE) { throw "La compilation a échoué (mot de passe faux ? voir les lignes rouges)." } }
  finally { Pop-Location }
} finally { Remove-Item Env:TS_STORE_PASSWORD, Env:TS_KEY_PASSWORD -ErrorAction SilentlyContinue }
$aab = Join-Path $Android 'app\build\outputs\bundle\release\app-release.aab'
Step "Vérification de la signature"
& jarsigner -verify $aab | Select-Object -Last 1
$out = Join-Path $Root ("three-signs-" + $v.version + "-" + $v.build + ".aab")
Copy-Item $aab $out -Force
Done ("AAB prêt : $out  (" + [math]::Round((Get-Item $out).Length / 1MB, 1) + " Mo)")
Write-Host "Envoie ce fichier dans la Play Console (Tests → Test interne → Créer une version)."
