#!/usr/bin/env python3
"""
Turns the generated character turnaround sheets (source/*.png, 4x2 grid of views) into the
sprite strips the app uses for its 360° baby viewer.

For every sheet: cut the 8 cells, remove the white background and floor shadow, arrange the
views in true turntable order (mirroring a view where the sheet lacks that side), recolour
the teal clothes into each outfit colour, and write one horizontal strip of 8 frames.

    python3 tools/baby-sprites/build.py        # needs Pillow and numpy
"""
import colorsys
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'source')
OUT = os.path.join(HERE, '..', '..', 'assets', 'baby')
FRAME = 320  # px, square

# Which sheet cell (1-8, row-major) supplies each turntable frame, and whether to mirror it.
# Frame order: front, 3/4 facing left, profile left, back 3/4 (left), back, back 3/4 (right),
# profile right, 3/4 facing right. Checked by eye against every sheet.
SIT_STAND = [(1, False), (8, False), (3, False), (4, True), (5, False), (6, False), (7, False), (2, False)]
ORDER = {
    'sit': SIT_STAND,
    'stand': SIT_STAND,
    'crawl': [(1, False), (2, False), (3, False), (4, True), (5, False), (6, False), (7, False), (8, False)],
    'tummy': [(1, False), (2, False), (3, False), (4, False), (5, False), (6, False), (7, False), (2, True)],
}

# Outfit colours offered in the app. 'teal' keeps the rendered colour untouched.
OUTFITS = {
    'teal': None,
    'blue': '#8FB8EE',
    'pink': '#F49BB6',
    'lilac': '#BBA6EE',
    'yellow': '#F3CD72',
    'white': '#FFFFFF',
}


def cut_out(cell: Image.Image) -> Image.Image:
    """Makes the white background and the soft grey floor shadow transparent."""
    rgb = np.asarray(cell.convert('RGB')).astype(np.int16)
    h, w, _ = rgb.shape
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    # Background-like: bright and nearly colourless (white paper or its grey shadow).
    bg_like = (mx > 150) & ((mx - mn) < 26)
    seen = np.zeros((h, w), dtype=bool)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg_like[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg_like[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and bg_like[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))
    # Keep only the character itself: drop small stray islands (bits of shadow, specks).
    solid = ~seen
    label = np.zeros((h, w), dtype=np.int32)
    sizes = [0]
    for sy in range(h):
        for sx in range(w):
            if solid[sy, sx] and label[sy, sx] == 0:
                n = len(sizes)
                label[sy, sx] = n
                count = 0
                queue.append((sy, sx))
                while queue:
                    y, x = queue.popleft()
                    count += 1
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and label[ny, nx] == 0:
                            label[ny, nx] = n
                            queue.append((ny, nx))
                sizes.append(count)
    biggest = max(sizes)
    keep = np.isin(label, [i for i, c in enumerate(sizes) if i > 0 and c >= biggest * 0.02])
    alpha = Image.fromarray(np.where(keep, 255, 0).astype(np.uint8), 'L')
    # Pull the edge in by a pixel to drop the white fringe, then soften it.
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = cell.convert('RGBA')
    out.putalpha(alpha)
    return out


def recolour(frame: Image.Image, target_hex: str) -> Image.Image:
    """Repaints the teal clothing (and the girl's headband) in another colour, keeping the shading."""
    arr = np.asarray(frame).astype(np.float32) / 255.0
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    mx = np.max(arr[..., :3], axis=2)
    mn = np.min(arr[..., :3], axis=2)
    delta = mx - mn
    hue = np.zeros_like(mx)
    nz = delta > 1e-6
    rm = nz & (mx == r)
    gm = nz & (mx == g) & ~rm
    bm = nz & ~rm & ~gm
    hue[rm] = ((g[rm] - b[rm]) / delta[rm]) % 6
    hue[gm] = (b[gm] - r[gm]) / delta[gm] + 2
    hue[bm] = (r[bm] - g[bm]) / delta[bm] + 4
    hue = hue / 6.0
    sat = np.where(mx > 0, delta / np.maximum(mx, 1e-6), 0)
    # Teal lives around 180°; skin, hair, lips and eyes are all far away in hue.
    cloth = (hue > 0.40) & (hue < 0.60) & (sat > 0.10) & (a > 0.05)
    if not cloth.any():
        return frame
    base_s = float(np.median(sat[cloth]))
    base_v = float(np.median(mx[cloth]))
    tr, tg, tb = (int(target_hex[i:i + 2], 16) / 255.0 for i in (1, 3, 5))
    th, ts, tv = colorsys.rgb_to_hsv(tr, tg, tb)
    new_s = np.clip(sat * (ts / max(base_s, 1e-3)), 0, 1)
    new_v = np.clip(mx * (tv / max(base_v, 1e-3)), 0, 1)
    if ts < 0.05:  # white: keep a hint of the folds, no colour
        new_s = sat * 0.06
        new_v = np.clip(0.55 + mx * 0.52, 0, 1)
    i = np.floor(th * 6).astype(int) % 6
    f = th * 6 - np.floor(th * 6)
    p = new_v * (1 - new_s)
    q = new_v * (1 - f * new_s)
    t = new_v * (1 - (1 - f) * new_s)
    rgb = [(new_v, t, p), (q, new_v, p), (p, new_v, t), (p, q, new_v), (t, p, new_v), (new_v, p, q)][i]
    out = arr.copy()
    for c in range(3):
        out[..., c] = np.where(cloth, rgb[c], arr[..., c])
    return Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')


def build_sheet(name: str) -> None:
    sex, stage = name.split('-')
    sheet = Image.open(os.path.join(SRC, f'{name}.png')).convert('RGB')
    cw, ch = sheet.width // 4, sheet.height // 2
    cells = [cut_out(sheet.crop(((i % 4) * cw, (i // 4) * ch, (i % 4 + 1) * cw, (i // 4 + 1) * ch))) for i in range(8)]
    views = []
    for cell, mirror in ORDER[stage]:
        img = cells[cell - 1]
        img = img.transpose(Image.FLIP_LEFT_RIGHT) if mirror else img
        views.append(img.crop(img.getbbox()))
    # One scale for the whole sheet, so the baby does not change size while turning.
    scale = min((FRAME * 0.94) / max(v.width for v in views), (FRAME * 0.94) / max(v.height for v in views))
    frames = []
    for v in views:
        v = v.resize((max(1, round(v.width * scale)), max(1, round(v.height * scale))), Image.LANCZOS)
        canvas = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        # Centred horizontally, standing on a common baseline.
        canvas.alpha_composite(v, ((FRAME - v.width) // 2, FRAME - v.height - round(FRAME * 0.03)))
        frames.append(canvas)
    for key, colour in OUTFITS.items():
        strip = Image.new('RGBA', (FRAME * 8, FRAME), (0, 0, 0, 0))
        for i, frame in enumerate(frames):
            strip.alpha_composite(recolour(frame, colour) if colour else frame, (i * FRAME, 0))
        strip.save(os.path.join(OUT, f'{sex}-{stage}-{key}.webp'), 'WEBP', quality=84, method=6)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png'))
    for n in names:
        build_sheet(n)
        print('built', n)
    sys.exit(0)
