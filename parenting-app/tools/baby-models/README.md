# Baby 3D models

`source/*.png` are the generated front-view character images (Figma AI image generation).
Each one is turned into a textured 3D model (`assets/baby/models/<sex>-<pose>.glb`) with an
image-to-3D model (Trellis 2 in Figma Weave: resolution 1024, texture 2048, 100k faces, remesh).

After adding a model, register it in `src/components/baby/models.web.ts` together with the
median saturation and brightness of its teal clothing (the shader uses them to recolour the
clothes). Characters without a model fall back to the sprite views in `assets/baby/*.webp`.
