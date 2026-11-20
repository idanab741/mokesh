#!/usr/bin/env python3
"""
Builds the 360° turn sheets of the baby characters from the generated source images.

Every character has three source images (tools/baby-turn/source), each a 2 x 2 grid of the
character on a white background, turning in steps of 15°:
  <sex>-<pose>-a.png :   0°,  15°,  30°,  45°
  <sex>-<pose>-b.png :  60°,  75°,  90°, 105°
  <sex>-<pose>-c.png : 120°, 135°, 150°, 165°
The other half of the turn (195°..345°) is the mirror image of 165°..15°.

Output: assets/baby/turn/<sex>-<pose>-<colour>.webp, a 5 x 5 grid holding 23 frames, one
file per outfit colour.

    python3 tools/baby-turn/build.py        # needs Pillow and numpy
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'baby-sprites'))
from build import OUTFITS, recolour  # noqa: E402

SRC = os.path.join(HERE, 'source')
OUT = os.path.join(HERE, '..', '..', 'assets', 'baby', 'turn')
MOODS = os.path.join(HERE, 'moods')
MOOD_OUT = os.path.join(HERE, '..', '..', 'assets', 'baby', 'mood')
FRAME = 600
COLS, ROWS = 5, 5
# The model's own teal differs a little between source images: repaint it to one teal.
TEAL = '#8DD5D0'


def cut_white(img: Image.Image) -> Image.Image:
    """Makes the plain white background transparent (only white connected to the image border)."""
    rgb = img.convert('RGB')
    near_white = np.asarray(rgb).min(axis=2) > 236
    mask = Image.fromarray(np.where(near_white, 255, 0).astype(np.uint8), 'L').copy()
    # Flood from the border through the near-white area; 128 marks what is background.
    w, h = mask.size
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if mask.getpixel((x, y)) == 255:
                ImageDraw.floodfill(mask, (x, y), 128)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if mask.getpixel((x, y)) == 255:
                ImageDraw.floodfill(mask, (x, y), 128)
    alpha = Image.fromarray(np.where(np.asarray(mask) == 128, 0, 255).astype(np.uint8), 'L')
    # Pull the edge in slightly to drop the white fringe, then soften it.
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    return out


def runs(on, count):
    """The `count` longest stretches of True in a 1-D array, in order."""
    found, start = [], None
    for i, v in enumerate(list(on) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            found.append((start, i))
            start = None
    return sorted(sorted(found, key=lambda r: r[1] - r[0], reverse=True)[:count])


def figures(path: str) -> list[Image.Image]:
    """Cuts a 2 x 2 source image into its four figures (row by row), background removed."""
    img = cut_white(Image.open(path))
    solid = np.asarray(img.getchannel('A')) > 40
    out = []
    rows = runs(solid.sum(axis=1) > 2, 2)
    if len(rows) != 2:
        raise SystemExit(f'{path}: expected 2 rows of figures, found {len(rows)}')
    for y0, y1 in rows:
        cols = runs(solid[y0:y1].sum(axis=0) > 2, 2)
        if len(cols) != 2:
            raise SystemExit(f'{path}: expected 2 figures in a row, found {len(cols)}')
        for x0, x1 in cols:
            fig = img.crop((x0, y0, x1, y1))
            out.append(fig.crop(fig.getbbox()))
    return out


def build(name: str, moods_only: bool = False) -> None:
    views = [v for part in 'abc' for v in figures(os.path.join(SRC, f'{name}-{part}.png'))]
    # The two source images draw the character at different sizes: bring all to one height.
    height = max(v.height for v in views)
    views = [v.resize((round(v.width * height / v.height), height), Image.LANCZOS) for v in views]
    views += [views[i].transpose(Image.FLIP_LEFT_RIGHT) for i in range(11, 0, -1)]
    scale = min(FRAME * 0.94 / max(v.width for v in views), FRAME * 0.9 / height)
    frames = []
    for v in views:
        v = v.resize((round(v.width * scale), round(v.height * scale)), Image.LANCZOS)
        canvas = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        canvas.alpha_composite(v, ((FRAME - v.width) // 2, FRAME - v.height - round(FRAME * 0.06)))
        frames.append(canvas)
    if not moods_only:
        for key, colour in OUTFITS.items():
            sheet = Image.new('RGBA', (FRAME * COLS, FRAME * ROWS), (0, 0, 0, 0))
            for i, frame in enumerate(frames):
                sheet.alpha_composite(recolour(frame, colour or TEAL), ((i % COLS) * FRAME, (i // COLS) * FRAME))
            sheet.save(os.path.join(OUT, f'{name}-{key}.webp'), 'WEBP', quality=84, method=4)

    # Mood faces (laughing, sad): same pose from the front, drawn at the size and place of
    # the front view so the baby does not jump when its expression changes.
    front = views[0]
    faces = []
    for fig in figures_row(os.path.join(MOODS, f'{name}.png'), 2):
        k = (front.height * scale) / fig.height
        fig = fig.resize((round(fig.width * k), round(fig.height * k)), Image.LANCZOS)
        if fig.width > FRAME:
            fig = fig.resize((FRAME, round(fig.height * FRAME / fig.width)), Image.LANCZOS)
        canvas = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        canvas.alpha_composite(fig, ((FRAME - fig.width) // 2, FRAME - fig.height - round(FRAME * 0.06)))
        faces.append(canvas)
    for key, colour in OUTFITS.items():
        sheet = Image.new('RGBA', (FRAME * 2, FRAME), (0, 0, 0, 0))
        for i, face in enumerate(faces):
            sheet.alpha_composite(recolour(face, colour or TEAL), (i * FRAME, 0))
        sheet.save(os.path.join(MOOD_OUT, f'{name}-{key}.webp'), 'WEBP', quality=88, method=4)


def figures_row(path: str, count: int) -> list[Image.Image]:
    """Cuts a source image with `count` figures side by side."""
    img = cut_white(Image.open(path))
    solid = np.asarray(img.getchannel('A')) > 40
    cols = runs(solid.sum(axis=0) > 2, count)
    if len(cols) != count:
        raise SystemExit(f'{path}: expected {count} figures, found {len(cols)}')
    out = []
    for x0, x1 in cols:
        fig = img.crop((x0, 0, x1, img.height))
        out.append(fig.crop(fig.getbbox()))
    return out


def build_asleep(sex: str) -> None:
    fig = figures_row(os.path.join(MOODS, f'{sex}-asleep.png'), 1)[0]
    k = min(FRAME * 0.92 / fig.width, FRAME * 0.8 / fig.height)
    fig = fig.resize((round(fig.width * k), round(fig.height * k)), Image.LANCZOS)
    canvas = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    canvas.alpha_composite(fig, ((FRAME - fig.width) // 2, FRAME - fig.height - round(FRAME * 0.06)))
    for key, colour in OUTFITS.items():
        recolour(canvas, colour or TEAL).save(os.path.join(MOOD_OUT, f'{sex}-asleep-{key}.webp'), 'WEBP', quality=88, method=4)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(MOOD_OUT, exist_ok=True)
    moods_only = '--moods-only' in sys.argv
    names = sorted({f[:-6] for f in os.listdir(SRC) if f.endswith('-a.png')})
    from multiprocessing import Pool
    with Pool() as pool:
        for n in pool.starmap(build, [(n, moods_only) for n in names]):
            pass
    print('built', ', '.join(names))
    for sex in ('boy', 'girl'):
        build_asleep(sex)
    # The list of turn sheets the app can show.
    lines = ['// Generated by tools/baby-turn/build.py. One sheet = 23 views of a full turn on a 5 x 5 grid.',
             '/* eslint-disable @typescript-eslint/no-require-imports */',
             "import type { BabyStage } from '@/domain/avatar';", '',
             "export const babyTurns: Record<'boy' | 'girl', Partial<Record<BabyStage, Record<string, number>>>> = {"]
    for sex in ('boy', 'girl'):
        lines.append(f'  {sex}: {{')
        for n in names:
            if n.startswith(sex + '-'):
                stage = n.split('-')[1]
                lines.append(f'    {stage}: {{')
                lines += [f"      {key}: require('../../../assets/baby/turn/{n}-{key}.webp')," for key in OUTFITS]
                lines.append('    },')
        lines.append('  },')
    lines += ['};', '',
              '/** Front view with another expression: frame 0 = laughing, frame 1 = sad. */',
              "export const babyFaces: Record<'boy' | 'girl', Partial<Record<BabyStage, Record<string, number>>>> = {"]
    for sex in ('boy', 'girl'):
        lines.append(f'  {sex}: {{')
        for n in names:
            if n.startswith(sex + '-'):
                stage = n.split('-')[1]
                lines.append(f'    {stage}: {{')
                lines += [f"      {key}: require('../../../assets/baby/mood/{n}-{key}.webp')," for key in OUTFITS]
                lines.append('    },')
        lines.append('  },')
    lines += ['};', '', '/** The sleeping baby (one picture, whatever the pose). */',
              "export const babyAsleep: Record<'boy' | 'girl', Record<string, number>> = {"]
    for sex in ('boy', 'girl'):
        lines.append(f'  {sex}: {{')
        lines += [f"    {key}: require('../../../assets/baby/mood/{sex}-asleep-{key}.webp')," for key in OUTFITS]
        lines.append('  },')
    lines += ['};', '']
    with open(os.path.join(HERE, '..', '..', 'src', 'components', 'baby', 'turns.ts'), 'w') as f:
        f.write('\n'.join(lines))
