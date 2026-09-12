# Desktop icon layout helper

A local Windows Shell integration for backing up and positioning actual Explorer
desktop icons. It calls documented COM interfaces; it does not simulate input,
send ListView messages, edit the registry, or restart Explorer.

The helper is separate from the Lively webpage. It never launches a shortcut or
changes its file contents. Inventory files contain local item identities and
paths and belong in the ignored build directory, not in a release.

## Build

Requires Windows x64 and the .NET 10 SDK. Run from the repository root:

```powershell
dotnet build scripts/desktop-layout/DesktopLayout.csproj --configuration Release --output build/desktop-layout/bin
```

The executable is `build/desktop-layout/bin/DesktopLayout.exe`.

## Read-only inventory

```powershell
.\build\desktop-layout\bin\DesktopLayout.exe inventory .\build\desktop-layout\original.json
```

Inventory writes a new JSON backup and never modifies the desktop. Existing
output files are rejected. It captures the actual desktop view, including virtual
icons, and saves each item's display name, parsing name, serialized PIDL, SHA-256
identity, desktop-view position, screen position, and containing monitor. It also
records icon size, spacing, view flags, view mode, DPI, monitor working areas, and
the desktop view's screen origin.

Positions refer to the upper-left item position supplied by Explorer. Screen
coordinates and desktop-view coordinates are distinct when a monitor extends
left of the primary display. For this two-monitor setup the view origin is
(-1080, 0), so a primary-screen position (x, y) corresponds to view position
(x + 1080, y). The helper measures this origin on every invocation.

## Review a placement plan

Copy item identities from a fresh inventory. A plan can position a subset of
items; unlisted icons keep their positions. Each target must resolve uniquely,
must be inside an active monitor's working area, and cannot share the exact
position of another target. Leave room for icon labels: the snapshot's spacing
includes surrounding whitespace.

```json
{
  "schemaVersion": 1,
  "name": "classroom-day",
  "coordinateSpace": "screen",
  "autoArrange": false,
  "snapToGrid": false,
  "items": [
    {
      "id": "COPY_AN_ID_FROM_THE_INVENTORY",
      "x": 500,
      "y": 500
    }
  ]
}
```

Alternatively identify an item with its exact `parsingName`. An ID plus parsing
name provides a fallback if the native PIDL representation changes. Do not
identify items by their list index or by display name alone.

Copy the snapshot's `monitors` array into the plan to require the same monitor
arrangement at apply time. Optional `iconSize` (16–256 pixels) and `viewMode`
can set a requested icon size; omitting them preserves the current values.
`coordinateSpace` accepts `screen` or `view`.

Always review the printed targets first:

```powershell
.\build\desktop-layout\bin\DesktopLayout.exe apply .\build\desktop-layout\classroom-day.json --backup .\build\desktop-layout\before-classroom.json --dry-run
```

Dry-run resolves every identity and coordinate but performs no desktop mutations
and creates no backup output. It is safe to reuse that backup filename for the
subsequent explicit apply.

## Apply and restore

These commands change desktop positions:

```powershell
.\build\desktop-layout\bin\DesktopLayout.exe apply .\build\desktop-layout\classroom-day.json --backup .\build\desktop-layout\before-classroom.json
.\build\desktop-layout\bin\DesktopLayout.exe restore .\build\desktop-layout\before-classroom.json --backup .\build\desktop-layout\before-restore.json
```

Every operation must create a new pre-change backup before moving anything.
Apply temporarily disables auto-arrange/grid snapping, positions the selected
items without selecting or focusing them, then applies the plan's requested
auto-arrange/grid flags. Exact coordinates are read back and verified when both
flags are off. It writes a second snapshot beside the backup as
`<backup>.after.json`.

If applying or verifying fails, the helper attempts to restore the pre-change
positions, icon size, and the two arrangement flags. The original backup is
always retained. Restore rejects a changed monitor arrangement and refuses to
guess when an item is missing or ambiguous. New items not in the saved snapshot
are left in place. Renamed or deleted items can require a reviewed replacement
plan. Re-enabling auto-arrange or grid snapping may let Explorer reflow positions.

The v2.1 bench layout uses one stable plan for day and night: 18 icons in the upper bench band and 22 in the lower band, outside the battlefield. Its local plan is `build/desktop-layout/benches-v2.1.json`; its pre-change backup is `build/desktop-layout/before-benches-v2.1.json`. Restore that backup with the command below, choosing a new backup filename if it already exists:

```powershell
.\build\desktop-layout\bin\DesktopLayout.exe restore .\build\desktop-layout\before-benches-v2.1.json --backup .\build\desktop-layout\before-bench-restore.json
```

The helper is one-shot: it
does not install an automation, background service, startup entry, or scheduler.

## Read-only checks

```powershell
.\scripts\desktop-layout\Test-ReadOnly.ps1
```

This captures before/after snapshots, tests restore and screen-coordinate
dry-runs, and checks rejection of duplicate identities, offscreen targets,
unknown items, and unsupported schemas. It verifies that all icon positions,
identities, and relevant settings remain unchanged.

## References

- [Microsoft's desktop icon enumeration and backup/restore example](https://devblogs.microsoft.com/oldnewthing/20130318-00/?p=4933).
- [Microsoft's clarification that IFolderView is the supported positioning API](https://devblogs.microsoft.com/oldnewthing/20211122-00/?p=105948).
- [IFolderView::GetItemPosition](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ifolderview-getitemposition).
- [IFolderView::SelectAndPositionItems](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ifolderview-selectandpositionitems).
- [IFolderView2::GetCurrentFolderFlags](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ifolderview2-getcurrentfolderflags).
- [IFolderView2::GetViewModeAndIconSize](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ifolderview2-getviewmodeandiconsize).
- [Microsoft SDK COM declarations used for interface slots](https://github.com/microsoft/win32metadata/blob/main/generation/WinSDK/RecompiledIdlHeaders/um/ShObjIdl_core.h).
