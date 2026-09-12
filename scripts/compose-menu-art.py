"""Rebuild both menu compositions from one shared, locally extracted lancer.

Requires Pillow and NumPy. Background extraction was explicitly approved by the
user. The RGB drawing is preserved; only the surrounding gray checker is removed.
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source' / 'menu'
OUTPUT = ROOT / 'public' / 'menu'


def extract_lancer():
    rgb = Image.open(SOURCE / 'lancer-generated.png').convert('RGB')
    pixels = np.asarray(rgb, dtype=np.int16)
    high = pixels.max(2)
    candidate = ((high - pixels.min(2)) <= 22) & (high >= 78)
    height, width = candidate.shape
    background = np.zeros_like(candidate)
    queue = deque()
    # Small checkerboard pockets enclosed by the helmet/hair and spear shaft.
    seeds = [(650, 684), (698, 689), (1050, 691)]
    for y, x in seeds + [(y, x) for y in range(height) for x in (0, width - 1)] + [
        (y, x) for x in range(width) for y in (0, height - 1)
    ]:
        if candidate[y, x] and not background[y, x]:
            background[y, x] = True
            queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < height and 0 <= nx < width and candidate[ny, nx] and not background[ny, nx]:
                background[ny, nx] = True
                queue.append((ny, nx))
    rgba = rgb.convert('RGBA')
    rgba.putalpha(Image.fromarray(np.where(background, 0, 255).astype('uint8')))
    rgba = rgba.crop(rgba.getbbox())
    rgba.save(OUTPUT / 'evil-city-lancer.png', optimize=True)
    return rgba


# Source-coordinate contours keep the original monk in front of the lancer.
# The extra points along his head follow the individual curls, not a rectangle.
MONK_CONTOURS = {
    'landscape': [
        (1207,839),(1207,520),(1271,520),(1300,526),(1335,532),
        (1356,543),(1368,540),(1380,547),(1384,558),(1394,562),
        (1395,571),(1400,579),(1397,588),(1403,596),(1396,607),
        (1391,615),(1395,625),(1392,637),(1382,647),(1397,650),
        (1405,663),(1401,674),(1415,686),(1412,710),(1417,723),
        (1410,745),(1421,772),(1431,796),(1444,817),(1434,827),
        (1415,837),(1385,837),(1373,848),(1320,848),(1302,839),
    ],
    'portrait': [
        (633,1218),(633,945),(704,945),(731,964),(751,975),
        (763,978),(771,988),(768,997),(775,1005),(775,1016),
        (768,1026),(774,1034),(770,1045),(766,1050),(778,1053),
        (780,1063),(791,1078),(794,1096),(790,1108),(795,1116),
        (792,1124),(801,1140),(808,1161),(815,1180),(821,1192),
        (811,1200),(794,1204),(789,1211),(765,1216),(745,1212),
        (738,1205),(692,1202),(675,1204),(651,1203),
    ],
}


def compose(lancer, name, position, height):
    backdrop = Image.open(SOURCE / f'{name}.png').convert('RGBA')
    scaled = lancer.resize((round(lancer.width * height / lancer.height), height), Image.Resampling.LANCZOS)
    result = backdrop.copy()
    result.alpha_composite(scaled, position)
    mask = Image.new('L', backdrop.size)
    ImageDraw.Draw(mask).polygon(MONK_CONTOURS[name], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(0.35))
    result = Image.composite(backdrop, result, mask)
    suffix = '-portrait' if name == 'portrait' else ''
    result.convert('RGB').save(OUTPUT / f'evil-city-nightfall{suffix}.png', optimize=True)


if __name__ == '__main__':
    OUTPUT.mkdir(parents=True, exist_ok=True)
    lancer = extract_lancer()
    compose(lancer, 'landscape', (1355, 180), 650)
    compose(lancer, 'portrait', (672, 758), 417)
    print('Shared RGBA lancer and both menu compositions rebuilt.')
