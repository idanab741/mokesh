import numpy as np, cv2
from PIL import Image
from scipy import ndimage
cap = cv2.VideoCapture('/home/user/mokesh/parenting-app/assets/baby/clips/boy-stand-idle.mp4'); ok, f = cap.read()
rgb = cv2.cvtColor(f, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV); H, S, V = hsv[..., 0] / 360, hsv[..., 1], hsv[..., 2]
h, w = H.shape
mx = rgb.max(2); mn = rgb.min(2)
figure = ndimage.binary_fill_holes(~(((mx - mn) < 0.095) & (mx > 0.55)))
lab, n = ndimage.label(figure); figure = lab == (1 + np.argmax(ndimage.sum(figure, lab, range(1, n + 1))))
cloth = figure & (H > 0.38) & (H < 0.62) & (S > 0.1)
warm = figure & ~cloth & (S > 0.14) & ((H < 0.14) | (H > 0.96))
ys, xs = np.where(figure); top, bottom = ys.min(), ys.max(); height = bottom - top
head_cx = xs[ys < top + 0.3 * height].mean()
facebox = np.zeros_like(figure); facebox[int(top + 0.12 * height):int(top + 0.36 * height), int(head_cx - 0.13 * height):int(head_cx + 0.13 * height)] = True
# --- eyes: the two dark round blobs in the face; the iris is their warm, not-black part
darkb = figure & facebox & (V < 0.5)
lab, n = ndimage.label(ndimage.binary_closing(darkb, iterations=2)); sizes = ndimage.sum(darkb, lab, range(1, n + 1))
order = np.argsort(sizes)[::-1][:2] + 1
eyeblob = ndimage.binary_dilation(np.isin(lab, order), iterations=3)
# the iris is the round coloured disc around each pupil, not the dark outline of the eye
iris = np.zeros_like(figure); yy, xx = np.mgrid[0:h, 0:w]
for t in order:
    blob = lab == t; by, bx = np.where(blob)
    pupil = blob & (V < 0.12); py, px = np.where(pupil) if pupil.any() else (by, bx)
    r = 0.4 * min(bx.max() - bx.min(), by.max() - by.min())
    disc = (yy - py.mean()) ** 2 + (xx - px.mean()) ** 2 < r * r
    iris |= disc & (V > 0.1) & (V < 0.8) & (S > 0.22) & (H > 0.02) & (H < 0.15)
eyezone = ndimage.binary_dilation(eyeblob, iterations=14)
# --- hair: grown from sure hair at the top of the head, never jumping across skin
sure = warm & (H > 0.06) & (H < 0.125) & (S > 0.42) & (V < 0.84) & (np.arange(h)[:, None] < top + 0.3 * height)
maybe = warm & ~eyezone & (H > 0.062) & (H < 0.13) & (S > 0.4) & (V < 0.9) & (np.arange(h)[:, None] < top + 0.36 * height)
lab, n = ndimage.label(maybe); keep = np.unique(lab[sure & (lab > 0)])
big = [t for t in keep if (lab == t).sum() > 400]
hair = np.isin(lab, big)
# light strands at the edge of the hair and highlights inside it belong to the hair too
strict_skin = warm & (V > 0.86) & (S < 0.42)
face = ndimage.binary_opening(strict_skin, iterations=4)
hair = ndimage.binary_fill_holes(ndimage.binary_closing(hair, iterations=4)) & figure & ~eyezone
grow = ndimage.binary_dilation(hair, iterations=6) & figure & ~cloth & ~face & ~eyezone & (np.arange(h)[:, None] < top + 0.36 * height)
hair = hair | grow
# eyebrows: small hair-coloured strokes inside the face
brow_c = warm & facebox & ~hair & ~eyezone & (H > 0.055) & (H < 0.12) & (S > 0.4) & (V > 0.45) & (V < 0.82)
lab, n = ndimage.label(brow_c); sizes = ndimage.sum(brow_c, lab, range(1, n + 1))
brows = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if 25 < s < 900 and ndimage.center_of_mass(lab == i + 1)[0] < top + 0.24 * height])
lips = warm & ((H < 0.03) | (H > 0.96)) & (S > 0.42) & facebox
skin = warm & ~hair & ~brows & ~iris & ~(eyeblob & (V < 0.45))
print({k: int(v.sum()) for k, v in dict(cloth=cloth, hair=hair, brows=brows, iris=iris, skin=skin, lips=lips).items()})
def feather(m, s=1.2): return ndimage.gaussian_filter(m.astype(np.float32), s)
M = {k: feather(v) for k, v in dict(cloth=cloth, hair=hair | brows, iris=iris, skin=skin, lips=lips).items()}
def lin(c): return np.power(np.clip(c, 0, 1), 2.2)
def srgb(c): return np.power(np.clip(c, 0, 1), 1 / 2.2)
def hexrgb(x): return np.array([int(x[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype=np.float32)
base = {k: np.median(rgb[v], axis=0) for k, v in dict(skin=skin & (V > 0.85), hair=hair, iris=iris).items()}
def gain(img, mask, target, key, strength=1.0):
    # a tone change that keeps shading, highlights and blush: scale in linear light
    g = lin(hexrgb(target)) / np.maximum(lin(base[key]), 1e-3)
    new = srgb(lin(img) * g)
    return img + (new - img) * (mask[..., None] * strength)
def hue_to(img, mask, target, base_s, base_v):
    import colorsys
    th, ts, tv = colorsys.rgb_to_hsv(*hexrgb(target)); hs = cv2.cvtColor(img.astype(np.float32), cv2.COLOR_RGB2HSV); o = hs.copy()
    o[..., 0] = th * 360; o[..., 1] = np.clip(hs[..., 1] * ts / base_s, 0, 1); o[..., 2] = np.clip(hs[..., 2] * tv / base_v, 0, 1)
    return img + (cv2.cvtColor(o, cv2.COLOR_HSV2RGB) - img) * mask[..., None]
cs, cv_ = float(np.median(S[cloth])), float(np.median(V[cloth])); es, ev = float(np.median(S[iris])), float(np.median(V[iris]))
looks = [(None, None, None, None), ('#EDBE9C', '#3A2A20', None, '#F49BB6'), ('#C99468', '#1F1A17', '#3A281C', '#F3CD72'),
         ('#8A593B', '#151211', '#2A1D15', '#BBA6EE'), ('#F8D9C6', '#E6C06A', '#4F8FC4', '#8FB8EE'), ('#F4CDB4', '#B4552B', '#5B9A58', '#F7F7F5')]
tiles = []
for sk, ha, ey, cl in looks:
    img = rgb.copy()
    if sk: img = gain(img, M['skin'], sk, 'skin'); img = gain(img, M['lips'], sk, 'skin', 0.45)
    if ha: img = gain(img, M['hair'], ha, 'hair')
    if ey: img = hue_to(img, M['iris'], ey, es, ev)
    if cl: img = hue_to(img, M['cloth'], cl, cs, cv_) if cl != '#F7F7F5' else img + (np.clip(0.55 + img.max(2, keepdims=True) * 0.5, 0, 1) - img) * M['cloth'][..., None]
    tiles.append(Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).crop((110, 40, 560, 700)))
sheet = Image.new('RGB', (450 * 6, 660)); [sheet.paste(t, (i * 450, 0)) for i, t in enumerate(tiles)]; sheet.save('looks5.png')
z = Image.new('RGB', (420 * 6, 420)); [z.paste(t.crop((95, 20, 375, 300)).resize((420, 420), Image.LANCZOS), (i * 420, 0)) for i, t in enumerate(tiles)]; z.save('faces5.png')
