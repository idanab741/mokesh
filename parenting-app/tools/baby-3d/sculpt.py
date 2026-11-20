"""Sculpts the baby's parts as smooth implicit surfaces and writes compact meshes."""
import base64, json, numpy as np
from skimage import measure

def length(v): return np.sqrt((v * v).sum(-1))
def sphere(p, c, r): return length(p - np.array(c)) - r
def ellipsoid(p, c, r):
    q = p - np.array(c); r = np.array(r, dtype=float)
    k0 = length(q / r); k1 = length(q / (r * r))
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)
def capsule(p, a, b, ra, rb=None):
    a = np.array(a, dtype=float); b = np.array(b, dtype=float); rb = ra if rb is None else rb
    pa = p - a; ba = b - a
    h = np.clip((pa @ ba) / (ba @ ba), 0, 1)
    return length(pa - ba * h[..., None]) - (ra + (rb - ra) * h)
def torus_y(p, c, R, r):
    q = p - np.array(c)
    return np.sqrt((np.sqrt(q[..., 0] ** 2 + q[..., 2] ** 2) - R) ** 2 + q[..., 1] ** 2) - r
def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)
def union(k, *ds):
    out = ds[0]
    for d in ds[1:]: out = smin(out, d, k)
    return out

# ---------------- parts (each in its own joint-local space, facing +z) ----------------
def head(p):
    d = ellipsoid(p, (0, 0.02, 0), (1.0, 0.96, 0.97))
    for s in (1, -1):
        d = smin(d, sphere(p, (s * 0.5, -0.42, 0.36), 0.5), 0.3)          # cheeks
        d = smin(d, ellipsoid(p, (s * 1.0, -0.2, -0.06), (0.13, 0.23, 0.18)), 0.06)  # ears
    d = smin(d, sphere(p, (0, -0.74, 0.34), 0.34), 0.3)                   # chin
    d = smin(d, ellipsoid(p, (0, -0.47, 1.02), (0.09, 0.065, 0.07)), 0.09)  # button nose
    return d

rng = np.random.default_rng(11)
def hair_blobs():
    blobs = []
    N = 210
    for i in range(N):
        y = 1 - (i / (N - 1)) * 2; r = np.sqrt(max(0, 1 - y * y)); th = i * 2.399963
        x, z = np.cos(th) * r, np.sin(th) * r
        front = z > 0.15
        keep = (y > 0.56 - 0.3 * abs(x)) if front else (y > -0.5 and not (abs(x) > 0.8 and y < 0.02))
        if not keep: continue
        rad = 0.2 + rng.random() * 0.09
        lift = 0.95 + rng.random() * 0.07
        blobs.append(((x * 1.0 * lift, y * 0.96 * lift + 0.02, z * 0.97 * lift), rad))
    return blobs
HAIR = hair_blobs()
def hair(p):
    d = None
    for c, r in HAIR:
        s = sphere(p, c, r); d = s if d is None else smin(d, s, 0.1)
    # the swept-up forelock
    pts = [(-0.1, 0.9, 0.62, 0.2), (0.06, 1.0, 0.66, 0.18), (0.22, 1.1, 0.62, 0.15), (0.34, 1.2, 0.5, 0.12), (0.36, 1.27, 0.36, 0.09)]
    for a, b in zip(pts, pts[1:]):
        d = smin(d, capsule(p, a[:3], b[:3], a[3], b[3]), 0.07)
    return d

def torso(p):
    d = ellipsoid(p, (0, -0.02, 0.04), (0.6, 0.64, 0.54))
    d = smin(d, ellipsoid(p, (0, 0.4, 0), (0.48, 0.4, 0.42)), 0.2)
    for s in (1, -1):
        d = smin(d, sphere(p, (s * 0.43, 0.52, 0), 0.2), 0.14)
        d = smin(d, sphere(p, (s * 0.26, -0.44, 0.0), 0.29), 0.16)
    d = smin(d, torus_y(p, (0, 0.74, 0.0), 0.21, 0.05), 0.04)             # collar
    d = smin(d, capsule(p, (0, 0.62, 0.36), (0, -0.2, 0.585), 0.05, 0.05), 0.05)  # button placket
    return d
def neck(p): return capsule(p, (0, 0.66, 0), (0, 0.98, 0), 0.19)
def upper_arm(p): return capsule(p, (0, 0.02, 0), (0, -0.4, 0), 0.175, 0.16)
def forearm(p):
    d = capsule(p, (0, 0, 0), (0, -0.32, 0), 0.16, 0.15)
    return smin(d, torus_y(p, (0, -0.36, 0), 0.12, 0.05), 0.04)
def hand(p):
    d = capsule(p, (0, -0.3, 0), (0, -0.42, 0), 0.1)
    d = smin(d, ellipsoid(p, (0, -0.52, 0), (0.15, 0.14, 0.085)), 0.06)
    for i, x in enumerate((-0.1, -0.035, 0.035, 0.1)):
        d = smin(d, capsule(p, (x, -0.6, 0), (x * 1.7, -0.75 - (0.02 if i in (1, 2) else 0), 0.01), 0.047, 0.04), 0.03)
    d = smin(d, capsule(p, (0.12, -0.5, 0.02), (0.25, -0.58, 0.04), 0.052, 0.044), 0.035)
    return d
