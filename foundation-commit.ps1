# ============================================================
# foundation-commit.ps1 - HALAQA gate H1 - OWNER-ONLY script
# Run: powershell -ExecutionPolicy Bypass -File "E:\projects\halaqa\foundation-commit.ps1"
# ============================================================
$ErrorActionPreference = "Continue"
Set-Location "E:\projects\halaqa"

function Stop-With($msg) { Write-Host "STOP: $msg" -ForegroundColor Red; exit 1 }

# 1) git identity check
$name  = git config user.name
$email = git config user.email
if (-not $name -or -not $email) { Stop-With "git identity missing. Run: git config --global user.name 'Your Name' ; git config --global user.email 'you@example.com' - then re-run." }

# 2) no pre-existing repo (no history rewrite - H7)
if (Test-Path ".git") { Stop-With ".git already exists. Refusing to touch history (H7)." }

# 3) GitHub repo via gh if available; otherwise manual instructions
$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
  gh auth status *> $null
  if ($LASTEXITCODE -eq 0) {
    gh repo view Ibrahem3/halaqa *> $null
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Creating public repo Ibrahem3/halaqa ..."
      gh repo create Ibrahem3/halaqa --public --description "HALAQA - Arabic community + academy platform (AGPL-3.0), built on burhan-platform core"
      if ($LASTEXITCODE -ne 0) { Stop-With "gh repo create failed. Create it manually at github.com/new (name: halaqa, Public, EMPTY - no README/license/gitignore) then re-run this script." }
    } else { Write-Host "Repo already exists - continuing." }
  } else { Stop-With "gh not authenticated. Run: gh auth login  (or create the repo manually at github.com/new: name halaqa, Public, EMPTY) then re-run." }
} else {
  Stop-With "gh CLI not installed. Create the repo manually: github.com/new -> name: halaqa -> Public -> EMPTY (no README/license/gitignore) -> then re-run this script."
}

# 4) founding commit (single, documented)
git init -b main
if ($LASTEXITCODE -ne 0) { Stop-With "git init failed." }
git add -A
git commit -m "Foundation: HALAQA gate H1 - transplant burhan-platform template (documented origin) + founding files | Source: Ibrahem3/burhan-platform@5b4d5b68531d7fac2fdfe96e0e64054076150829 | License: AGPL-3.0"
if ($LASTEXITCODE -ne 0) { Stop-With "git commit failed." }

# 5) remote + first push
git remote add origin https://github.com/Ibrahem3/halaqa.git
git push -u origin main
if ($LASTEXITCODE -ne 0) { Stop-With "push failed. If auth error: run 'gh auth login' or configure credentials, then run: git push -u origin main" }

# 6) live proof
Write-Host ""
Write-Host "=== RESULT ==="
git log --oneline
git remote -v
git ls-remote https://github.com/Ibrahem3/halaqa.git main
Write-Host ""
Write-Host "Open https://github.com/Ibrahem3/halaqa - verify files are visible - then paste THIS ENTIRE OUTPUT to the local agent."