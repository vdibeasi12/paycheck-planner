# apply-pricing.ps1 — uniform pricing CTA buttons (targeted patch). Run from project root.
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$rel = "app/pricing/page.tsx"
if (-not (Test-Path "package.json")) { Write-Host "ERROR: run from the project root." -ForegroundColor Red; exit 1 }
if (-not (Test-Path $rel)) { Write-Host "ERROR: $rel not found." -ForegroundColor Red; exit 1 }

$old = @'
        className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
          tier.highlight
            ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 hover:brightness-110"
            : isFree
            ? "border border-slate-700 text-slate-100 hover:bg-slate-800"
            : "bg-slate-100 text-slate-950 hover:bg-white"
        }`}
'@

$new = @'
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
'@

$full = Join-Path (Get-Location) $rel
$c = ([System.IO.File]::ReadAllText($full)) -replace "`r`n","`n"
$oldN = $old -replace "`r`n","`n"
$newN = $new -replace "`r`n","`n"
if (-not $c.Contains($oldN)) { Write-Host "ERROR: button block not found (already patched or file differs). No changes made." -ForegroundColor Red; exit 1 }
$c = $c.Replace($oldN, $newN)
[System.IO.File]::WriteAllText($full, $c, $utf8)
Write-Host "  patched app/pricing/page.tsx - uniform CTA buttons" -ForegroundColor Green