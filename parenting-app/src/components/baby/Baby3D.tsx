import { Canvas, useFrame } from '@react-three/fiber';
import { Component, type ReactNode, useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import * as THREE from 'three';
import type { AvatarConfig, BabyStage } from '@/domain/avatar';

type V3 = [number, number, number];

interface Pose {
  head: V3;
  torso: { pos: V3; rot: V3; scale: V3 };
  diaper: { pos: V3; scale: V3 };
  /** [shoulder, hand] for the baby's left arm; the right arm is mirrored. */
  arm: [V3, V3];
  /** [hip, knee, ankle] for the left leg; mirrored for the right. */
  leg: [V3, V3, V3];
  foot: { pos: V3; scale: V3 };
  shadow: V3;
}

/** The baby faces +z. Units are roughly "head radius ≈ 0.46". */
const POSES: Record<BabyStage, Pose> = {
  tummy: {
    head: [0, 0.66, 0.5],
    torso: { pos: [0, 0.31, 0], rot: [-0.2, 0, 0], scale: [0.36, 0.27, 0.48] },
    diaper: { pos: [0, 0.27, -0.33], scale: [0.37, 0.27, 0.28] },
    arm: [[0.28, 0.36, 0.3], [0.37, 0.08, 0.62]],
    leg: [[0.17, 0.24, -0.42], [0.2, 0.13, -0.68], [0.21, 0.11, -0.92]],
    foot: { pos: [0.21, 0.16, -0.99], scale: [0.1, 0.14, 0.09] },
    shadow: [0.75, 1, 1.25],
  },
  crawl: {
    head: [0, 0.92, 0.58],
    torso: { pos: [0, 0.57, 0], rot: [-0.08, 0, 0], scale: [0.34, 0.3, 0.48] },
    diaper: { pos: [0, 0.56, -0.33], scale: [0.36, 0.3, 0.27] },
    arm: [[0.25, 0.52, 0.33], [0.27, 0.08, 0.42]],
    leg: [[0.2, 0.48, -0.38], [0.22, 0.11, -0.3], [0.22, 0.1, -0.7]],
    foot: { pos: [0.22, 0.12, -0.8], scale: [0.11, 0.1, 0.16] },
    shadow: [0.7, 1, 1.15],
  },
  stand: {
    head: [0, 1.46, 0],
    torso: { pos: [0, 0.88, 0], rot: [0, 0, 0], scale: [0.36, 0.4, 0.3] },
    diaper: { pos: [0, 0.62, 0], scale: [0.37, 0.25, 0.32] },
    arm: [[0.3, 1.04, 0], [0.54, 0.7, 0.1]],
    leg: [[0.17, 0.52, 0], [0.18, 0.31, 0.03], [0.18, 0.11, 0]],
    foot: { pos: [0.18, 0.07, 0.08], scale: [0.12, 0.07, 0.19] },
    shadow: [0.62, 1, 0.5],
  },
};

const mirror = (v: V3): V3 => [-v[0], v[1], v[2]];
const UP = new THREE.Vector3(0, 1, 0);

/** A rounded limb segment between two points. */
function Limb({ from, to, radius, color }: { from: V3; to: V3; radius: number; color: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      length: dir.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <capsuleGeometry args={[radius, length, 6, 14]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

function Ball({ pos, scale = [1, 1, 1], r, color, roughness = 0.7 }: { pos: V3; scale?: V3; r: number; color: string; roughness?: number }) {
  return (
    <mesh position={pos} scale={scale}>
      <sphereGeometry args={[r, 28, 20]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

function Baby({ stage, config, spin }: { stage: BabyStage; config: AvatarConfig; spin: { current: { angle: number; dragging: boolean } } }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const pose = POSES[stage];
  const cloth = config.outfit === '#FFFFFF' ? config.skin : config.outfit;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (!spin.current.dragging) spin.current.angle += delta * 0.32; // slow 360° turntable
    if (root.current) {
      root.current.rotation.y = spin.current.angle;
      root.current.position.y = Math.sin(t * 1.8) * 0.012; // breathing
    }
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 0.9) * 0.05;
      head.current.rotation.x = Math.sin(t * 1.3) * 0.03;
    }
  });

  return (
    <group ref={root}>
      {/* soft contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, stage === 'stand' ? 0.02 : -0.15]} scale={pose.shadow}>
        <circleGeometry args={[0.72, 40]} />
        <meshBasicMaterial color="#3B2F45" transparent opacity={0.1} />
      </mesh>

      <group position={pose.torso.pos} rotation={pose.torso.rot}>
        <Ball pos={[0, 0, 0]} scale={pose.torso.scale} r={1} color={cloth} />
      </group>
      <Ball pos={pose.diaper.pos} scale={pose.diaper.scale} r={1} color="#FFFFFF" roughness={0.9} />

      {[1, -1].map((side) => {
        const m = (v: V3) => (side === 1 ? v : mirror(v));
        return (
          <group key={side}>
            <Limb from={m(pose.arm[0])} to={m(pose.arm[1])} radius={0.095} color={config.skin} />
            <Ball pos={m(pose.arm[1])} r={0.115} color={config.skin} />
            <Limb from={m(pose.leg[0])} to={m(pose.leg[1])} radius={0.125} color={config.skin} />
            <Limb from={m(pose.leg[1])} to={m(pose.leg[2])} radius={0.105} color={config.skin} />
            <Ball pos={m(pose.foot.pos)} scale={pose.foot.scale} r={1} color={config.skin} />
          </group>
        );
      })}

      <group ref={head} position={pose.head}>
        <Ball pos={[0, 0, 0]} r={0.46} color={config.skin} />
        <Ball pos={[0.45, -0.02, 0]} r={0.1} color={config.skin} />
        <Ball pos={[-0.45, -0.02, 0]} r={0.1} color={config.skin} />
        {/* face */}
        <Ball pos={[0.16, 0.03, 0.415]} r={0.055} color={config.eyes} roughness={0.25} />
        <Ball pos={[-0.16, 0.03, 0.415]} r={0.055} color={config.eyes} roughness={0.25} />
        <Ball pos={[0.175, 0.05, 0.458]} r={0.017} color="#FFFFFF" roughness={0.2} />
        <Ball pos={[-0.145, 0.05, 0.458]} r={0.017} color="#FFFFFF" roughness={0.2} />
        <Ball pos={[0, -0.06, 0.455]} r={0.035} color={config.skin} />
        <Ball pos={[0, -0.17, 0.42]} scale={[0.075, 0.035, 0.03]} r={1} color="#C85A6E" />
        <Ball pos={[0.27, -0.11, 0.33]} scale={[0.09, 0.07, 0.04]} r={1} color="#F7A3B3" />
        <Ball pos={[-0.27, -0.11, 0.33]} scale={[0.09, 0.07, 0.04]} r={1} color="#F7A3B3" />
        {config.hair ? (
          <>
            <Ball pos={[0, 0.1, -0.05]} scale={[1, 0.88, 1]} r={0.455} color={config.hair} roughness={0.9} />
            <Ball pos={[0.05, 0.42, 0.2]} r={0.11} color={config.hair} roughness={0.9} />
            <Ball pos={[-0.08, 0.44, 0.12]} r={0.09} color={config.hair} roughness={0.9} />
          </>
        ) : null}
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
 * The child as a small 3D character on a turntable: it rotates slowly through 360° and can
 * be spun by dragging sideways. Pose follows the stage; colours follow the parent's choices.
 */
export function Baby3D({ stage, config, height = 250, label }: { stage: BabyStage; config: AvatarConfig; height?: number; label: string }) {
  const spin = useRef({ angle: 0.55, dragging: false });
  const start = useRef(0);
  const responder = useMemo(() => PanResponder.create({
    // Only take horizontal drags, so vertical scrolling of the page still works over the baby.
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => { spin.current.dragging = true; start.current = spin.current.angle; },
    onPanResponderMove: (_e, g) => { spin.current.angle = start.current + g.dx * 0.012; },
    onPanResponderRelease: () => { spin.current.dragging = false; },
    onPanResponderTerminate: () => { spin.current.dragging = false; },
  }), []);

  return (
    <View style={{ height }} {...responder.panHandlers} accessible accessibilityRole="image" accessibilityLabel={label}
      accessibilityHint="אפשר לגרור ימינה ושמאלה כדי לסובב">
      <GlBoundary>
        <Canvas camera={{ position: [0, 1.15, 4.3], fov: 30 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={1.15} />
          <hemisphereLight args={['#FFFFFF', '#F3D9E0', 0.9]} />
          <directionalLight position={[2.5, 4, 3.5]} intensity={1.6} />
          <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#C9C4FF" />
          <group position={[0, stage === 'stand' ? -0.82 : -0.5, 0]}>
            <Baby stage={stage} config={config} spin={spin} />
          </group>
        </Canvas>
      </GlBoundary>
    </View>
  );
}
