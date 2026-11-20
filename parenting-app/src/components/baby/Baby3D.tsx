import { Canvas, useFrame } from '@react-three/fiber';
import { Component, type ReactNode, useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import * as THREE from 'three';
import type { ChildSex } from '@/domain/age';
import type { AvatarConfig, BabyStage } from '@/domain/avatar';

/**
 * The child as a stylised 3D character in the spirit of animated-film babies: an oversized
 * head, big glossy eyes, round rosy cheeks, an open smile, chubby limbs with fingers and toes.
 * Everything is built from rounded primitives, so there is no model file to download.
 */

type V3 = [number, number, number];
type Chain = [V3, V3, V3];

interface Pose {
  head: V3;
  headTilt: V3;
  torso: { pos: V3; rot: V3; scale: V3 };
  diaper: { pos: V3; scale: V3 };
  /** [shoulder, elbow, hand]; index 0 is the baby's left (+x), 1 the right. */
  arms: [Chain, Chain];
  /** [hip, knee, ankle] */
  legs: [Chain, Chain];
  feet: [{ pos: V3; rot: V3 }, { pos: V3; rot: V3 }];
  /** Vertical offset so every pose sits nicely in the frame. */
  lift: number;
  shadow: V3;
  /** Which arm waves (0 left, 1 right) or none. */
  wave: 0 | 1 | null;
}

const mx = (v: V3): V3 => [-v[0], v[1], v[2]];
const both = (c: Chain): [Chain, Chain] => [c, [mx(c[0]), mx(c[1]), mx(c[2])]];
const bothFeet = (f: { pos: V3; rot: V3 }): Pose['feet'] => [f, { pos: mx(f.pos), rot: [f.rot[0], -f.rot[1], -f.rot[2]] }];

/** The baby faces +z. The head radius is 0.6; the body is deliberately small next to it. */
const POSES: Record<BabyStage, Pose> = {
  sit: {
    head: [0, 1.34, 0.04], headTilt: [0.02, 0, 0.05],
    torso: { pos: [0, 0.56, 0], rot: [0.04, 0, 0], scale: [0.41, 0.44, 0.37] },
    diaper: { pos: [0, 0.3, 0.03], scale: [0.45, 0.3, 0.41] },
    arms: [[[0.36, 0.8, 0.06], [0.52, 0.55, 0.22], [0.34, 0.44, 0.44]], [[-0.36, 0.8, 0.06], [-0.64, 0.8, 0.2], [-0.86, 1.02, 0.3]]],
    legs: both([[0.2, 0.24, 0.14], [0.4, 0.2, 0.46], [0.46, 0.15, 0.72]]),
    feet: bothFeet({ pos: [0.47, 0.22, 0.8], rot: [-1.25, 0.3, 0] }),
    lift: -0.92, shadow: [1.05, 1, 1.05], wave: 1,
  },
  stand: {
    head: [0, 1.56, 0.02], headTilt: [0, 0, 0.04],
    torso: { pos: [0, 0.8, 0], rot: [0, 0, 0], scale: [0.39, 0.43, 0.34] },
    diaper: { pos: [0, 0.56, 0], scale: [0.41, 0.28, 0.37] },
    arms: [[[0.35, 1.02, 0], [0.54, 0.82, 0.06], [0.62, 0.62, 0.16]], [[-0.35, 1.02, 0], [-0.6, 0.9, 0.1], [-0.76, 1.06, 0.2]]],
    legs: both([[0.19, 0.46, 0], [0.2, 0.28, 0.04], [0.2, 0.11, 0]]),
    feet: bothFeet({ pos: [0.2, 0.075, 0.09], rot: [0, 0.12, 0] }),
    lift: -1.08, shadow: [0.8, 1, 0.62], wave: 1,
  },
  crawl: {
    head: [0, 1.06, 0.64], headTilt: [-0.12, 0, 0.04],
    torso: { pos: [0, 0.64, 0], rot: [-0.1, 0, 0], scale: [0.38, 0.34, 0.5] },
    diaper: { pos: [0, 0.62, -0.36], scale: [0.41, 0.35, 0.31] },
    arms: both([[0.29, 0.58, 0.34], [0.31, 0.34, 0.42], [0.31, 0.1, 0.48]]),
    legs: both([[0.22, 0.52, -0.42], [0.25, 0.13, -0.3], [0.25, 0.12, -0.7]]),
    feet: bothFeet({ pos: [0.25, 0.16, -0.82], rot: [1.9, 3.14, 0] }),
    lift: -0.86, shadow: [0.9, 1, 1.35], wave: null,
  },
  tummy: {
    head: [0, 0.9, 0.5], headTilt: [-0.16, 0, 0.05],
    torso: { pos: [0, 0.36, 0], rot: [-0.24, 0, 0], scale: [0.39, 0.31, 0.5] },
    diaper: { pos: [0, 0.31, -0.36], scale: [0.42, 0.31, 0.32] },
    arms: both([[0.31, 0.42, 0.3], [0.45, 0.13, 0.42], [0.35, 0.1, 0.72]]),
    legs: both([[0.19, 0.27, -0.46], [0.21, 0.15, -0.74], [0.23, 0.36, -0.92]]),
    feet: bothFeet({ pos: [0.23, 0.52, -0.94], rot: [-1.3, 3.14, 0] }),
    lift: -0.78, shadow: [0.95, 1, 1.45], wave: null,
  },
};

const UP = new THREE.Vector3(0, 1, 0);
const SEG = 32;

interface Mat { color: string; kind?: 'skin' | 'cloth' | 'gloss' | 'matte'; opacity?: number }
function Material({ color, kind = 'matte', opacity }: Mat) {
  if (kind === 'skin') {
    // A little self-light reads as soft, warm skin instead of plastic, at a fraction of the cost of sheen.
    return <meshStandardMaterial color={color} roughness={0.58} emissive={color} emissiveIntensity={0.16} />;
  }
  if (kind === 'gloss') return <meshStandardMaterial color={color} roughness={0.12} metalness={0.05} />;
  if (kind === 'cloth') return <meshStandardMaterial color={color} roughness={0.92} />;
  return <meshStandardMaterial color={color} roughness={0.75} transparent={opacity !== undefined} opacity={opacity ?? 1} />;
}

function Ball({ pos, scale = [1, 1, 1], rot, r, ...mat }: { pos: V3; scale?: V3; rot?: V3; r: number } & Mat) {
  const size = r * Math.max(scale[0], scale[1], scale[2]);
  const seg = size > 0.3 ? SEG : size > 0.1 ? 20 : 10;
  return (
    <mesh position={pos} scale={scale} rotation={rot}>
      <sphereGeometry args={[r, seg, Math.round(seg * 0.75)]} />
      <Material {...mat} />
    </mesh>
  );
}

/** A rounded segment between two points. */
function Segment({ from, to, radius, ...mat }: { from: V3; to: V3; radius: number } & Mat) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return { position: a.clone().add(b).multiplyScalar(0.5), quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()), length: dir.length() };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <capsuleGeometry args={[radius, length, 5, radius > 0.08 ? 14 : 8]} />
      <Material {...mat} />
    </mesh>
  );
}

