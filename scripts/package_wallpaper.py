"""Build a portable Lively ZIP; keep long MP4 exports outside the small live package."""
from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WALLPAPER = ROOT / "wallpaper"
FILES = [
    "index.html", "style.css", "config.js", "schedule.js", "wallpaper.js",
    "layout.js", "viewport.js", "bench-layout.js", "classroom-geometry.js", "classroom.js", "classroom.css", "lux.js", "lux-motion.js", "media/lux/animation-data.js", "media/lux/model.js", "vendor/THREE-LICENSE.txt",
    "LivelyInfo.json", "LivelyProperties.json", "thumbnail.jpg",
    "media/classroom-v4/desks.png", "media/day-clean.webm", "media/night-clean.webm", "media/window-magic/day.mp4", "media/window-magic/night.mp4", "media/day.ogg", "media/night.ogg"
]


def main():
    missing = [name for name in FILES if not (WALLPAPER / name).is_file()]
    if missing:
        raise SystemExit("Build the media first. Missing: " + ", ".join(missing))
    info = json.loads((WALLPAPER / "LivelyInfo.json").read_text(encoding="utf-8"))
    assert info["Type"] == 1 and info["FileName"] == "index.html" and not info["IsAbsolutePath"]
    output = ROOT / "dist" / "Everything-Goes-On-TFT-Classroom-Lively.zip"
    output.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in FILES:
            archive.write(WALLPAPER / name, name)
        archive.write(ROOT / "docs" / "SOURCES.md", "CREDITS.md")
        archive.write(ROOT / "docs" / "ARTWORK.md", "ARTWORK.md")
        archive.write(ROOT / "docs" / "CLASSROOM-ART-PROMPTS.md", "CLASSROOM-ART-PROMPTS.md")
        archive.write(ROOT / "docs" / "WINDOW-ART-PROMPTS.md", "WINDOW-ART-PROMPTS.md")
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert "LivelyInfo.json" in archive.namelist()
    print(f"Created {output} ({output.stat().st_size / 1048576:.1f} MB)")


if __name__ == "__main__":
    main()
