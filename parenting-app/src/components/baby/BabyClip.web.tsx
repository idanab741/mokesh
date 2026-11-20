import { Asset } from 'expo-asset';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { BabyClipProps } from './BabyClip';

export type { BabyClipProps } from './BabyClip';

/**
 * Every clip file holds the picture in its top half and, in the bottom half, four grey masks
 * at half size (skin, hair / clothes, irises) that say where each of them is in that frame.
 * The shader repaints those areas and keeps the light and shade of the picture.
 */
const PANEL_W = 668;
const PANEL_H = 720;
const ASPECT = PANEL_W / PANEL_H;
/** The edges fade out, so the clip's own backdrop melts into the screen (which has the same colour). */
const FEATHER = 'linear-gradient(to right, transparent 0, #000 16%, #000 84%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 10%, #000 92%, transparent 100%)';
const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' };
/** The video itself sits under the canvas, enlarged so only the picture half is visible. If the
 * canvas cannot be painted, this is what is seen: the clip in its original colours. */
const firstPanel: CSSProperties = { position: 'absolute', left: 0, top: 0, width: '100%', height: '200%', display: 'block', pointerEvents: 'none' };

const VERT = 'attribute vec2 p; varying vec2 uv; void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
const FRAG = `
precision highp float;
varying vec2 uv;
uniform sampler2D frame;
uniform float probe; uniform vec2 levels;
uniform vec3 skinSrc; uniform vec4 skinShift; uniform float skinOn;
uniform vec3 hairSrc; uniform vec4 hairShift; uniform float hairOn;
uniform vec3 clothSrc; uniform vec4 clothShift; uniform float clothOn;
uniform vec3 eyeSrc; uniform vec4 eyeShift; uniform float eyeOn;
// OKLab: a colour space in which lightness, colourfulness and hue can be moved separately.
vec3 toOk(vec3 c) {
  vec3 l = pow(clamp(c, 0.0, 1.0), vec3(2.2));
  vec3 lms = vec3(dot(l, vec3(0.4122214708, 0.5363325363, 0.0514459929)), dot(l, vec3(0.2119034982, 0.6806995451, 0.1073969566)), dot(l, vec3(0.0883024619, 0.2817188376, 0.6299787005)));
  lms = pow(max(lms, vec3(0.0)), vec3(1.0 / 3.0));
  return vec3(dot(lms, vec3(0.2104542553, 0.7936177850, -0.0040720468)), dot(lms, vec3(1.9779984951, -2.4285922050, 0.4505937099)), dot(lms, vec3(0.0259040371, 0.7827717662, -0.8086757660)));
}
vec3 fromOk(vec3 lab) {
  vec3 lms = vec3(lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z, lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z, lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z);
  lms = lms * lms * lms;
  vec3 l = vec3(dot(lms, vec3(4.0767416621, -3.3077115913, 0.2309699292)), dot(lms, vec3(-1.2684380046, 2.6097574011, -0.3413193965)), dot(lms, vec3(-0.0041960863, -0.7034186147, 1.7076147010)));
  return pow(clamp(l, 0.0, 1.0), vec3(1.0 / 2.2));
}
// A region keeps its own variation of lightness, colourfulness and hue (shading, blush, sheen,
// folds); only the middle of that variation moves. src is the rendered colour of the region
// (lightness, chroma, hue); sh is how the chosen look differs from it, as measured on rendered
// references: lightness shift, chroma ratio, hue shift, contrast ratio.
// keep: how much of the region's own hue variation is carried over. A pixel whose hue strays far
// from the region's (a dark seam, a deep fold) would otherwise land on a foreign colour.
vec3 shift(vec3 img, vec3 src, vec4 sh, float keep) {
  vec3 lab = toOk(img);
  float L = src.x + sh.x + (lab.x - src.x) * sh.w;
  float C = src.y * sh.y * pow(clamp(length(lab.yz) / max(src.y, 0.001), 0.0, 2.2), 0.85);
  float stray = atan(lab.z, lab.y) - src.z;
  stray = atan(sin(stray), cos(stray));
  float h = src.z + sh.z + clamp(stray * keep, -0.4 * keep, 0.4 * keep);
  return fromOk(vec3(L, C * cos(h), C * sin(h)));
}
// Some phones hand video frames to WebGL in "video range" (black is not 0, white is not 1).
// The levels measured on this device stretch them back, for the picture and the masks alike.
vec3 px(vec2 at) { return clamp((texture2D(frame, at).rgb - levels.x) / (levels.y - levels.x), 0.0, 1.0); }
vec2 mask(float col, float row) { return vec2((uv.x + col) / 2.0, 0.5 - (1.0 - uv.y + row) / 4.0); }
void main() {
  if (probe > 0.5) { gl_FragColor = vec4(texture2D(frame, mask(0.0, 1.0)).rgb, 1.0); return; }
  vec3 img = px(vec2(uv.x, 0.5 + uv.y / 2.0));
  // The soft edge of a mask shimmers a little from frame to frame in a compressed clip, and a
  // big change of lightness (dark hair to blond) makes that visible. A firmer edge keeps still.
  float mSkin = smoothstep(0.22, 0.78, px(mask(0.0, 0.0)).g) * skinOn;
  float mHair = smoothstep(0.22, 0.78, px(mask(1.0, 0.0)).g) * hairOn;
  float mCloth = px(mask(0.0, 1.0)).g;
  // The mask is stored at half size, so the thin rim of the clothes, the seams and the tint the
  // fabric throws on its buttons would keep the rendered colour. Next to the clothes, every
  // pixel that still carries that colour is therefore treated as fabric as well.
  float near = mCloth;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    near = max(near, px(mask(0.0, 1.0) + vec2(cos(a) * 0.006, sin(a) * 0.003)).g);
  }
  vec3 okc = toOk(img);
  float dh = atan(okc.z, okc.y) - clothSrc.z;
  dh = abs(atan(sin(dh), cos(dh)));
  float sameHue = smoothstep(0.005, 0.016, length(okc.yz)) * (1.0 - smoothstep(0.95, 1.35, dh));
  // The dark seam lines at the cuffs, ankles and neckline are fabric in shadow: right at the
  // clothes, dark, and neither skin nor hair.
  float notBody = (1.0 - px(mask(0.0, 0.0)).g) * (1.0 - px(mask(1.0, 0.0)).g);
  float seam = smoothstep(0.2, 0.45, near) * notBody * (1.0 - smoothstep(0.68, 0.8, okc.x));
  mCloth = clamp(max(max(mCloth * 1.08, sameHue * smoothstep(0.04, 0.25, near)), seam), 0.0, 1.0) * clothOn;
  float mEye = px(mask(1.0, 1.0)).g * eyeOn;
  if (mSkin > 0.003) img = mix(img, shift(img, skinSrc, skinShift, 0.85), mSkin);
  if (mHair > 0.003) img = mix(img, shift(img, hairSrc, hairShift, 0.6), mHair);
  if (mEye > 0.003) img = mix(img, shift(img, eyeSrc, eyeShift, 0.5), mEye);
  if (mCloth > 0.003) img = mix(img, shift(img, clothSrc, clothShift, 0.35), mCloth);
  gl_FragColor = vec4(img, 1.0);
}`;

