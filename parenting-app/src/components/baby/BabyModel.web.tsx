import { Asset } from 'expo-asset';
import { useEffect, useRef } from 'react';
import type { BabyModelProps } from './BabyModel';

export type { BabyModelProps } from './BabyModel';

type Three = typeof import('three');
type Group = import('three').Group;

/** Clothes colours. The model's own teal is a little dull, so teal is repainted too. */
const OUTFIT_RGB: Record<string, [number, number, number] | null> = {
  teal: [0x9a, 0xd8, 0xdc],
  blue: [0x8f, 0xb8, 0xee],
  pink: [0xf4, 0x9b, 0xb6],
  lilac: [0xbb, 0xa6, 0xee],
  yellow: [0xf3, 0xcd, 0x72],
  white: [0xff, 0xff, 0xff],
};

function toHsv([r8, g8, b8]: [number, number, number]): [number, number, number] {
  const r = r8 / 255, g = g8 / 255, b = b8 / 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = 0;
  if (d > 0) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, mx > 0 ? d / mx : 0, mx];
}

/** Repaints only the teal clothing in the shader; skin, hair and eyes are far away in hue and stay untouched. */
const RECOLOUR_GLSL = /* glsl */ `
  if (uOutfitOn > 0.5) {
    vec3 lin = diffuseColor.rgb;
    vec3 c = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));
    float mx = max(c.r, max(c.g, c.b));
    float d = mx - min(c.r, min(c.g, c.b));
    float h = 0.0;
    if (d > 0.00001) {
      if (mx == c.r) h = mod((c.g - c.b) / d, 6.0);
      else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
      else h = (c.r - c.g) / d + 4.0;
      h /= 6.0;
    }
    float s = mx > 0.0 ? d / mx : 0.0;
    float cloth = smoothstep(0.39, 0.42, h) * (1.0 - smoothstep(0.59, 0.62, h)) * smoothstep(0.08, 0.13, s);
    float ns = clamp(s * uOutfit.y / uClothBase.x, 0.0, 1.0);
    float nv = clamp(mx * uOutfit.z / uClothBase.y, 0.0, 1.0);
    if (uOutfit.y < 0.05) { ns = s * 0.06; nv = clamp(0.55 + mx * 0.52, 0.0, 1.0); }
    vec3 k = clamp(abs(mod(uOutfit.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    vec3 rgb = nv * mix(vec3(1.0), k, ns);
    diffuseColor.rgb = mix(lin, pow(rgb, vec3(2.2)), cloth);
  }
`;

const loaded = new Map<string, Promise<Group>>();

async function loadModel(uri: string): Promise<Group> {
  let pending = loaded.get(uri);
  if (!pending) {
    pending = (async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(uri);
      return gltf.scene;
    })();
    loaded.set(uri, pending);
    pending.catch(() => loaded.delete(uri));
  }
  return pending;
}

/** Turn speed when left alone: one full turn in about 14 seconds. */
const AUTO_SPEED = (Math.PI * 2) / 14;
/** Radians per dragged pixel. */
const DRAG_SPEED = 0.011;

/**
 * A real 3D baby: a textured model that turns smoothly through 360° on its own and follows
 * the finger when dragged sideways.
 */
