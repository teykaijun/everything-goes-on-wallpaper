# Lively Wallpaper version

The Lively version is retained alongside Wallpaper Engine and uses the same arena, native Lux animations, twenty individual desks and furnished portrait window.

## Install

1. Install Lively Wallpaper from its [official project](https://github.com/rocksdanister/lively).
2. Download `Everything-Goes-On-TFT-Classroom-Lively.zip` from the [v3.1.0 release](https://github.com/teykaijun/everything-goes-on-wallpaper/releases/tag/v3.1.0).
3. Drag the ZIP into Lively, or use Add Wallpaper to select it. Import the ZIP intact, rather than only its HTML file.
4. Select the landscape display in Lively's screen configuration and apply the wallpaper. Apply the same imported wallpaper to the portrait display using individual display mode. It chooses the arena or window after the display dimensions settle.
5. Use Customize to choose automatic/day/night, schedule, crossfade, music and Lux controls. The portrait scene is silent and does not show Lux.

Defaults are 07:00 day, 19:00 night, an 8-second fade and 21% soundtrack gain. Lively's master volume is separate. To match the creator's quiet listening level, use 75% master volume. A wallpaper import does not move Windows desktop icons; the optional bench-layout helper is documented separately.

Do not run Lively and Wallpaper Engine together on the same desktop. Switching packages does not require uninstalling either app. This release does not change the creator's active Wallpaper Engine setup.

## Rebuild

With the local media described in [README](../README.md) available:

```powershell
npm ci
npm run build:lux
npm test
python scripts/package_wallpaper.py
```

The output is `dist/Everything-Goes-On-TFT-Classroom-Lively.zip`. Lively metadata, customization controls and the import entry point are all tracked in this repository.

## Monitor reconnection

The shared runtime waits 500 ms for valid display dimensions and handles Lux WebGL context restoration. Lively still uses a settled aspect-ratio change to switch scenes, while the separate Wallpaper Engine projects pin each scene. Hardware hot-plug stability is not guaranteed; the physical cable test remains outstanding. This release was package-checked, not reapplied to the creator's desktop.

Creator: casunoxd — [Buy Me a Coffee](https://buymeacoffee.com/casunoxd). Free download; unofficial fan project. See [credits](SOURCES.md).
