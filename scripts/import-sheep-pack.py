"""Copy the original sheep reaction from the user's Tiny Swords Update 010 archive."""
import json
from pathlib import Path
import struct
import sys
from zipfile import ZipFile

root = Path(__file__).resolve().parents[1]
with ZipFile(sys.argv[1]) as archive:
    data = archive.read('Tiny Swords (Update 010)/Resources/Sheep/HappySheep_Bouncing.png')
width, height = struct.unpack_from('>II', data, 16)
assert height == 128 and width == 768
(root / 'public/tiny-swords/sheep-hit.png').write_bytes(data)
path = root / 'app/game/assets.json'
manifest = json.loads(path.read_text())
manifest['sheep-hit'] = dict(src='/tiny-swords/sheep-hit.png', width=width, height=height,
                           frameWidth=128, frames=6, anchor=.67)
path.write_text(json.dumps(manifest, indent=2) + '\n')
