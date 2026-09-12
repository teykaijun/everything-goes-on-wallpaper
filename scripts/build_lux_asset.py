"""Wrap the embedded GLB in a local classic script for file:// wallpaper players."""
from pathlib import Path
import base64
ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "wallpaper/media/lux/star-guardian-lux.glb"
target = source.with_name("model.js")
if not source.is_file():
    raise SystemExit("Extract the native Lux GLB first; see scripts/extract_lux_glb.py.")
target.write_text('window.LUX_MODEL_BASE64 = "' + base64.b64encode(source.read_bytes()).decode("ascii") + '";\n', encoding="utf-8")
print(target)
