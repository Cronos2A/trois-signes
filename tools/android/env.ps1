# Réglages communs des scripts d'emballage (docs/EMBALLAGE.md) : JDK 21 (Adoptium), SDK Android, dossiers.
# Ne pas lancer seul : les autres scripts le chargent (. "$PSScriptRoot\env.ps1").
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path "$PSScriptRoot\..\..").Path            # dossier du jeu
$Android = Join-Path $Root 'android'
$KeyDir = Join-Path $env:USERPROFILE '.three-signs'           # clé d'envoi et ses réglages : HORS du dépôt
$KeyStore = Join-Path $KeyDir 'three-signs-upload.jks'
$KeyProps = Join-Path $KeyDir 'keystore.properties'

# Java : un JDK 21 (Eclipse Adoptium / Temurin), JAMAIS celui d'Android Studio (sa version peut être trop récente pour Gradle).
# Cherché dans : JAVA_HOME s'il désigne déjà un JDK 21 hors d'Android Studio, puis
#   %LOCALAPPDATA%\Programs\Eclipse Adoptium\jdk-21*  et  %ProgramFiles%\Eclipse Adoptium\jdk-21*  (le plus récent).
# JAVA_HOME et Path ne sont changés que pour ce script (la fenêtre PowerShell retrouve les siens ensuite).
$JdkLink = 'https://adoptium.net/temurin/releases/?version=21'
function Get-JavaMajor([string]$dir) {
  $exe = Join-Path $dir 'bin\java.exe'
  if (-not (Test-Path $exe)) { return $null }
  $ErrorActionPreference = 'Continue'                         # java -version écrit sur stderr : ce n'est pas une erreur
  $txt = (& $exe -version 2>&1 | ForEach-Object { "$_" }) -join "`n"
  if ($txt -match 'version "(\d+)') { return [int]$Matches[1] }
  return $null
}
function Find-Jdk21 {
  $cands = @()
  if ($env:JAVA_HOME -and $env:JAVA_HOME -notmatch 'Android Studio') { $cands += $env:JAVA_HOME }
  foreach ($base in @("$env:LOCALAPPDATA\Programs\Eclipse Adoptium", "$env:ProgramFiles\Eclipse Adoptium")) {
    if (Test-Path $base) {
      # le plus récent d'abord (numéros comparés comme des nombres : jdk-21.0.10 après jdk-21.0.9)
      $cands += Get-ChildItem $base -Directory -Filter 'jdk-21*' |
        Sort-Object { (([regex]::Matches($_.Name, '\d+') | ForEach-Object { $_.Value.PadLeft(6, '0') }) -join '.') } -Descending |
        ForEach-Object { $_.FullName }
    }
  }
  foreach ($c in $cands) { if ($c -notmatch 'Android Studio' -and (Get-JavaMajor $c) -eq 21) { return $c } }
  return $null
}
$jdk = Find-Jdk21
if (-not $jdk) {
  Write-Host ""
  Write-Host "JDK 21 introuvable." -ForegroundColor Red
  Write-Host "Les scripts ont besoin de Java 21 (le Java d'Android Studio n'est jamais utilisé)."
  Write-Host "Installe « Eclipse Temurin 21 (LTS) », version Windows x64, fichier .msi, en laissant les options par défaut :"
  Write-Host "  $JdkLink" -ForegroundColor Yellow
  Write-Host "Il doit s'installer dans « C:\Program Files\Eclipse Adoptium\jdk-21… » (ou dans ton dossier AppData\Local\Programs)."
  Write-Host "Ferme puis rouvre PowerShell, et relance le script."
  throw "JDK 21 introuvable"
}
$env:JAVA_HOME = $jdk
$env:Path = "$jdk\bin;$env:Path"
Write-Host "Java 21 : $jdk" -ForegroundColor DarkGray

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
  # Arguments entre guillemets : sans eux, PowerShell coupe « -J-Duser.language=en » au point (« Option non admise : .language=en »).
  $out = (& keytool "-J-Duser.language=en" "-J-Duser.country=US" -list -v -keystore $store -alias $alias -storepass $pass 2>&1 | Out-String)
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
  try { node "tools/android/build-www.mjs"; if ($LASTEXITCODE) { throw "build-www a échoué" }
        npx cap sync android; if ($LASTEXITCODE) { throw "cap sync a échoué" } }
  finally { Pop-Location }
}
