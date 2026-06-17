# apply-annual.ps1 — annual pricing shows yearly total (/yr), drops the per-month figure. Run from project root.
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$rel = "app/pricing/page.tsx"
if (-not (Test-Path "package.json")) { Write-Host "ERROR: run from the project root." -ForegroundColor Red; exit 1 }
if (-not (Test-Path $rel)) { Write-Host "ERROR: $rel not found." -ForegroundColor Red; exit 1 }
$full = Join-Path (Get-Location) $rel
$c = ([System.IO.File]::ReadAllText($full)) -replace "`r`n","`n"

$old1 = @'
  FEATURE_GROUPS,
  effectiveMonthly,
  type Tier,
'@
$new1 = @'
  FEATURE_GROUPS,
  type Tier,
'@
$old1 = $old1 -replace "`r`n","`n"; $new1 = $new1 -replace "`r`n","`n"
if (-not $c.Contains($old1)) { Write-Host "ERROR: hunk 1 not found (already patched or file differs). No changes made." -ForegroundColor Red; exit 1 }
$c = $c.Replace($old1, $new1)

$old2 = @'
    ? effectiveMonthly(tier.priceAnnual)
    : tier.priceMonthly;
'@
$new2 = @'
    ? tier.priceAnnual
    : tier.priceMonthly;
'@
$old2 = $old2 -replace "`r`n","`n"; $new2 = $new2 -replace "`r`n","`n"
if (-not $c.Contains($old2)) { Write-Host "ERROR: hunk 2 not found (already patched or file differs). No changes made." -ForegroundColor Red; exit 1 }
$c = $c.Replace($old2, $new2)

$old3 = @'
          {!isFree && <span className="pb-1 text-sm text-slate-400">/mo</span>}
        </div>
        <p className="mt-1 h-5 text-xs text-slate-500">
          {isFree
            ? "Free forever"
            : annual
            ? `$${tier.priceAnnual} billed yearly · 1 month free`
            : "Billed monthly"}
        </p>
'@
$new3 = @'
          {!isFree && (
            <span className="pb-1 text-sm text-slate-400">{annual ? "/yr" : "/mo"}</span>
          )}
        </div>
        <p className="mt-1 h-5 text-xs text-slate-500">
          {isFree
            ? "Free forever"
            : annual
            ? "Billed once a year · 1 month free"
            : "Billed monthly"}
        </p>
'@
$old3 = $old3 -replace "`r`n","`n"; $new3 = $new3 -replace "`r`n","`n"
if (-not $c.Contains($old3)) { Write-Host "ERROR: hunk 3 not found (already patched or file differs). No changes made." -ForegroundColor Red; exit 1 }
$c = $c.Replace($old3, $new3)

[System.IO.File]::WriteAllText($full, $c, $utf8)
Write-Host "  patched app/pricing/page.tsx - annual shows yearly total" -ForegroundColor Green