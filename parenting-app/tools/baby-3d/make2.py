import json, sys
faces = json.load(open('faces.json')); parts = json.load(open('parts.json'))
html = r'''<title>Lilbaby Toy Baby</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap">
<style>
/* Layout: one stage card with the live 3D baby, action chips underneath. */
:root { --bg:#F6F3FA; --fg:#1B2340; --muted:#5E6785; --sky-top:#C9E6FB; --sky-bottom:#EAF6FF; --accent:#E0517A; --chip:#FFFFFF; --line:#D9DEEC; --font:'Rubik',system-ui,-apple-system,'Segoe UI',Arial,sans-serif }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#141726; --fg:#EEF1FB; --muted:#A7AFCB; --sky-top:#2B4468; --sky-bottom:#3C5C86; --accent:#FF7FA3; --chip:#222742; --line:#343A5C; color-scheme:dark } }
:root[data-theme="dark"] { --bg:#141726; --fg:#EEF1FB; --muted:#A7AFCB; --sky-top:#2B4468; --sky-bottom:#3C5C86; --accent:#FF7FA3; --chip:#222742; --line:#343A5C; color-scheme:dark }
body { background:var(--bg); color:var(--fg); font-family:var(--font); padding-block:24px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); }
main { max-width:440px; margin-inline:auto; display:flex; flex-direction:column; gap:16px }
h1 { font-size:26px; font-weight:700; margin:0; text-wrap:balance }
p { margin:0; color:var(--muted); font-size:15px; line-height:1.5 }
.stage { position:relative; border-radius:32px; overflow:hidden; background:linear-gradient(var(--sky-top), var(--sky-bottom)); aspect-ratio:1/1.1; max-width:100%; touch-action:pan-y; cursor:grab; user-select:none; -webkit-user-select:none }
.stage canvas { display:block; width:100%; height:100% }
.row { display:flex; gap:10px; flex-wrap:wrap }
button { font:500 15px var(--font); color:var(--fg); background:var(--chip); border:1px solid var(--line); border-radius:999px; padding:10px 18px; cursor:pointer }
button[aria-pressed="true"] { background:var(--accent); border-color:var(--accent); color:#fff }
button:focus-visible { outline:3px solid var(--accent); outline-offset:2px }
#fail { padding:24px; text-align:center }
</style>
<main dir="rtl" lang="he">
  <h1>תינוק תלת-ממד חי עם הפנים שלנו</h1>
  <p>הגוף מפוסל בקוד ומסתובב באמת. הפנים הן מהתמונות של הדמות. גררו כדי לסובב, ולחצו על הכפתורים.</p>
  <div class="stage" id="stage" role="img" aria-label="תינוק תלת-ממד"><p id="fail" hidden>התלת-ממד לא נטען בדפדפן הזה.</p></div>
  <div class="row" id="actions">
    <button data-act="wave">נפנוף לשלום</button>
    <button data-act="laugh">צחוק</button>
    <button data-act="sad">עצוב</button>
    <button data-act="jump">קפיצה</button>
    <button data-act="idle">רגיל</button>
    <button id="spin" aria-pressed="true">סיבוב</button>
  </div>
</main>
<script src="__THREE__"></script>
<script>
(function () {
  var stage = document.getElementById('stage');
  if (!window.THREE) { document.getElementById('fail').hidden = false; return; }
  var FACES = __FACES__, PARTS = __PARTS__;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { document.getElementById('fail').hidden = false; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);
  var scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf1d6cc, 0.86));
  var key = new THREE.DirectionalLight(0xfff3e6, 0.5); key.position.set(2.2, 9, 4.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 10; key.shadow.bias = -0.0015; key.shadow.normalBias = 0.03;
  var sc = key.shadow.camera; sc.left = -3; sc.right = 3; sc.top = 5; sc.bottom = -1; sc.near = 1; sc.far = 20; scene.add(key);
  var rim = new THREE.DirectionalLight(0xdfeaff, 0.35); rim.position.set(-4, 4, -5); scene.add(rim);
  var camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
  camera.position.set(0, 2.55, 11.6); camera.lookAt(0, 2.2, 0);

  function bytes(b64) { var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function geometry(name) {
    var p = PARTS[name], pos16 = new Int16Array(bytes(p.pos).buffer), n8 = new Int8Array(bytes(p.nrm).buffer), ao = bytes(p.ao);
    var pos = new Float32Array(p.count * 3), nrm = new Float32Array(p.count * 3), col = new Float32Array(p.count * 3);
    for (var i = 0; i < p.count * 3; i++) { pos[i] = pos16[i] / 32767 * p.scale; nrm[i] = n8[i] / 127; }
    for (var j = 0; j < p.count; j++) { var a = ao[j] / 255; a = a * a; col[j * 3] = col[j * 3 + 1] = col[j * 3 + 2] = a; }
    var idx = bytes(p.idx), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(p.wide ? new Uint32Array(idx.buffer) : new Uint16Array(idx.buffer), 1));
    return g;
  }
  function physical(hex, o) {
    var m = new THREE.MeshPhysicalMaterial(Object.assign({ color: hex, roughness: 0.8, metalness: 0, vertexColors: true }, o || {}));
    m.color.convertSRGBToLinear(); if (m.sheenColor) m.sheenColor.convertSRGBToLinear(); return m;
  }
  var cloth = physical(0x86D3CD, { roughness: 1, sheen: 0.7, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xd9fbf6) });
  var skin = physical(0xF4C4A8, { roughness: 0.62, sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffd9c9) });
  var hairM = physical(0xB37C49, { roughness: 0.55, sheen: 0.8, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xf2c896) });
  var pearl = physical(0xffffff, { roughness: 0.35 });
  var geo = {}; Object.keys(PARTS).forEach(function (k) { if (k.charAt(0) !== '_') geo[k] = geometry(k); });
  function mesh(name, m) { var x = new THREE.Mesh(geo[name], m); x.castShadow = true; x.receiveShadow = true; return x; }

  var turntable = new THREE.Group(); scene.add(turntable);
  var body = new THREE.Group(); body.position.y = 1.26; turntable.add(body);
  var chest = new THREE.Group(); body.add(chest);
  chest.add(mesh('torso', cloth)); chest.add(mesh('neck', skin));
  PARTS._buttons.forEach(function (q) { var b = mesh('button', pearl); b.position.set(0, q[0], q[1]); b.rotation.x = q[2]; chest.add(b); });

  function leg(side) {
    var g = new THREE.Group(); g.position.set(side * 0.26, -0.44, 0); g.scale.x = side;
    g.add(mesh('leg', cloth)); g.add(mesh('foot', skin)); body.add(g); return g;
  }
  var legL = leg(1), legR = leg(-1);
  function arm(side) {
    var shoulder = new THREE.Group(); shoulder.position.set(side * 0.5, 0.52, 0); shoulder.scale.x = -side;
    shoulder.add(mesh('upperArm', cloth));
    var elbow = new THREE.Group(); elbow.position.y = -0.4; shoulder.add(elbow);
    elbow.add(mesh('forearm', cloth)); elbow.add(mesh('hand', skin));
    chest.add(shoulder); return { shoulder: shoulder, elbow: elbow };
  }
  var armL = arm(1), armR = arm(-1);

  // Head: sculpted, with the painted face of our character projected from the front.
  var head = new THREE.Group(); head.position.y = 1.78; body.add(head);
  var loader = new THREE.TextureLoader(), tex = {};
  Object.keys(FACES).forEach(function (k) { var t = loader.load(FACES[k]); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; tex[k] = t; });
  var faceU = { uFaceA: { value: tex.happy }, uFaceB: { value: tex.happy }, uFaceMix: { value: 0 }, uFace: { value: new THREE.Vector2(0.93, -0.235) } };
  var headM = physical(0xF4C4A8, { roughness: 0.62, sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffd9c9) });
  headM.onBeforeCompile = function (s) {
    Object.assign(s.uniforms, faceU);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocalPos; varying vec3 vLocalN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalPos = position; vLocalN = normal;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocalPos; varying vec3 vLocalN; uniform sampler2D uFaceA; uniform sampler2D uFaceB; uniform float uFaceMix; uniform vec2 uFace;')
      .replace('#include <color_fragment>', [
        'vec2 fuv = vec2(vLocalPos.x / uFace.x * 0.5 + 0.5, (vLocalPos.y - uFace.y) / uFace.x * 0.5 + 0.5);',
        'vec4 ft = mix(texture2D(uFaceA, fuv), texture2D(uFaceB, fuv), uFaceMix);',
        'float inside = step(0.0, fuv.x) * step(fuv.x, 1.0) * step(0.0, fuv.y) * step(fuv.y, 1.0);',
        'float fm = ft.a * inside * smoothstep(0.12, 0.5, vLocalN.z);',
        // the painted face carries its own shading, so the baked occlusion is faded out under it
        'diffuseColor.rgb = mix(diffuseColor.rgb * vColor, ft.rgb, fm);'
      ].join('\n'));
  };
  head.add(mesh('head', headM)); head.add(mesh('hair', hairM));

  var ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.09 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0.012; ground.receiveShadow = true; scene.add(ground);

  // ---- behaviour
  var face = 'happy', action = 'idle', actionStart = -1, spinning = true, angle = 0, dragging = false, startX = 0, startAngle = 0;
  var pose = { sR: 0.42, eR: 0.22, sL: 0.42, eL: 0.22, tilt: 0, nod: 0, hop: 0, lean: 0 };
  function setFace(name) {
    if (face === name) return;
    faceU.uFaceA.value = tex[face]; faceU.uFaceB.value = tex[name]; faceU.uFaceMix.value = 0; face = name;
  }
  function act(name) { action = name; actionStart = -1; setFace(name === 'laugh' ? 'laugh' : name === 'sad' ? 'sad' : 'happy'); }
  document.getElementById('actions').addEventListener('click', function (e) { var a = e.target.getAttribute && e.target.getAttribute('data-act'); if (a) act(a); });
  var spinBtn = document.getElementById('spin');
  spinBtn.addEventListener('click', function () { spinning = !spinning; spinBtn.setAttribute('aria-pressed', String(spinning)); });
  stage.addEventListener('pointerdown', function (e) { dragging = true; startX = e.clientX; startAngle = angle; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', function (e) { if (dragging) angle = startAngle + (e.clientX - startX) * 0.012; });
  function end() { dragging = false; } stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  function resize() { var w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();

  var last = 0;
  function frame(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
    if (actionStart < 0) actionStart = now;
    var t = now / 1000, ta = (now - actionStart) / 1000;
    var target = { sR: 0.42, eR: 0.22, sL: 0.42, eL: 0.22, tilt: 0, nod: 0, hop: 0, lean: 0 };
    var sway = Math.sin(t * 1.6) * 0.03;
    if (action === 'wave') {
      target.sR = 1.5; target.eR = 1.0 + Math.sin(ta * 9) * 0.36; target.tilt = -0.09; target.sL = 0.3; target.lean = 0.04;
      if (ta > 3.2) act('idle');
    } else if (action === 'laugh') {
      target.hop = Math.abs(Math.sin(ta * 9)) * 0.12; target.sR = target.sL = 0.95 + Math.sin(ta * 9) * 0.15; target.nod = -0.1;
    } else if (action === 'sad') {
      target.sR = target.sL = 0.14; target.eR = target.eL = 0.1; target.nod = 0.2; target.tilt = Math.sin(t * 1.3) * 0.04;
    } else if (action === 'jump') {
      var j = Math.max(0, Math.sin(ta * 5.2)); target.hop = j * 0.7; target.sR = target.sL = 0.5 + j * 1.6; target.eR = target.eL = 0.2;
      if (ta > 1.8) act('idle');
    }
    var k = Math.min(1, dt * 10);
    for (var n in pose) pose[n] += (target[n] - pose[n]) * (n === 'hop' ? Math.min(1, dt * 30) : k);
    faceU.uFaceMix.value = Math.min(1, faceU.uFaceMix.value + dt * 7);
    armR.shoulder.rotation.z = -(pose.sR + sway); armR.elbow.rotation.z = -pose.eR;
    armL.shoulder.rotation.z = pose.sL + sway; armL.elbow.rotation.z = pose.eL;
    head.rotation.z = pose.tilt; head.rotation.x = pose.nod; chest.rotation.z = pose.lean;
    var breathe = 1 + Math.sin(t * 1.9) * 0.01;
    body.position.y = 1.26 + pose.hop; chest.scale.set(breathe, 1, breathe);
    if (spinning && !dragging) angle += dt * 0.7;
    turntable.rotation.y = angle;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  window.__toy = { snap: function () { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); }, act: act, setAngle: function (a) { angle = a; spinning = false; } };
  requestAnimationFrame(frame);
})();
</script>
'''
html = html.replace('__THREE__', sys.argv[1]).replace('__FACES__', json.dumps(faces)).replace('__PARTS__', json.dumps(parts))
open(sys.argv[2], 'w').write(html); print(len(html) // 1024, 'KB')