export function BabyModel({ model, outfit, size, active, onReady, onError }: BabyModelProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef({ active, outfit, apply: (_outfit: string) => {}, wake: () => {} });
  live.current.active = active;
  live.current.outfit = outfit;
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };

  useEffect(() => { live.current.apply(outfit); }, [outfit]);
  useEffect(() => { if (active) live.current.wake(); }, [active]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE: Three = await import('three');
      const source = await loadModel(Asset.fromModule(model.file).uri);
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
      renderer.setSize(size, size);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const canvas = renderer.domElement;
      canvas.style.display = 'block';
      canvas.style.touchAction = 'pan-y';
      canvas.style.cursor = 'grab';
      el.appendChild(canvas);

      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0xffe9dc, 2.5));
      const key = new THREE.DirectionalLight(0xfff6ee, 1.5);
      key.position.set(1.6, 3.2, 4);
      scene.add(key);

      const uniforms = {
        uOutfitOn: { value: 0 },
        uOutfit: { value: new THREE.Vector3() },
        uClothBase: { value: new THREE.Vector2(model.clothS, model.clothV) },
      };
      const materials: import('three').Material[] = [];
      const baby = source.clone(true);
      baby.traverse((node) => {
        const mesh = node as import('three').Mesh;
        if (!mesh.isMesh) return;
        const material = (mesh.material as import('three').MeshStandardMaterial).clone();
        // The generated model's own gloss map makes the skin look wet; use a soft matte finish.
        material.metalness = 0;
        material.roughness = 0.82;
        material.metalnessMap = null;
        material.roughnessMap = null;
        if (material.map) material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
        material.onBeforeCompile = (shader) => {
          Object.assign(shader.uniforms, uniforms);
          shader.fragmentShader = shader.fragmentShader
            .replace('void main() {', 'uniform float uOutfitOn;\nuniform vec3 uOutfit;\nuniform vec2 uClothBase;\nvoid main() {')
            .replace('#include <map_fragment>', `#include <map_fragment>\n${RECOLOUR_GLSL}`);
        };
        mesh.material = material;
        materials.push(material);
      });

      // Centre the model and fit it to the view, whatever size it was exported at.
      const box = new THREE.Box3().setFromObject(baby);
      const centre = box.getCenter(new THREE.Vector3());
      const extent = box.getSize(new THREE.Vector3());
      baby.position.sub(centre);
      const turntable = new THREE.Group();
      turntable.add(baby);
      const fit = 1 / Math.max(extent.y, Math.hypot(extent.x, extent.z) * 0.92);
      turntable.scale.setScalar(fit);
      scene.add(turntable);

      // Soft contact shadow so the baby sits on the floor instead of floating.
      const blob = document.createElement('canvas');
      blob.width = blob.height = 128;
      const ctx = blob.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
        g.addColorStop(0, 'rgba(60,40,70,0.34)');
        g.addColorStop(1, 'rgba(60,40,70,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      }
      const shadowTexture = new THREE.CanvasTexture(blob);
      const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
      const shadowGeometry = new THREE.PlaneGeometry(1, 1);
      const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shadow.rotation.x = -Math.PI / 2;
      const footprint = Math.max(extent.x, extent.z) * fit * 1.25;
      shadow.scale.set(footprint, footprint, 1);
      const floorY = (-extent.y / 2) * fit;
      shadow.position.y = floorY + 0.004;
      scene.add(shadow);

      const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
      const distance = 0.62 / Math.tan((camera.fov * Math.PI) / 360);
      camera.position.set(0, 0.3, distance);
      camera.lookAt(0, -0.02, 0);

      live.current.apply = (name: string) => {
        const rgb = OUTFIT_RGB[name] ?? null;
        uniforms.uOutfitOn.value = rgb ? 1 : 0;
        if (rgb) uniforms.uOutfit.value.set(...toHsv(rgb));
        draw();
      };

      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      let angle = 0;
      let velocity = still ? 0 : AUTO_SPEED;
      let dragging = false;
      let lastX = 0;
      let lastMove = 0;
      let frame = 0;
      let last = 0;
      let clock = 0;

      function draw() {
        turntable.rotation.y = angle;
        // A slow, tiny breath keeps the character alive without looking mechanical.
        turntable.scale.set(fit, fit * (1 + (still ? 0 : Math.sin(clock * 1.8) * 0.008)), fit);
        turntable.position.y = floorY * (turntable.scale.y / fit - 1);
        el!.dataset.angle = String(Math.round((((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI)));
        renderer.render(scene, camera);
      }

      function tick(time: number) {
        frame = 0;
        if (disposed) return;
        const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
        last = time;
        clock += dt;
        if (!dragging) {
          // After a flick the spin eases back to the calm automatic turn.
          const rest = still ? 0 : AUTO_SPEED * (velocity < 0 ? -1 : 1);
          velocity += (rest - velocity) * Math.min(1, dt * 2.2);
          angle += velocity * dt;
        }
        draw();
        schedule();
      }

      function schedule() {
        if (frame || disposed) return;
        const running = live.current.active && document.visibilityState === 'visible' && (!still || dragging || Math.abs(velocity) > 0.01);
        if (running) frame = requestAnimationFrame(tick);
        else last = 0;
      }
      live.current.wake = schedule;

      const down = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        lastMove = performance.now();
        velocity = 0;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = 'grabbing';
        schedule();
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        const now = performance.now();
        const delta = (e.clientX - lastX) * DRAG_SPEED;
        const dt = Math.max((now - lastMove) / 1000, 0.008);
        angle += delta;
        velocity = velocity * 0.5 + (delta / dt) * 0.5;
        lastX = e.clientX;
        lastMove = now;
      };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        canvas.style.cursor = 'grab';
        velocity = Math.max(-9, Math.min(9, velocity));
        if (performance.now() - lastMove > 120) velocity = 0;
        schedule();
      };
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      document.addEventListener('visibilitychange', schedule);

      cleanup = () => {
        cancelAnimationFrame(frame);
        document.removeEventListener('visibilitychange', schedule);
        canvas.remove();
        materials.forEach((m) => m.dispose());
        shadowGeometry.dispose();
        shadowMaterial.dispose();
        shadowTexture.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        live.current.apply = () => {};
        live.current.wake = () => {};
      };

      live.current.apply(live.current.outfit);
      el.dataset.ready = '1';
      callbacks.current.onReady();
      schedule();
    })().catch(() => { if (!disposed) callbacks.current.onError(); });

    return () => { disposed = true; cleanup(); };
  }, [model, size]);

  return <div ref={host} data-testid="baby-3d" style={{ width: size, height: size, position: 'absolute', left: 0, top: 0 }} />;
}
