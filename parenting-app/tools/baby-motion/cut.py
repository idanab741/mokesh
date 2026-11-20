"""Turns a generated clip (character on a plain light backdrop) into transparent frame sheets."""
import sys, json, numpy as np, cv2
from PIL import Image
from scipy import ndimage
src, first, last, OUT, name = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
cap = cv2.VideoCapture(src); frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
frames = frames[first:last + 1]
H, W = frames[0].shape[:2]

def backdrop_parts(rgb):
    a = rgb.astype(np.int16); mx = a.max(axis=2); mn = a.min(axis=2)
    plain = ((mx - mn) < 24) & (mx > 140)               # plain, bright, colourless
    lab, n = ndimage.label(plain)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    back = np.isin(lab, edge[edge > 0])
    near = ndimage.binary_dilation(back, iterations=5)   # pockets between fingers or strands of hair
    for t in np.unique(lab[near & (lab > 0) & ~back]):
        region = lab == t
        if region.sum() < 0.0015 * H * W: back |= region
    return back, lab

firsts = [backdrop_parts(f) for f in frames]
# How often each pixel is open backdrop over the clip. A colourless patch enclosed by the
# figure (between a raised arm and the head) is backdrop if that spot is usually open;
# the whites of the eyes, the teeth and the buttons never are.
often = np.mean([b for b, _ in firsts], axis=0)
masks = []
for back, lab in firsts:
    back = back.copy()
    for t in np.unique(lab[(lab > 0) & ~back]):
        region = lab == t
        if often[region].mean() > 0.15: back |= region
    solid = ~back
    lab2, n2 = ndimage.label(solid)
    if n2 > 1:
        sizes = ndimage.sum(solid, lab2, range(1, n2 + 1)); solid = lab2 == (1 + int(np.argmax(sizes)))
    masks.append(solid)
allm = np.any(masks, axis=0); ys, xs = np.where(allm)
cx = (xs.min() + xs.max()) / 2; bottom = ys.max(); top = ys.min()
side = int(max(xs.max() - xs.min(), bottom - top) * 1.08) + 8
x0 = int(round(cx - side / 2)); y0 = int(bottom + side * 0.04 - side)
def crop(a, fill):
    out = np.full((side, side) + a.shape[2:], fill, dtype=a.dtype)
    sx0, sy0 = max(0, x0), max(0, y0); sx1, sy1 = min(W, x0 + side), min(H, y0 + side)
    out[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = a[sy0:sy1, sx0:sx1]; return out

cut = []
for rgb, solid in zip(frames, masks):
    rgb = crop(rgb, 255).astype(np.float32) / 255; solid = crop(solid, False)
    solid = ndimage.binary_erosion(solid, iterations=1)
    inner = ndimage.binary_erosion(solid, iterations=2)
    idx = ndimage.distance_transform_edt(~inner, return_distances=False, return_indices=True)
    clean = rgb[idx[0], idx[1]]
    rgb = np.where(inner[..., None], rgb, clean)        # rim and beyond take figure colours only
    alpha = ndimage.gaussian_filter(solid.astype(np.float32), 0.9)
    pm = cv2.resize(np.dstack([rgb * alpha[..., None], alpha]), (OUT, OUT), interpolation=cv2.INTER_AREA)
    al = np.clip(pm[..., 3:4], 1e-4, 1)
    cut.append((np.dstack([np.clip(pm[..., :3] / al, 0, 1), pm[..., 3:4]]) * 255).round().astype(np.uint8))

COLS = ROWS = 6; per = COLS * ROWS; sheets = []
for s in range(0, len(cut), per):
    big = Image.new('RGBA', (COLS * OUT, ROWS * OUT), (0, 0, 0, 0))
    for i, f in enumerate(cut[s:s + per]): big.paste(Image.fromarray(f, 'RGBA'), ((i % COLS) * OUT, (i // COLS) * OUT))
    fn = f'{name}-{len(sheets)}.webp'; big.save(fn, 'WEBP', quality=86, method=4); sheets.append(fn)
json.dump({'frames': len(cut), 'cols': COLS, 'rows': ROWS, 'sheets': sheets, 'size': OUT, 'crop': side}, open(f'{name}.json', 'w'))
print(len(cut), 'frames, crop', side, 'px ->', OUT, sheets)
prev = Image.new('RGB', (6 * OUT, OUT), (34, 48, 100))
for k, i in enumerate([0, 30, 55, 80, 105, len(cut) - 1]):
    im = Image.fromarray(cut[min(i, len(cut) - 1)], 'RGBA'); prev.paste(im, (k * OUT, 0), im)
prev.save(f'{name}-preview.png')
