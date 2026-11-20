"""Measures, from the rendered reference sheets, how each colour option differs from the original
character: per region the shift in OKLab lightness, the chroma ratio, the hue shift and the
contrast ratio. The app applies exactly these differences to the clips.

    python3 tools/baby-motion/calibrate.py        # prints the palette tables for src/domain/avatar.ts
"""
import os, sys, json, numpy as np, cv2
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.argv = ['x', 'x', 'x']
ns = {}
exec(open(os.path.join(HERE, 'tint-video.py')).read().split("lin = lambda c:")[0], ns)
masks, MODEL = ns['masks'], ns['MODEL']
M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]], np.float32)
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]], np.float32)
to_ok = lambda c: np.cbrt(np.power(np.clip(c, 0, 1), 2.2) @ M1.T) @ M2.T

def tiles(path, cols, rows):
    img = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    h, w = img.shape[:2]; out = []
    for r in range(rows):
        for c in range(cols):
            t = img[r * h // rows:(r + 1) * h // rows, c * w // cols:(c + 1) * w // cols]
            mx, mn = t.max(2), t.min(2)
            fig = ~(((mx - mn) < 0.07) & (mx > 0.6)); lab, n = ndimage.label(fig)
            fig = lab == (1 + np.argmax(ndimage.sum(fig, lab, range(1, n + 1))))
            ys, xs = np.where(fig); out.append(t[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    return out

def stats(tile, mask):
    """Median lightness / chroma / hue of a region, and how wide its lightness spreads."""
    m = cv2.resize(mask.astype(np.float32), (tile.shape[1], tile.shape[0])) > 0.6
    ok = to_ok(tile[m]); L = ok[:, 0]; med = np.median(ok, axis=0)
    return dict(L=float(med[0]), C=float(np.hypot(med[1], med[2])), h=float(np.arctan2(med[2], med[1])), spread=float(np.percentile(L, 90) - np.percentile(L, 10)))

def core_masks(tile):
    """Masks of the original character, cut to the figure and shrunk to their safe middle."""
    MODEL.clear(); canvas = np.ones((tile.shape[0] + 80, tile.shape[1] + 80, 3), np.float32) * 0.95
    canvas[40:-40, 40:-40] = tile; M, _ = masks(canvas)
    out = {k: (ndimage.binary_erosion(M[k][40:-40, 40:-40] > 0.9, iterations=3) if k != 'iris' else M[k][40:-40, 40:-40] > 0.6) for k in ('skin', 'hair', 'cloth', 'iris')}
    print({k: int(v.sum()) for k, v in out.items()}, file=sys.stderr); return out

def diff(v, o):
    d = (v['h'] - o['h'] + np.pi) % (2 * np.pi) - np.pi
    return [round(v['L'] - o['L'], 4), round(v['C'] / max(o['C'], 1e-3), 3), round(float(d), 4), round(float(np.clip(v['spread'] / max(o['spread'], 1e-3), 0.5, 1.6)), 3)]
def hexof(tile, mask):
    m = cv2.resize(mask.astype(np.float32), (tile.shape[1], tile.shape[0])) > 0.6
    return '#%02X%02X%02X' % tuple(int(x) for x in (np.median(tile[m], axis=0) * 255).round())

out = {}
cl = tiles(os.path.join(HERE, 'reference', 'boy-clothes.png'), 4, 2); m = core_masks(cl[0]); o = stats(cl[0], m['cloth'])
out['cloth'] = [dict(key=k, shift=diff(stats(t, m['cloth']), o), swatch=hexof(t, m['cloth'])) for k, t in zip(['mint', 'rose', 'peach', 'butter', 'sky', 'lilac', 'sage', 'cream'], cl)]
sk = tiles(os.path.join(HERE, 'reference', 'boy-skin-hair-eyes.png'), 3, 2); m = core_masks(sk[1]); O = {k: stats(sk[1], m[k]) for k in ('skin', 'hair', 'iris')}
names = dict(skin=['porcelain', 'peach', 'honey', 'tan', 'brown', 'deep'], hair=['blond', 'golden', 'chestnut', 'brown', 'softblack', 'black'], iris=['blue', 'brown', 'hazel', 'green', 'darkbrown', 'darkbrown2'])
for part in ('skin', 'hair', 'iris'):
    out[part] = [dict(key=k, shift=diff(stats(t, m[part]), O[part]), swatch=hexof(t, m[part])) for k, t in zip(names[part], sk)]
out['irisBase'] = [round(O['iris'][k], 4) for k in ('L', 'C', 'h')]
print(json.dumps(out, indent=1))