const rel = (p: V3, origin: V3): V3 => [p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]];

/** Arm as a group anchored at the shoulder, so it can wave. Chubby upper arm, forearm, hand with fingers. */
function Arm({ chain, skin, sleeve, waving }: { chain: Chain; skin: string; sleeve: string | null; waving: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [shoulder, elbowAbs, handAbs] = chain;
  const elbow = rel(elbowAbs, shoulder);
  const hand = rel(handAbs, shoulder);
  const fingers = useMemo(() => {
    const dir = new THREE.Vector3(...hand).sub(new THREE.Vector3(...elbow)).normalize();
    const side = new THREE.Vector3().crossVectors(dir, UP).normalize();
    if (side.lengthSq() < 0.01) side.set(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(side, dir).normalize();
    const base = new THREE.Vector3(...hand).add(dir.clone().multiplyScalar(0.085));
    const at = (s: number, u: number, f = 0) => base.clone().add(side.clone().multiplyScalar(s)).add(up.clone().multiplyScalar(u)).add(dir.clone().multiplyScalar(f)).toArray() as V3;
    return { tips: [at(-0.065, 0, 0), at(-0.022, 0, 0.025), at(0.022, 0, 0.025), at(0.065, 0, 0)], thumb: at(0.02, 0.085, -0.07) };
  }, [elbow, hand]);
  useFrame((state) => {
    if (group.current) group.current.rotation.z = waving ? Math.sin(state.clock.elapsedTime * 3.2) * 0.22 : 0;
  });
  return (
    <group ref={group} position={shoulder}>
      <Segment from={[0, 0, 0]} to={elbow} radius={0.115} color={sleeve ?? skin} kind={sleeve ? 'cloth' : 'skin'} />
      {sleeve ? <Ball pos={elbow} r={0.125} scale={[1, 0.5, 1]} color="#FFFFFF" kind="cloth" /> : null}
      <Segment from={elbow} to={hand} radius={0.1} color={skin} kind="skin" />
      <Ball pos={hand} r={0.125} color={skin} kind="skin" />
      {fingers.tips.map((p, i) => <Ball key={i} pos={p} r={0.04} color={skin} kind="skin" />)}
      <Ball pos={fingers.thumb} r={0.045} color={skin} kind="skin" />
    </group>
  );
}

/** Foot with five toes. Local +z is the toe end, local -y the sole. */
function Foot({ pos, rot, skin }: { pos: V3; rot: V3; skin: string }) {
  return (
    <group position={pos} rotation={rot}>
      <Ball pos={[0, 0, 0]} scale={[0.135, 0.09, 0.2]} r={1} color={skin} kind="skin" />
      {[-0.085, -0.043, 0, 0.043, 0.085].map((x, i) => (
        <Ball key={i} pos={[x, 0.02, 0.2 - Math.abs(x) * 0.5]} r={i === 4 ? 0.048 : 0.036} color={skin} kind="skin" />
      ))}
    </group>
  );
}

function Eye({ x, color, lashes, browColor }: { x: number; color: string; lashes: boolean; browColor: string }) {
  const lid = useRef<THREE.Group>(null);
  const side = x > 0 ? 1 : -1;
  useFrame((state) => {
    // A quick blink every few seconds keeps the face alive.
    const t = state.clock.elapsedTime % 4.2;
    const closed = t > 4.0 ? Math.sin(((t - 4.0) / 0.2) * Math.PI) : 0;
    if (lid.current) lid.current.scale.y = 1 - closed * 0.9;
  });
  return (
    <group position={[x, -0.02, 0.5]}>
      <group ref={lid}>
        <Ball pos={[0, 0, 0]} scale={[1, 1.1, 0.6]} r={0.155} color="#FFFFFF" kind="gloss" />
        <Ball pos={[0, -0.01, 0.068]} scale={[1, 1.08, 0.42]} r={0.124} color={color} kind="gloss" />
        <Ball pos={[0, -0.01, 0.1]} scale={[1, 1.08, 0.4]} r={0.074} color="#15100F" kind="gloss" />
        <Ball pos={[0.045, 0.05, 0.128]} r={0.034} color="#FFFFFF" kind="gloss" />
        <Ball pos={[-0.04, -0.045, 0.124]} r={0.017} color="#FFFFFF" kind="gloss" />
      </group>
      {/* upper lash line */}
      <mesh position={[0, 0.03, 0.055]} rotation={[0.1, 0, 0]}>
        <torusGeometry args={[0.152, 0.011, 10, 28, Math.PI]} />
        <meshStandardMaterial color="#2A1A14" roughness={0.6} />
      </mesh>
      {lashes ? (
        <>
          <Segment from={[side * 0.14, 0.07, 0.05]} to={[side * 0.215, 0.12, 0.02]} radius={0.011} color="#2A1A14" />
          <Segment from={[side * 0.15, 0.035, 0.05]} to={[side * 0.23, 0.06, 0.02]} radius={0.011} color="#2A1A14" />
        </>
      ) : null}
      {/* eyebrow */}
      {/* short, soft brows; the inner end sits a touch higher, which reads as sweet rather than stern */}
      <Segment from={[-side * 0.05, 0.29, 0.03]} to={[side * 0.06, 0.27, 0.01]} radius={0.016} color={browColor} />
    </group>
  );
}

function Head({ config, sex }: { config: AvatarConfig; sex: ChildSex }) {
  const skin = config.skin;
  const girl = sex === 'female';
  const boy = sex === 'male';
  const hair = config.hair;
  const brow = hair ?? '#6B4A36';
  const band = config.outfit === '#FFFFFF' ? '#F5A9BF' : config.outfit;
  return (
    <>
      {/* skull, chubby cheeks and chin */}
      <Ball pos={[0, 0, 0]} scale={[1.04, 0.98, 1]} r={0.6} color={skin} kind="skin" />
      <Ball pos={[0.29, -0.2, 0.29]} r={0.235} color={skin} kind="skin" />
      <Ball pos={[-0.29, -0.2, 0.29]} r={0.235} color={skin} kind="skin" />
      <Ball pos={[0, -0.3, 0.26]} scale={[1.5, 1, 1]} r={0.2} color={skin} kind="skin" />
      {/* ears */}
      {[1, -1].map((s) => (
        <group key={s}>
          <Ball pos={[s * 0.6, -0.04, -0.02]} scale={[0.55, 1, 0.8]} r={0.15} color={skin} kind="skin" />
          <Ball pos={[s * 0.635, -0.04, 0.02]} scale={[0.3, 0.7, 0.5]} r={0.11} color="#F3A9A0" />
        </group>
      ))}
      {/* face */}
      <Eye x={0.21} color={config.eyes} lashes={girl} browColor={brow} />
      <Eye x={-0.21} color={config.eyes} lashes={girl} browColor={brow} />
      <Ball pos={[0, -0.125, 0.6]} r={0.052} color={skin} kind="skin" />
      <Ball pos={[0.385, -0.21, 0.4]} scale={[1, 0.82, 0.7]} r={0.165} color="#FF7F96" opacity={0.38} />
      <Ball pos={[-0.385, -0.21, 0.4]} scale={[1, 0.82, 0.7]} r={0.165} color="#FF7F96" opacity={0.38} />
      {/* open smile: the lower half of a sphere gives a flat top lip and a round bottom */}
      <mesh position={[0, -0.235, 0.535]} scale={[0.15, 0.125, 0.07]}>
        <sphereGeometry args={[1, SEG, SEG, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#A3324A" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.236, 0.537]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.15, 0.07, 1]}>
        <circleGeometry args={[1, SEG]} />
        <meshStandardMaterial color="#A3324A" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <Ball pos={[0, -0.325, 0.56]} scale={[0.085, 0.04, 0.04]} r={1} color="#FF93A7" />
      {/* smile corners */}
      <Ball pos={[0.158, -0.228, 0.52]} r={0.022} color={skin} kind="skin" />
      <Ball pos={[-0.158, -0.228, 0.52]} r={0.022} color={skin} kind="skin" />

      {hair ? (
        <>
          {/* hair cap: a spherical cap tilted back, so the hairline sits high on the forehead */}
          <mesh rotation={[-0.5, 0, 0]} position={[0, 0.03, -0.01]} scale={[1.05, 1, 1.02]}>
            <sphereGeometry args={[0.615, SEG, SEG, 0, Math.PI * 2, 0, 1.14]} />
            <meshStandardMaterial color={hair} roughness={0.85} />
          </mesh>
          {boy ? (
            <>
              {/* a swept quiff */}
              <Ball pos={[0.1, 0.5, 0.36]} scale={[1.35, 0.8, 1]} r={0.2} rot={[0, 0, -0.3]} color={hair} kind="cloth" />
              <Ball pos={[-0.16, 0.52, 0.3]} scale={[1.2, 0.8, 1]} r={0.18} rot={[0, 0, 0.25]} color={hair} kind="cloth" />
              <Ball pos={[0.32, 0.42, 0.26]} scale={[1, 0.9, 1]} r={0.16} color={hair} kind="cloth" />
              <Ball pos={[0.04, 0.64, 0.16]} scale={[1.3, 0.75, 1.1]} r={0.19} color={hair} kind="cloth" />
            </>
          ) : (
            <>
              {/* a soft fringe and a little sprout on top */}
              <Ball pos={[0.08, 0.47, 0.37]} scale={[1.4, 0.7, 0.9]} r={0.15} rot={[0, 0, -0.25]} color={hair} kind="cloth" />
              <Ball pos={[-0.14, 0.49, 0.33]} scale={[1.2, 0.7, 0.9]} r={0.13} rot={[0, 0, 0.2]} color={hair} kind="cloth" />
              <Segment from={[0, 0.58, 0]} to={[0.04, 0.82, 0.02]} radius={0.04} color={hair} kind="cloth" />
              <Segment from={[0, 0.6, 0]} to={[-0.1, 0.78, -0.02]} radius={0.034} color={hair} kind="cloth" />
              <Segment from={[0, 0.6, 0]} to={[0.13, 0.76, -0.03]} radius={0.03} color={hair} kind="cloth" />
            </>
          )}
        </>
      ) : null}

      {girl ? (
        <>
          {/* headband with a bow */}
          <mesh rotation={[Math.PI / 2 - 0.42, 0, 0]} position={[0, 0.19, -0.02]}>
            <torusGeometry args={[0.585, 0.085, 14, 48]} />
            <meshStandardMaterial color={band} roughness={0.95} />
          </mesh>
          <group position={[0.4, 0.46, 0.34]} rotation={[0.2, -0.5, -0.5]}>
            <Ball pos={[0.11, 0, 0]} scale={[0.13, 0.1, 0.07]} r={1} color={band} kind="cloth" />
            <Ball pos={[-0.11, 0, 0]} scale={[0.13, 0.1, 0.07]} r={1} color={band} kind="cloth" />
            <Ball pos={[0, 0, 0.02]} r={0.055} color={band} kind="cloth" />
          </group>
        </>
      ) : null}
    </>
  );
}

function Baby({ stage, config, sex, spin, autoRotate }: { stage: BabyStage; config: AvatarConfig; sex: ChildSex; spin: { current: { angle: number; dragging: boolean } }; autoRotate: boolean }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const pose = POSES[stage];
  const skin = config.skin;
  const dressed = config.outfit !== '#FFFFFF';
  const shirt = dressed && sex !== 'female' ? config.outfit : null;
  const collar = sex === 'female' ? (dressed ? config.outfit : '#F5A9BF') : shirt ? '#FFFFFF' : null;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (autoRotate && !spin.current.dragging) spin.current.angle += delta * 0.3; // slow 360° turntable
    if (root.current) root.current.rotation.y = spin.current.angle;
    if (body.current) {
      // breathing, plus a little rocking when on all fours
      body.current.scale.y = 1 + Math.sin(t * 2) * 0.012;
      body.current.rotation.z = stage === 'crawl' ? Math.sin(t * 2.4) * 0.035 : stage === 'stand' ? Math.sin(t * 1.4) * 0.02 : 0;
    }
    if (head.current) {
      head.current.rotation.set(pose.headTilt[0] + Math.sin(t * 1.1) * 0.035, Math.sin(t * 0.7) * 0.08, pose.headTilt[2] + Math.sin(t * 0.9) * 0.05);
    }
  });

  return (
    <group ref={root}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, stage === 'crawl' || stage === 'tummy' ? -0.12 : 0.1]} scale={pose.shadow}>
        <circleGeometry args={[0.7, 48]} />
        <meshBasicMaterial color="#3B2147" transparent opacity={0.12} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, stage === 'crawl' || stage === 'tummy' ? -0.12 : 0.1]} scale={[pose.shadow[0] * 0.6, 1, pose.shadow[2] * 0.6]}>
        <circleGeometry args={[0.7, 48]} />
        <meshBasicMaterial color="#3B2147" transparent opacity={0.1} />
      </mesh>

      <group ref={body}>
        <group position={pose.torso.pos} rotation={pose.torso.rot}>
          <Ball pos={[0, 0, 0]} scale={pose.torso.scale} r={1} color={shirt ?? skin} kind={shirt ? 'cloth' : 'skin'} />
        </group>
        <Ball pos={pose.diaper.pos} scale={pose.diaper.scale} r={1} color="#FFFFFF" kind="cloth" />

        {[0, 1].map((i) => (
          <group key={i}>
            <Arm chain={pose.arms[i]} skin={skin} sleeve={shirt} waving={pose.wave === i} />
            <Segment from={pose.legs[i][0]} to={pose.legs[i][1]} radius={0.15} color={skin} kind="skin" />
            <Ball pos={pose.legs[i][1]} r={0.14} color={skin} kind="skin" />
            <Segment from={pose.legs[i][1]} to={pose.legs[i][2]} radius={0.12} color={skin} kind="skin" />
            <Foot pos={pose.feet[i].pos} rot={pose.feet[i].rot} skin={skin} />
          </group>
        ))}

        <group position={pose.head}>
          {collar ? (
            <mesh position={[0, -0.57, 0.0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.27, 0.07, 12, 40]} />
              <meshStandardMaterial color={collar} roughness={0.95} />
            </mesh>
          ) : null}
          <group ref={head}>
            <Head config={config} sex={sex} />
          </group>
        </group>
      </group>
    </group>
  );
}

