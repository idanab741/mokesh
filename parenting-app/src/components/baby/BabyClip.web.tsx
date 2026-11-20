import { Asset } from 'expo-asset';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { BabyClipProps } from './BabyClip';

export type { BabyClipProps } from './BabyClip';

/**
 * Every clip file is a grid of six panels of the same size (3 across, 2 down): the picture,
 * then grey masks that say where the skin, the hair, the clothes and the irises are in that
 * frame. The shader repaints those areas and keeps the light and shade of the picture.
 */
const PANEL_W = 668;
const PANEL_H = 720;
const ASPECT = PANEL_W / PANEL_H;
/** The edges fade out, so the clip's own backdrop melts into the screen (which has the same colour). */
const FEATHER = 'linear-gradient(to right, transparent 0, #000 16%, #000 84%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 10%, #000 92%, transparent 100%)';
const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' };
/** Without WebGL the plain picture is shown: the grid is enlarged so only its first panel is visible. */
const firstPanel: CSSProperties = { position: 'absolute', left: 0, top: 0, width: '300%', height: '200%', display: 'block', pointerEvents: 'none' };

const VERT = 'attribute vec2 p; varying vec2 uv; void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
const FRAG = `
precision mediump float;
varying vec2 uv;
uniform sampler2D frame;
uniform vec3 skinGain; uniform float skinOn;
uniform vec3 hairTo; uniform float hairOn;
uniform vec3 eyeHsv; uniform float eyeOn;
uniform vec3 clothTo; uniform float clothOn;
vec3 lin(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(2.2)); }
vec3 srgb(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-6)), d / (q.x + 1e-6), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
float mx(vec3 c) { return max(c.r, max(c.g, c.b)); }
vec2 panel(float col, float row) { return vec2((uv.x + col) / 3.0, 1.0 - (1.0 - uv.y + row) / 2.0); }
void main() {
  vec3 img = texture2D(frame, panel(0.0, 0.0)).rgb;
  float mSkin = texture2D(frame, panel(1.0, 0.0)).g * skinOn;
  float mHair = texture2D(frame, panel(2.0, 0.0)).g * hairOn;
  float mCloth = texture2D(frame, panel(0.0, 1.0)).g * clothOn;
  float mEye = texture2D(frame, panel(1.0, 1.0)).g * eyeOn;
  // skin: a tone change in linear light keeps the shading and the blush; a little sheen stays
  vec3 s = srgb(lin(img) * skinGain);
  s += clamp(mx(img) - 0.62, 0.0, 1.0) * 0.22 * (1.0 - s);
  img = mix(img, s, mSkin);
  // hair: the strands' light and shade are kept; shadows become a deeper, richer version
  // of the colour and highlights a lighter one, so the hair keeps its depth
  float hs = clamp(mx(img) / 0.66, 0.0, 1.6);
  vec3 deep = hairTo * hairTo * 0.62 + hairTo * 0.10;
  vec3 light = hairTo + (1.0 - hairTo) * 0.42;
  vec3 h = hs < 1.0 ? mix(deep, hairTo, smoothstep(0.42, 1.0, hs)) : mix(hairTo, light, clamp((hs - 1.0) / 0.42, 0.0, 1.0));
  img = mix(img, h, mHair);
  // eyes: only the hue and strength of the iris change
  vec3 e = rgb2hsv(img);
  e = vec3(eyeHsv.x, clamp(e.y * eyeHsv.y / 0.63, 0.0, 1.0), clamp(e.z * eyeHsv.z / 0.39, 0.0, 1.0));
  img = mix(img, hsv2rgb(e), mEye);
  // clothes: the fabric's folds are kept as a gentle multiply, so pastels stay soft
  float cs = clamp(mx(img) / 0.80, 0.5, 1.2);
  vec3 c = clamp(clothTo * (0.25 + 0.75 * cs), 0.0, 1.0);
  c += clamp(cs - 1.0, 0.0, 1.0) * 0.5 * (1.0 - c);
  img = mix(img, c, mCloth);
  gl_FragColor = vec4(img, 1.0);
}`;

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
const lin = (v: number) => Math.pow(v, 2.2);
function hsv([r, g, b]: [number, number, number]): [number, number, number] {
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d > 0) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, max > 0 ? d / max : 0, max];
}
/** The skin tone the clips were rendered with. */
const BASE_SKIN = rgb('#F7C4A8');

