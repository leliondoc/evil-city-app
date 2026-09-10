"""Copy the original shared death sheet from the user's Tiny Swords Update 010 archive."""
import json
from pathlib import Path
import struct
import sys
from zipfile import ZipFile

root = Path(__file__).resolve().parents[1]
with ZipFile(sys.argv[1]) as archive:
    prefix = 'Tiny Swords (Update 010)/Factions/Knights/Troops/Dead/'
    data = archive.read(prefix + 'Dead.png')
    frame_width, frame_height = struct.unpack_from('<HH', archive.read(prefix + 'Dead.aseprite'), 8)
width, height = struct.unpack_from('>II', data, 16)
assert width % frame_width == 0 and height % frame_height == 0
(root / 'public/tiny-swords/unit-death.png').write_bytes(data)
manifest_path = root / 'app/game/assets.json'
manifest = json.loads(manifest_path.read_text())
manifest['unit-death'] = dict(src='/tiny-swords/unit-death.png', width=width, height=height,
                            frameWidth=frame_width, frameHeight=frame_height,
                            frames=(width // frame_width) * (height // frame_height), anchor=.67)
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
