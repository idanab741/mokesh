# 3D baby prototype (sculpted in code)

`sculpt.py` builds the baby's parts (head, hair, torso, arms, hands, legs, feet) as smooth
implicit surfaces and writes compact meshes with baked ambient occlusion (`parts.json`).
`faces.py` cuts the character's face (happy / laughing / sad) from the reference renders in
`../baby-turn/reference`. `make2.py <three.js url> <out.html>` assembles a standalone demo
page: a jointed three.js figure whose head carries the projected face.

Needs: Pillow, numpy, scikit-image. This is a prototype shown as a demo page; it is not yet
used by the app.
