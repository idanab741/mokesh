"""Remove a plain white background: flood-fill from the edges, soft edge, white-fringe cleanup.
Usage: python3 scripts/cutout.py <in> <out.png> [threshold]
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

src, out = sys.argv[1], sys.argv[2]
thresh = int(sys.argv[3]) if len(sys.argv) > 3 else 38
mode = sys.argv[4] if len(sys.argv) > 4 else 'white'

im = Image.open(src).convert('RGB')
w, h = im.size
MAGIC = (1, 254, 1)
fill = im.copy()
# seed along the whole border so every white region touching an edge is removed
corner = im.getpixel((2, 2))
def seedable(p):
    if mode == 'white': return min(p) > 225
    return sum(abs(a - b) for a, b in zip(p, corner)) < 40
for x in range(0, w, 8):
    for y in (0, h - 1):
        if seedable(fill.getpixel((x, y))): ImageDraw.floodfill(fill, (x, y), MAGIC, thresh=thresh)
for y in range(0, h, 8):
    for x in (0, w - 1):
        if seedable(fill.getpixel((x, y))): ImageDraw.floodfill(fill, (x, y), MAGIC, thresh=thresh)

r, g, b = fill.split()
bg = ImageChops.multiply(ImageChops.multiply(r.point(lambda v: 255 if v == MAGIC[0] else 0),
                                             g.point(lambda v: 255 if v == MAGIC[1] else 0)),
                         b.point(lambda v: 255 if v == MAGIC[2] else 0))
alpha = ImageChops.invert(bg)
# soften: shrink a hair, then feather
alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))

# remove white fringe: un-blend semi-transparent edge pixels from white
px = im.load(); ap = alpha.load()
out_im = Image.new('RGBA', (w, h))
op = out_im.load()
for y in range(h):
    for x in range(w):
        a = ap[x, y]
        if a == 0:
            op[x, y] = (0, 0, 0, 0); continue
        c = px[x, y]
        if a < 255 and mode == 'white':
            k = a / 255
            c = tuple(max(0, min(255, round((v - (1 - k) * 255) / k))) for v in c)
        op[x, y] = (*c, a)
out_im = out_im.crop(out_im.getbbox())
out_im.save(out, optimize=True)
print(out, out_im.size)
