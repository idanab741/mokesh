"""Recolours skin, hair, eyes and clothes on every frame of a clip and writes a grid of looks."""
import sys, colorsys, numpy as np, cv2
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]

def masks(rgb):
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV); H, S, V = hsv[..., 0] / 360, hsv[..., 1], hsv[..., 2]
    h, w = H.shape; rows = np.arange(h)[:, None]
    mx = rgb.max(2); mn = rgb.min(2)
    figure = ndimage.binary_fill_holes(~(((mx - mn) < 0.095) & (mx > 0.55)))
    lab, n = ndimage.label(figure); figure = lab == (1 + np.argmax(ndimage.sum(figure, lab, range(1, n + 1))))
    cloth = figure & (H > 0.38) & (H < 0.62) & (S > 0.1)
    warm = figure & ~cloth & (S > 0.14) & ((H < 0.14) | (H > 0.96))
    ys, xs = np.where(figure); top, bottom = ys.min(), ys.max(); height = bottom - top
    sure = warm & (H > 0.06) & (H < 0.125) & (S > 0.42) & (V < 0.84) & (rows < top + 0.3 * height)
    sy, sx = np.where(sure)
    head_cx = np.median(sx) if len(sx) else xs.mean(); head_top = sy.min() if len(sy) else top
    facebox = np.zeros_like(figure)
    facebox[int(head_top + 0.12 * height):int(head_top + 0.36 * height), int(head_cx - 0.13 * height):int(head_cx + 0.13 * height)] = True
    # eyes: the two dark round blobs in the face; the iris is the coloured disc around each pupil
    darkb = figure & facebox & (V < 0.5)
    lab, n = ndimage.label(ndimage.binary_closing(darkb, iterations=2))
    iris = np.zeros_like(figure); eyeblob = np.zeros_like(figure)
    if n:
        sizes = ndimage.sum(darkb, lab, range(1, n + 1)); order = np.argsort(sizes)[::-1][:2] + 1
        eyeblob = ndimage.binary_dilation(np.isin(lab, order), iterations=3)
        yy, xx = np.mgrid[0:h, 0:w]
        for t in order:
            blob = lab == t; by, bx = np.where(blob)
            if len(by) < 40: continue
            pupil = blob & (V < 0.12); py, px = np.where(pupil) if pupil.any() else (by, bx)
            r = 0.4 * min(bx.max() - bx.min(), by.max() - by.min())
            disc = (yy - py.mean()) ** 2 + (xx - px.mean()) ** 2 < r * r
            iris |= disc & (V > 0.1) & (V < 0.8) & (S > 0.22) & (H > 0.02) & (H < 0.15)
    eyezone = ndimage.binary_dilation(eyeblob, iterations=14)
    # hair: grown from sure hair, never across the face; plus its light strands and highlights
    maybe = warm & ~eyezone & (H > 0.062) & (H < 0.13) & (S > 0.4) & (V < 0.9) & (rows < head_top + 0.36 * height)
    lab, n = ndimage.label(maybe); keep = np.unique(lab[sure & (lab > 0)])
    hair = np.isin(lab, [t for t in keep if (lab == t).sum() > 400])
    face = ndimage.binary_opening(warm & (V > 0.86) & (S < 0.42), iterations=4)
    hair = ndimage.binary_fill_holes(ndimage.binary_closing(hair, iterations=4)) & figure & ~eyezone
    hair |= ndimage.binary_dilation(hair, iterations=6) & figure & ~cloth & ~face & ~eyezone & (rows < head_top + 0.36 * height)
    brow_c = warm & facebox & ~hair & ~eyezone & (H > 0.055) & (H < 0.12) & (S > 0.4) & (V > 0.45) & (V < 0.82)
    lab, n = ndimage.label(brow_c); brows = np.zeros_like(figure)
    if n:
        sizes = ndimage.sum(brow_c, lab, range(1, n + 1)); cms = ndimage.center_of_mass(brow_c, lab, range(1, n + 1))
        brows = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if 25 < s < 900 and cms[i][0] < head_top + 0.24 * height])
    lips = warm & ((H < 0.03) | (H > 0.96)) & (S > 0.42) & facebox
    skin = warm & ~hair & ~brows & ~iris & ~(eyeblob & (V < 0.45))
    f = lambda m: ndimage.gaussian_filter(m.astype(np.float32), 1.2)
    return dict(cloth=f(cloth), hair=f(hair | brows), iris=f(iris), skin=f(skin), lips=f(lips)), (H, S, V)