/** If WebGL is unavailable the app must keep working; the baby simply is not drawn. */
class GlBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * The 3D baby on a turntable: it rotates slowly through 360° and can be spun by dragging
 * sideways. Pose follows the stage, style follows the child's sex, colours the parent's choices.
 */
export function Baby3D({ stage, config, sex = 'unspecified', height = 250, label, autoRotate = true, initialAngle = 0.35, active = true }: {
  stage: BabyStage; config: AvatarConfig; sex?: ChildSex; height?: number; label: string;
  /** Turn the slow automatic rotation off (dragging still works). */
  autoRotate?: boolean;
  initialAngle?: number;
  /** Pass false while the screen is hidden: rendering stops completely, saving battery. */
  active?: boolean;
}) {
  const spin = useRef({ angle: initialAngle, dragging: false });
  const start = useRef(0);
  const responder = useMemo(() => PanResponder.create({
    // Only take horizontal drags, so vertical scrolling of the page still works over the baby.
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => { spin.current.dragging = true; start.current = spin.current.angle; },
    onPanResponderMove: (_e, g) => { spin.current.angle = start.current + g.dx * 0.012; },
    onPanResponderRelease: () => { spin.current.dragging = false; },
    onPanResponderTerminate: () => { spin.current.dragging = false; },
  }), []);
  const pose = POSES[stage];

  return (
    <View style={{ height }} {...responder.panHandlers} accessible accessibilityRole="image" accessibilityLabel={label}
      accessibilityHint="אפשר לגרור ימינה ושמאלה כדי לסובב">
      <GlBoundary>
        <Canvas flat frameloop={active ? 'always' : 'never'} camera={{ position: [0, 0.5, 5.4], fov: 30 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
          <ambientLight intensity={1.25} />
          <hemisphereLight args={['#FFFFFF', '#FFD9E2', 0.7]} />
          {/* warm key, cool fill, and a rim light from behind for the soft "film" outline */}
          <directionalLight position={[3, 5, 4]} intensity={1.35} color="#FFF4EA" />
          <directionalLight position={[-4, 2, 3]} intensity={0.45} color="#DCE6FF" />
          <directionalLight position={[0, 3, -5]} intensity={0.9} color="#FFC2D4" />
          <group position={[0, pose.lift, 0]}>
            <Baby stage={stage} config={config} sex={sex} spin={spin} autoRotate={autoRotate} />
          </group>
        </Canvas>
      </GlBoundary>
    </View>
  );
}
