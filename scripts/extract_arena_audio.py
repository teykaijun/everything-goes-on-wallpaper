"""Extract the Everything Goes On music banks from a local League install.

Reads the installed WAD without modifying it. Asset hashes are recorded in
https://github.com/CommunityDragon/Data/blob/master/hashes/lol/hashes.game.txt.8
WAD layout follows https://github.com/CommunityDragon/CDTB/blob/master/cdtb/wad.py
Requires zstandard only for compressed entries; all extracted content remains local.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import struct
import subprocess

HASHES = {
    0xA1DD94B2D5A62418: "mus_map22_arenaskins_starguardian_classroom_audio.bnk",
    0x5C3BFA1444FFFCF8: "mus_map22_arenaskins_starguardian_classroom_audio.wpk",
    0x4E29DFA132D10363: "mus_map22_arenaskins_starguardian_classroom_events.bnk",
}


def extract(wad: Path, output: Path, decoder: Path | None = None) -> None:
    output.mkdir(parents=True, exist_ok=True)
    metadata = []
    with wad.open("rb") as source:
        magic, major, minor = struct.unpack("<2sBB", source.read(4))
        if magic != b"RW" or major != 3:
            raise ValueError("This extractor expects a version 3 Riot WAD.")
        source.seek(268)
        count = struct.unpack("<I", source.read(4))[0]
        entries = [struct.unpack("<QIIIBBHQ", source.read(32)) for _ in range(count)]
        for path_hash, offset, packed_size, size, flags, _, _, _ in entries:
            if path_hash not in HASHES:
                continue
            source.seek(offset)
            data = source.read(packed_size)
            compression = flags & 15
            if compression == 3:
                import zstandard

                data = zstandard.ZstdDecompressor().decompress(data)
            elif compression != 0:
                raise ValueError(f"Unsupported compression {compression}")
            if len(data) != size:
                raise ValueError("Extracted size does not match WAD entry")
            target = output / HASHES[path_hash]
            target.write_bytes(data)
            metadata.append({"file": target.name, "hash": f"{path_hash:016x}", "size": size})
    if len(metadata) != len(HASHES):
        raise ValueError("The installed game does not contain all arena music banks.")
    (output / "extraction.json").write_text(json.dumps({"source": str(wad), "files": metadata}, indent=2), encoding="utf-8")
    print(json.dumps(metadata, indent=2))
    unpack_wpk(output / HASHES[0x5C3BFA1444FFFCF8], output, decoder)


def unpack_wpk(wpk: Path, output: Path, decoder: Path | None) -> None:
    """WPK layout: r3d2 header, uint32 offset index, UTF-16LE filenames.

    Format reference: https://wiki.leaguetoolkit.dev/reference/file-formats/legacy/
    """
    data = wpk.read_bytes()
    magic, version, count = struct.unpack_from("<4sII", data)
    if magic != b"r3d2" or version != 1:
        raise ValueError("Unsupported WPK")
    items = []
    for index in range(count):
        entry = struct.unpack_from("<I", data, 12 + 4 * index)[0]
        offset, size, chars = struct.unpack_from("<III", data, entry)
        name = data[entry + 12 : entry + 12 + 2 * chars].decode("utf-16-le").rstrip("\0")
        if not re.fullmatch(r"\d+\.wem", name) or offset + size > len(data):
            raise ValueError("Invalid WPK entry")
        wem = output / name
        wem.write_bytes(data[offset : offset + size])
        item = {"file": name, "size": size}
        if decoder:
            info = subprocess.run([str(decoder), "-m", str(wem)], check=True, capture_output=True, text=True).stdout
            (output / (name + ".txt")).write_text(info, encoding="utf-8")
            subprocess.run([str(decoder), "-i", "-o", str(wem.with_suffix(".wav")), str(wem)], check=True, capture_output=True)
            item["metadata"] = info
        items.append(item)
    (output / "wem-index.json").write_text(json.dumps(items, indent=2), encoding="utf-8")
    print(json.dumps(items, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wad", type=Path, default=Path(r"C:\Riot Games\League of Legends\Game\DATA\FINAL\Maps\Shipping\Map22.wad.client"))
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent.parent / ".sources" / "audio")
    parser.add_argument("--decoder", type=Path, help="Optional path to vgmstream-cli.exe to also produce WAVs")
    args = parser.parse_args()
    extract(args.wad, args.output, args.decoder)
