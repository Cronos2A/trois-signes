# Réglages communs des scripts d'emballage (docs/EMBALLAGE.md) : Java d'Android Studio, SDK Android, dossiers.
# Ne pas lancer seul : les autres scripts le chargent (. "$PSScriptRoot\env.ps1").
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path "$PSScriptRoot\..\..").Path            # dossier du jeu
$Android = Join-Path $Root 'android'
$KeyDir = Join-Path $env:USERPROFILE '.three-signs'           # clé d'envoi et ses réglages : HORS du dépôt
$KeyStore = Join-Path $KeyDir 'three-signs-upload.jks'
$KeyProps = Join-Path $KeyDir 'keystore.properties'

# Java : celui fourni avec Android Studio (jbr), sauf si JAVA_HOME est déjà réglé.
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
  foreach ($j in @("$env:ProgramFiles\Android\Android Studio\jbr", "$env:LOCALAPPDATA\Programs\Android Studio\jbr", "$env:ProgramFiles\Android\Android Studio\jre")) {
    if (Test-Path "$j\bin\java.exe") { $env:JAVA_HOME = $j; break }
  }
}
if (-not $env:JAVA_HOME) { throw "Java introuvable : installe Android Studio (il fournit Java), ou règle JAVA_HOME." }
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# SDK Android : C:\Users\<toi>\AppData\Local\Android\Sdk par défaut.
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
if (-not (Test-Path $env:ANDROID_HOME)) { throw "SDK Android introuvable dans $env:ANDROID_HOME (Android Studio → Settings → Android SDK)." }
$Adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
# Gradle lit le chemin du SDK dans android\local.properties (fichier propre à ton PC, jamais dans le dépôt).
"sdk.dir=$($env:ANDROID_HOME -replace '\\','\\')" | Set-Content -Encoding ASCII (Join-Path $Android 'local.properties')

# Demande un mot de passe sans l'afficher (jamais écrit sur le disque).
function Read-Secret($prompt) {
  $s = Read-Host $prompt -AsSecureString
  [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}
function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Done($t) { Write-Host $t -ForegroundColor Green }

# Construit le dossier www (le jeu) et le copie dans le projet Android.
function Sync-Web {
  Step "Préparation du jeu (www) et copie dans android"
  Push-Location $Root
  try { node tools/android/build-www.mjs; if ($LASTEXITCODE) { throw "build-www a échoué" }
        npx cap sync android; if ($LASTEXITCODE) { throw "cap sync a échoué" } }
  finally { Pop-Location }
}
