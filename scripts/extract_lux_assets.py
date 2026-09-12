"""Read-only extraction of Chibi Star Guardian Lux from the local TFT WAD.

Asset paths are resolved with CommunityDragon's public hashes.game.txt.3/.8.
The game installation is never modified. See ASSET-SOURCES.md for provenance.
"""
from pathlib import Path
import argparse, json, struct, gzip
import zstandard

ROOT = Path(__file__).resolve().parent.parent

def extract(wad, hashes, output):
    wanted = {}
    toc_hash = None
    for hash_file in hashes:
        for line in hash_file.read_text(encoding='utf8').splitlines():
            hash_string, path = line.split(' ',1)
            if path == 'data/final/companions.wad.subchunktoc': toc_hash=int(hash_string,16)
            if (path.startswith('assets/characters/petchibilux/themes/starguardian/')
                or path in ['data/characters/petchibilux/skins/skin2.bin', 'data/characters/petchibilux/themes/starguardian/tier1.bin', 'data/characters/petchibilux/themes/starguardian/root.bin', 'data/characters/petchibilux/animations/starguardian.bin']):
                wanted[int(hash_string,16)] = path
    output.mkdir(parents=True, exist_ok=True)
    found=[]
    with wad.open('rb') as source:
        magic,major,minor=struct.unpack('<2sBB',source.read(4))
        if magic != b'RW' or major != 3: raise ValueError('Expected WAD v3')
        source.seek(268)
        count,=struct.unpack('<I',source.read(4))
        entries=[struct.unpack('<QIIIBBHQ',source.read(32)) for _ in range(count)]
        toc_entry=next(entry for entry in entries if entry[0] == toc_hash)
        source.seek(toc_entry[1])
        toc=source.read(toc_entry[2])
        if toc_entry[4]&15 == 3: toc=zstandard.ZstdDecompressor().decompress(toc)
        for key,offset,packed_size,size,flags,high,low,_ in entries:
            if key not in wanted: continue
            source.seek(offset)
            raw=source.read(packed_size)
            mode=flags & 15
            if mode == 3: raw=zstandard.ZstdDecompressor().decompress(raw)
            elif mode == 1: raw=gzip.decompress(raw)
            elif mode == 4:
                chunks=[]
                pos=0
                first=low+(high << 16) if minor > 3 else low
                for index in range(first,first+(flags >> 4)):
                    packed,unpacked,_=struct.unpack_from('<IIQ',toc,index*16)
                    chunk=raw[pos:pos+packed]
                    if packed != unpacked: chunk=zstandard.ZstdDecompressor().decompress(chunk)
                    if len(chunk)!=unpacked: raise ValueError('Incorrect subchunk size')
                    chunks.append(chunk)
                    pos+=packed
                raw=b''.join(chunks)
            elif mode != 0: raise ValueError(f'Unsupported compression {mode}: {wanted[key]}')
            if len(raw)!=size: raise ValueError('Incorrect decompressed size')
            target=output/wanted[key]
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(raw)
            found.append({'path':wanted[key],'hash':f'{key:016x}','size':size})
    (output/'extraction.json').write_text(json.dumps({'source':str(wad),'files':found},indent=2))
    print(json.dumps(found,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wad',type=Path,default=Path(r'C:\Riot Games\League of Legends\Game\DATA\FINAL\Companions.wad.client'))
    parser.add_argument('--output',type=Path,default=ROOT/'.sources/lux/extracted')
    args=parser.parse_args()
    extract(args.wad,[ROOT/'.sources/lux/hashes.game.txt.3',ROOT/'.sources/lux/hashes.game.txt.8'],args.output)
