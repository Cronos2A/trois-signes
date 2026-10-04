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
# Empreintes SHA-1 et SHA-256 d'une clé. keytool est forcé en anglais, ET les empreintes sont reconnues à leur forme
# (20 ou 32 paires hexadécimales séparées par « : »), quelle que soit la langue de ses libellés (« SHA1: », « SHA 1: »…).
function Get-Fingerprints([string]$store, [string]$alias, [string]$pass) {
  $ErrorActionPreference = 'Continue'                         # keytool peut écrire sur stderr sans que ce soit une erreur
  $out = (& keytool -J-Duser.language=en -J-Duser.country=US -list -v -keystore $store -alias $alias -storepass $pass 2>&1 | Out-String)
  $hex = '(?<![0-9A-Fa-f:])((?:[0-9A-Fa-f]{2}:){N}[0-9A-Fa-f]{2})(?![0-9A-Fa-f:])'
  $sha1 = [regex]::Match($out, $hex.Replace('N', '19'))
  $sha256 = [regex]::Match($out, $hex.Replace('N', '31'))
  [pscustomobject]@{
    SHA1 = $(if ($sha1.Success) { $sha1.Groups[1].Value.ToUpper() } else { $null })
    SHA256 = $(if ($sha256.Success) { $sha256.Groups[1].Value.ToUpper() } else { $null })
    Raw = $out
  }
}
function Show-Fingerprints([string]$store, [string]$alias, [string]$pass) {
  $f = Get-Fingerprints $store $alias $pass
  if (-not $f.SHA1) {
    Write-Host "Empreintes introuvables (mot de passe faux ?). Réponse de keytool :" -ForegroundColor Red
    Write-Host $f.Raw
    return
  }
  Write-Host ("SHA-1   : " + $f.SHA1) -ForegroundColor Green
  if ($f.SHA256) { Write-Host ("SHA-256 : " + $f.SHA256) }
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