interface Painter { draw: (video: HTMLVideoElement) => void; setLook: (look: BabyClipProps['look']) => void; dispose: () => void }

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
  return {
    setLook(look) {
      const skin = look.skin ? rgb(look.skin) : null;
      gl.uniform1f(u('skinOn'), skin ? 1 : 0);
      if (skin) gl.uniform3fv(u('skinGain'), skin.map((v, i) => Math.min(1.45, Math.max(0.03, lin(v) / lin(BASE_SKIN[i])))));
      gl.uniform1f(u('hairOn'), look.hair ? 1 : 0);
      if (look.hair) gl.uniform3fv(u('hairTo'), rgb(look.hair));
      gl.uniform1f(u('eyeOn'), look.eyes ? 1 : 0);
      if (look.eyes) gl.uniform3fv(u('eyeHsv'), hsv(rgb(look.eyes)));
      gl.uniform1f(u('clothOn'), look.cloth ? 1 : 0);
      if (look.cloth) gl.uniform3fv(u('clothTo'), rgb(look.cloth));
    },
    draw(video) {
      if (video.readyState < 2) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
  const lookRef = useRef(look);
  lookRef.current = look;

  const playWave = () => {
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
    p.setLook(lookRef.current);
    return () => { p.dispose(); painter.current = null; };
  }, []);
  useEffect(() => { painter.current?.setLook(look); }, [look]);

  useEffect(() => {
    const v = idle.current;
    if (!v) return;
    if (!active) { v.pause(); wave.current?.pause(); return; }
    v.play().catch(() => undefined);
    let frame = 0;
    const tick = () => {
      const source = wavingRef.current ? wave.current : idle.current;
      if (painter.current && source && source.readyState >= 2) { painter.current.draw(source); setPainted(true); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    let hello: ReturnType<typeof setTimeout> | undefined;
    if (greet && !greeted.current && clips.wave && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      // Say hello once, shortly after the screen opens.
      hello = setTimeout(() => { greeted.current = true; playWave(); }, 900);
    }
    return () => { cancelAnimationFrame(frame); if (hello) clearTimeout(hello); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const videoStyle: CSSProperties = plain ? firstPanel : { ...firstPanel, opacity: 0 };
  return (
    <div role="img" aria-label={label} data-testid="baby-clip" data-waving={waving ? '1' : '0'} data-painted={painted ? '1' : '0'} onClick={playWave}
      style={{ position: 'relative', overflow: 'hidden', width: Math.round(height * ASPECT), height, cursor: clips.wave ? 'pointer' : 'default', maskImage: FEATHER, WebkitMaskImage: FEATHER, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }}>
      {/* Until the first frame is painted, the still first frame keeps the place. */}
      {painted || plain ? null : <img alt="" src={Asset.fromModule(clips.poster).uri} style={{ ...fill, objectFit: 'cover' }} />}
      <video ref={idle} src={Asset.fromModule(clips.idle).uri} muted loop playsInline autoPlay preload="auto" style={videoStyle} />
      {clips.wave ? (
        <video ref={wave} src={Asset.fromModule(clips.wave).uri} muted playsInline preload="auto" onEnded={backToIdle}
          style={{ ...videoStyle, opacity: plain && waving ? 1 : 0 }} />
      ) : null}
      <canvas ref={canvas} width={PANEL_W} height={PANEL_H} style={{ ...fill, opacity: painted ? 1 : 0 }} />
    </div>
  );
}
