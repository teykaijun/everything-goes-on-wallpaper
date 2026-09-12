# These checks never call the mutation branch: every apply/restore uses --dry-run.
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$layoutExe = Join-Path $repoRoot 'build/desktop-layout/bin/DesktopLayout.exe'
if (-not (Test-Path -LiteralPath $layoutExe)) { throw 'Build DesktopLayout.csproj first; see README.md.' }
$testFolder = Join-Path $repoRoot ('build/desktop-layout/check-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testFolder | Out-Null
$originalPath = Join-Path $testFolder 'before.json'
$afterPath = Join-Path $testFolder 'after.json'
$backupPath = Join-Path $testFolder 'must-not-be-created.json'
& $layoutExe inventory $originalPath | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Initial inventory failed.' }
$original = Get-Content -LiteralPath $originalPath -Raw | ConvertFrom-Json
if ($original.items.Count -eq 0) { throw 'No desktop items available for validation.' }
& $layoutExe restore $originalPath --backup $backupPath --dry-run | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Restore dry-run failed.' }
$plan = [ordered]@{
    schemaVersion = 1
    name = 'read-only-roundtrip'
    coordinateSpace = 'screen'
    monitors = $original.monitors
    items = @($original.items | ForEach-Object { [ordered]@{ id=$_.id; parsingName=$_.parsingName; x=$_.screenPosition.x; y=$_.screenPosition.y } })
}
$planPath = Join-Path $testFolder 'current-positions.json'
$plan | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $planPath -Encoding utf8
& $layoutExe apply $planPath --backup $backupPath --dry-run | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Coordinate roundtrip dry-run failed.' }
$invalidCases = @(
    @{ name='duplicate'; schemaVersion=1; items=@($plan.items[0],$plan.items[0]) },
    @{ name='offscreen'; schemaVersion=1; items=@(@{id=$plan.items[0].id;x=100000;y=100000}) },
    @{ name='unknown'; schemaVersion=1; items=@(@{id='not-a-desktop-item';x=100;y=100}) },
    @{ name='schema'; schemaVersion=999; items=@($plan.items[0]) }
)
foreach ($case in $invalidCases) {
    $invalidPath = Join-Path $testFolder ($case.name + '.json')
    @{ schemaVersion=$case.schemaVersion; coordinateSpace='screen'; items=$case.items } |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $invalidPath -Encoding utf8
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & $layoutExe apply $invalidPath --backup $backupPath --dry-run 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldPreference
    if ($exitCode -eq 0) { throw ('Accepted invalid plan: ' + $case.name) }
}
if (Test-Path -LiteralPath $backupPath) { throw 'Dry-run wrote a mutation backup.' }
& $layoutExe inventory $afterPath | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Final inventory failed.' }
$after = Get-Content -LiteralPath $afterPath -Raw | ConvertFrom-Json
if ($original.folderFlags -ne $after.folderFlags -or $original.iconSize -ne $after.iconSize -or $original.viewMode -ne $after.viewMode -or $original.items.Count -ne $after.items.Count) {
    throw 'Desktop settings changed during the read-only checks.'
}
foreach ($item in $original.items) {
    $match = @($after.items | Where-Object { $_.id -eq $item.id })
    if ($match.Count -ne 1 -or $match[0].viewPosition.x -ne $item.viewPosition.x -or $match[0].viewPosition.y -ne $item.viewPosition.y) {
        throw ('Desktop item changed: ' + $item.name)
    }
}
Write-Output ('PASS: ' + $original.items.Count + ' desktop identities/positions unchanged; two valid dry-runs and four invalid plans checked. Snapshots: ' + $testFolder)