def leg(p):
    d = capsule(p, (0, 0, 0), (0, -0.4, 0), 0.26, 0.22)
    return smin(d, torus_y(p, (0, -0.47, 0), 0.165, 0.06), 0.05)
def foot(p):
    d = capsule(p, (0, -0.4, 0), (0, -0.55, 0), 0.13)
    d = smin(d, ellipsoid(p, (0, -0.62, 0.1), (0.17, 0.115, 0.27)), 0.08)
    for i, x in enumerate((-0.11, -0.055, 0.0, 0.055, 0.11)):
        d = smin(d, sphere(p, (x, -0.63, 0.35 - abs(x) * 0.5), 0.05 - abs(x) * 0.08), 0.025)
    return d
def button(p): return ellipsoid(p, (0, 0, 0), (0.042, 0.042, 0.022))

PARTS = {  # name: (sdf, bounds min, bounds max, voxel, extra occluder)
    'head': (head, (-1.3, -1.2, -1.2), (1.3, 1.2, 1.3), 0.026, hair),
    'hair': (hair, (-1.5, -0.9, -1.5), (1.5, 1.6, 1.5), 0.03, None),
    'torso': (torso, (-0.9, -0.95, -0.8), (0.9, 1.0, 0.85), 0.022, None),
    'neck': (neck, (-0.3, 0.5, -0.3), (0.3, 1.25, 0.3), 0.03, None),
    'upperArm': (upper_arm, (-0.3, -0.7, -0.3), (0.3, 0.3, 0.3), 0.022, None),
    'forearm': (forearm, (-0.3, -0.6, -0.3), (0.3, 0.25, 0.3), 0.02, None),
    'hand': (hand, (-0.3, -0.92, -0.2), (0.4, -0.15, 0.2), 0.012, None),
    'leg': (leg, (-0.4, -0.7, -0.4), (0.4, 0.4, 0.4), 0.022, None),
    'foot': (foot, (-0.3, -0.85, -0.3), (0.3, -0.2, 0.5), 0.014, None),
    'button': (button, (-0.08, -0.08, -0.06), (0.08, 0.08, 0.06), 0.008, None),
}

def b64(a): return base64.b64encode(a.tobytes()).decode()
out = {}
for name, (f, lo, hi, vox, occ) in PARTS.items():
    lo = np.array(lo); hi = np.array(hi)
    n = np.ceil((hi - lo) / vox).astype(int) + 1
    gx, gy, gz = [lo[i] + np.arange(n[i]) * vox for i in range(3)]
    P = np.stack(np.meshgrid(gx, gy, gz, indexing='ij'), -1).reshape(-1, 3)
    vol = np.concatenate([f(c) for c in np.array_split(P, max(1, len(P) // 400000))]).reshape(n)
    v, faces, normals, _ = measure.marching_cubes(vol, 0.0, spacing=(vox, vox, vox))
    v = v + lo
    # exact normals from the field, and soft ambient occlusion sampled along them
    e = 0.004
    g = np.stack([f(v + d) - f(v - d) for d in (np.array([e, 0, 0]), np.array([0, e, 0]), np.array([0, 0, e]))], -1)
    nrm = g / np.maximum(length(g)[..., None], 1e-9)
    field = (lambda q: np.minimum(f(q), occ(q))) if occ else f
    ao = np.zeros(len(v))
    for i, step in enumerate((0.04, 0.09, 0.16, 0.26)):
        ao += np.clip(step - field(v + nrm * step), 0, None) / step * (0.5 ** i)
    ao = np.clip(1 - 0.55 * ao, 0.35, 1)
    scale = max(np.abs(lo).max(), np.abs(hi).max())
    out[name] = {
        'scale': float(scale), 'count': int(len(v)),
        'pos': b64(np.round(v / scale * 32767).astype('<i2')),
        'nrm': b64(np.round(nrm * 127).astype('i1')),
        'ao': b64(np.round(ao * 255).astype('u1')),
        'idx': b64(faces.astype('<u4' if len(v) > 65535 else '<u2')), 'wide': bool(len(v) > 65535),
    }
    print(name, len(v), len(faces))
# Where the buttons sit on the placket: surface point and tilt, found by marching in from the front.
buttons = []
for y in (0.47, 0.27, 0.07, -0.13):
    lo_z, hi_z = 0.0, 1.2
    for _ in range(40):
        mid = (lo_z + hi_z) / 2
        if torso(np.array([[0.0, y, mid]]))[0] < 0: lo_z = mid
        else: hi_z = mid
    q = np.array([[0.0, y, lo_z]]); e = 0.004
    ny = torso(q + [0, e, 0])[0] - torso(q - [0, e, 0])[0]; nz = torso(q + [0, 0, e])[0] - torso(q - [0, 0, e])[0]
    buttons.append([y, float(lo_z) + 0.012, float(-np.arctan2(ny, nz))])
out['_buttons'] = buttons
json.dump(out, open('parts.json', 'w'))
import os; print(os.path.getsize('parts.json') // 1024, 'KB')
