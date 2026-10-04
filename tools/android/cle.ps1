# Crée la clé d'envoi (upload keystore) de Three Signs, HORS du dépôt : %USERPROFILE%\.three-signs\three-signs-upload.jks
# Une seule fois dans la vie de l'application. Voir docs/EMBALLAGE.md, étape 4.
. "$PSScriptRoot\env.ps1"
if (Test-Path $KeyStore) { Write-Host "La clé existe déjà : $KeyStore" -ForegroundColor Yellow; Write-Host "Ne la recrée pas : garde celle-ci (et ses copies)."; exit 0 }
New-Item -ItemType Directory -Force $KeyDir | Out-Null
Step "Création de la clé d'envoi (keytool va te poser des questions)"
Write-Host "Mot de passe : au moins 6 caractères, NOTE-LE dans ton gestionnaire de mots de passe AVANT de continuer."
Write-Host "Prénom et nom : ton nom ou Cronos2A ; unité, organisation, ville… : ce que tu veux ; code pays : FR ; à la fin réponds oui."
& keytool -genkeypair -v -keystore $KeyStore -alias upload -keyalg RSA -keysize 4096 -validity 10000
if ($LASTEXITCODE -or -not (Test-Path $KeyStore)) { throw "La clé n'a pas été créée." }
# Réglages de la clé (sans mot de passe : il est demandé à chaque fabrication de l'AAB).
"storeFile=$($KeyStore -replace '\\','/')`nkeyAlias=upload" | Set-Content -Encoding ASCII $KeyProps
Done "Clé créée : $KeyStore"
Write-Host "Maintenant : fais-en DEUX copies (clé USB + coffre en ligne), voir docs/EMBALLAGE.md 4.2."
Write-Host ""
Step "Empreintes de la clé d'envoi (SHA-1 à donner à Firebase)"
$pw = Read-Secret "Retape le mot de passe de la clé (pour lire ses empreintes)"
& keytool -list -v -keystore $KeyStore -alias upload -storepass $pw | Select-String 'SHA1:|SHA256:'
$pw = $null