interface Painter { draw: (video: HTMLVideoElement) => boolean | 'wait'; setLook: (look: BabyClipProps['look'], base: BabyClipProps['clips']['base']) => void; dispose: () => void }

function createPainter(canvas: HTMLCanvasElement): Painter | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
  if (!gl) return null;
  const compile = (type: number, src: string) => { const sh = gl.createShader(type)!; gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const u = (name: string) => gl.getUniformLocation(program, name);
  let calibrated = false;
  gl.uniform2f(u('levels'), 0, 1);
  gl.uniform1f(u('probe'), 0);
  return {
    setLook(look, base) {
      for (const part of ['skin', 'hair', 'cloth'] as const) {
        gl.uniform1f(u(`${part}On`), look[part] ? 1 : 0);
        gl.uniform3fv(u(`${part}Src`), base[part]);
        if (look[part]) gl.uniform4fv(u(`${part}Shift`), look[part] as unknown as number[]);
      }
      gl.uniform1f(u('eyeOn'), look.eyes ? 1 : 0);
      gl.uniform3fv(u('eyeSrc'), base.iris as unknown as number[]);
      if (look.eyes) gl.uniform4fv(u('eyeShift'), look.eyes as unknown as number[]);
    },
    draw(video) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      if (!calibrated) {
        // Measure this device's black and white on the clothes mask (pure black and white in the file).
        gl.uniform1f(u('probe'), 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        const w = canvas.width, h = canvas.height, data = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
        let lo = 255, hi = 0;
        for (let i = 1; i < data.length; i += 4 * 5) { const v = data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
        gl.uniform1f(u('probe'), 0);
        // A frame that is not there yet (all one value) is not painted; the clip itself stays visible.
        if (hi - lo < 120) return 'wait';
        gl.uniform2f(u('levels'), lo / 255, hi / 255);
        calibrated = true;
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return gl.getError() === gl.NO_ERROR && !gl.isContextLost();
    },
    dispose() { gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}

/**
 * The baby as real rendered video: an idle clip that loops and a wave that plays once when
 * the screen opens and whenever the baby is tapped. Both clips share the same first frame,
 * so switching between them does not jump. The clip is repainted live to the chosen skin,
 * hair, eye and clothing colours.
 */
export function BabyClip({ clips, height, label, active, look, greet = true }: BabyClipProps) {
  const idle = useRef<HTMLVideoElement>(null);
  const wave = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const painter = useRef<Painter | null>(null);
  const [painted, setPainted] = useState(false);
  const [plain, setPlain] = useState(false);
  const [waving, setWaving] = useState(false);
  const wavingRef = useRef(false);
  const greeted = useRef(false);
  const repaint = useRef<() => void>(() => undefined);
  const lookRef = useRef(look);
  lookRef.current = look;

  /** iOS only lets a video start by itself when the element really carries the muted attribute. */
  const quiet = (v: HTMLVideoElement | null) => { if (v) { v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); } };

  const playWave = () => {
    // A tap is also the moment a phone that held autoplay back (low power mode) lets the clip start.
    if (idle.current?.paused && !wavingRef.current) idle.current.play().catch(() => undefined);
    const w = wave.current;
    if (!w || wavingRef.current) return;
    w.currentTime = 0;
    w.play().then(() => { wavingRef.current = true; setWaving(true); }).catch(() => undefined);
  };
  const backToIdle = () => {
    const v = idle.current;
    if (v) { v.currentTime = 0; v.play().catch(() => undefined); }
    wavingRef.current = false;
    setWaving(false);
  };

  // The painter lives as long as the component; without WebGL the plain clip is shown.
  useEffect(() => {
    if (!canvas.current) return;
    const p = createPainter(canvas.current);
    if (!p) { setPlain(true); return; }
    painter.current = p;
    p.setLook(lookRef.current, clips.base);
    return () => { p.dispose(); painter.current = null; };
  }, []);
  useEffect(() => { painter.current?.setLook(look, clips.base); repaint.current(); }, [look, clips.base]);

  useEffect(() => {
    const v = idle.current;
    if (!v) return;
    quiet(v); quiet(wave.current);
    if (!active) { v.pause(); wave.current?.pause(); return; }
    // Coming back (another tab, a sheet that was open): carry on from where the baby stopped.
    // A wave that was cut off is finished rather than left frozen.
    if (wavingRef.current && wave.current) wave.current.play().catch(() => backToIdle());
    else v.play().catch(() => undefined);
    let frame = 0;
    let stopped = false;
    const paint = () => {
      const source = wavingRef.current ? wave.current : idle.current;
      if (!painter.current || !source || source.readyState < 2) return;
      let ok: boolean | 'wait' = false;
      try { ok = painter.current.draw(source); } catch { ok = false; }
      if (ok === 'wait') return;
      // If painting fails on this device, stop and show the clip itself, in its own colours.
      if (ok) setPainted(true); else { painter.current = null; setPlain(true); }
    };
    // Painting exactly when the clip presents a new frame is steadier on phones than painting on
    // every screen refresh. Browsers without that callback paint on screen refreshes.
    type FrameVideo = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    const perFrame = typeof (v as FrameVideo).requestVideoFrameCallback === 'function';
    const follow = (video: FrameVideo | null) => {
      if (!video?.requestVideoFrameCallback) return;
      const onFrame = () => {
        if (stopped) return;
        if (video === (wavingRef.current ? wave.current : idle.current)) paint();
        video.requestVideoFrameCallback?.(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
    };
    if (perFrame) { follow(idle.current); follow(wave.current); paint(); }
    else { const tick = () => { frame = requestAnimationFrame(tick); paint(); }; frame = requestAnimationFrame(tick); }
    repaint.current = paint;
    let hello: ReturnType<typeof setTimeout> | undefined;
    if (greet && !greeted.current && clips.wave && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      // Say hello once, shortly after the screen opens.
      hello = setTimeout(() => { greeted.current = true; playWave(); }, 900);
    }
    return () => { stopped = true; cancelAnimationFrame(frame); if (hello) clearTimeout(hello); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div role="img" aria-label={label} data-testid="baby-clip" data-waving={waving ? '1' : '0'} data-painted={painted ? '1' : '0'} onClick={playWave}
      style={{ position: 'relative', overflow: 'hidden', width: Math.round(height * ASPECT), height, cursor: clips.wave ? 'pointer' : 'default', maskImage: FEATHER, WebkitMaskImage: FEATHER, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }}>
      
      <video ref={idle} src={Asset.fromModule(clips.idle).uri} poster={Asset.fromModule(clips.poster).uri} muted loop playsInline autoPlay preload="auto" style={firstPanel} />
      {clips.wave ? (
        <video ref={wave} src={Asset.fromModule(clips.wave).uri} muted playsInline preload="auto" onEnded={backToIdle}
          style={{ ...firstPanel, visibility: waving ? 'visible' : 'hidden' }} />
      ) : null}
      {/* The canvas is only shown while it is being painted; underneath, the clip keeps playing. */}
      <canvas ref={canvas} width={PANEL_W} height={PANEL_H} style={{ ...fill, opacity: painted && !plain ? 1 : 0 }} />
    </div>
  );
}