lin = lambda c: np.power(np.clip(c, 0, 1), 2.2); srgb = lambda c: np.power(np.clip(c, 0, 1), 1 / 2.2)
hexrgb = lambda x: np.array([int(x[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype=np.float32)
BASE = dict(skin=hexrgb('#F7C4A8'), hair=hexrgb('#B8824F'))        # the clip's own skin and hair tone
CS, CV, ES, EV = 0.24, 0.80, 0.63, 0.39                            # the clip's own cloth and iris levels
def gain(img, mask, target, key, k=1.0):
    new = srgb(lin(img) * (lin(hexrgb(target)) / lin(BASE[key]))); return img + (new - img) * (mask[..., None] * k)
def hue_to(img, mask, target, bs, bv):
    th, ts, tv = colorsys.rgb_to_hsv(*hexrgb(target)); hs = cv2.cvtColor(img.astype(np.float32), cv2.COLOR_RGB2HSV); o = hs.copy()
    o[..., 0] = th * 360; o[..., 1] = np.clip(hs[..., 1] * ts / bs, 0, 1); o[..., 2] = np.clip(hs[..., 2] * tv / bv, 0, 1)
    return img + (cv2.cvtColor(o, cv2.COLOR_HSV2RGB) - img) * mask[..., None]
LOOKS = [(None, None, None, None), ('#EDBE9C', '#3A2A20', None, '#F49BB6'), ('#C99468', '#1F1A17', '#3A281C', '#F3CD72'),
         ('#8A593B', '#151211', '#2A1D15', '#BBA6EE'), ('#F8D9C6', '#E6C06A', '#4F8FC4', '#8FB8EE'), ('#F4CDB4', '#B4552B', '#5B9A58', '#F7F7F5')]
def look(rgb, M, sk, ha, ey, cl):
    img = rgb.copy()
    if sk: img = gain(img, M['skin'], sk, 'skin'); img = gain(img, M['lips'], sk, 'skin', 0.45)
    if ha: img = gain(img, M['hair'], ha, 'hair')
    if ey: img = hue_to(img, M['iris'], ey, ES, EV)
    if cl: img = hue_to(img, M['cloth'], cl, CS, CV) if cl != '#F7F7F5' else img + (np.clip(0.55 + img.max(2, keepdims=True) * 0.5, 0, 1) - img) * M['cloth'][..., None]
    return img

cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS); TW, TH = 400, 520; X0, X1, Y0, Y1 = 84, 584, 40, 690
vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'mp4v'), fps, (TW * 3, TH * 2)); n = 0
while True:
    ok, f = cap.read()
    if not ok: break
    rgb = cv2.cvtColor(f, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    M, _ = masks(rgb)
    grid = np.zeros((TH * 2, TW * 3, 3), np.uint8)
    for i, L in enumerate(LOOKS):
        t = (np.clip(look(rgb, M, *L), 0, 1) * 255).astype(np.uint8)[Y0:Y1, X0:X1]
        grid[(i // 3) * TH:(i // 3 + 1) * TH, (i % 3) * TW:(i % 3 + 1) * TW] = cv2.resize(t, (TW, TH), interpolation=cv2.INTER_AREA)
    vw.write(cv2.cvtColor(grid, cv2.COLOR_RGB2BGR)); n += 1
vw.release(); print('frames', n)
