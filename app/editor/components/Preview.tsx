import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { useSnapshot } from "valtio";
import { editorStore } from "../state/editor.store";
import { useEffect, useMemo, useState } from "react";

function Scene() {
  const snap = useSnapshot(editorStore);
  const t = useMemo(() => snap.timeline.currentFrame / snap.timeline.fps, [
    snap.timeline.currentFrame,
    snap.timeline.fps,
  ]);

  return (
    <group>
      {/* Background */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial color={"#0a0a0a"} />
      </mesh>

      {/* A moving bar to indicate time changing visually */}
      <mesh position={[Math.sin(t) * 0.6, 0, 0.1]}>
        <boxGeometry args={[0.2, 1.2, 0.1]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
    </group>
  );
}

export function Preview() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return (
    <div className="w-full h-full">
      {isClient ? (
        <Canvas orthographic dpr={[1, 2]}>
          <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={300} />
          <Scene />
        </Canvas>
      ) : (
        <div className="w-full h-full bg-black" />
      )}
    </div>
  );
}
