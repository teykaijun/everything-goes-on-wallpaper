# Wallpaper Engine migration and monitor reconnection

## What the logs establish

On September 17, 2026 at 00:03 local time, Lively recorded the portrait display
connecting, followed by the primary display disappearing at 00:03:37 and
returning at 00:03:38. It closed and restored the arena renderer during that
sequence. Earlier logs also contain WebView2 unresponsive/crashed events.
The display churn is confirmed; these logs do not establish a single cause for
every crash or prove a specific graphics-driver fault.

The old runtime reloaded immediately whenever its viewport changed orientation.
That was vulnerable to transient sizes during monitor changes. Version 3 adds:

- A shared 500 ms settling window and rejection of zero/tiny viewports.
- Paused animation/media while a resize is pending.
- Fixed arena/window roles in the two Wallpaper Engine projects.
- WebGL context-loss/restoration handling for Lux without restarting the page.
- Bounded ambient-canvas dimensions and Wallpaper Engine's FPS limit for Lux.
- Wallpaper Engine property and playback callbacks.
- A portrait package containing WebM media, without Lux model/WebGL assets.

The automatic-orientation Lively entry point still reloads after a genuine,
settled orientation change. The two Wallpaper Engine projects never use that
orientation-triggered reload path.

## Local installation

Run Steam's installed Wallpaper Engine launcher at least once after a fresh
installation. A newly installed distribution directory is a staging area;
running its internal executable directly can create a separate configuration
and leave runtime assets uninitialized. Use the deployed executable in the
installation root for documented command-line controls.

Build the two projects with `scripts/build_engine_media.py` and
`scripts/package_wallpaper_engine.py`. The latter produces a ZIP containing
`Everything-Goes-On-Arena/` and `Everything-Goes-On-Star-Window/`, each with its
own `project.json` and local assets. Copy the folders to `projects/myprojects/`.

Select independent wallpapers per display. The arena project has 21% soundtrack
gain; the window project is silent. A 75% engine master volume preserves the
previous 75%-by-21% listening level. Both schedules default to 07:00 day and 19:00
night, with an 8-second fade. No media is streamed from the internet.

The workstation installation uses the retained managed monitor identities,
with the landscape monitor mapped to Monitor0 and portrait to Monitor1. Backups
of the previous app settings are kept locally in
`build/migration-engine-20260917/` and are excluded from Git and packages.
Lively's startup is disabled and its processes are stopped. Wallpaper Engine
starts at login through the installed launcher. Safe mode was disabled only
after the user explicitly approved that action; remote debugging remains off.

## Validation and limits

The 60 Node tests cover rapid disconnect/reconnect size sequences, invalid
startup dimensions, stable scene roles, no portrait audio, native property
updates, pause/resume across clock changes, and existing navigation/media rules.
Both Wallpaper Engine web-renderer processes were observed after installation,
and the user confirmed the arena with Lux and the portrait window are visible.
The media and installed files are checked against the built package.

The physical cable-disconnect/reconnect scenario still needs an actual hardware
check. The native computer-use helper could not initialize in this environment,
so an automated live desktop screenshot was unavailable. These checks reduce
known wallpaper-side failure modes; they do not guarantee that driver or
wallpaper-host crashes cannot recur.

## Official references

- [Command-line controls](https://help.wallpaperengine.io/en/functionality/cli.html)
- [Automatic startup and monitor identification](https://help.wallpaperengine.io/en/functionality/automaticstartup.html)
- [Web video formats](https://docs.wallpaperengine.io/web/overview.html)
- [Property/playback listeners](https://docs.wallpaperengine.io/web/api/propertylistener)
- [FPS limits](https://docs.wallpaperengine.io/en/web/performance/fps.html)
