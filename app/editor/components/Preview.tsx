import { OrthographicCamera } from "@react-three/drei";
import { useSnapshot } from "valtio";
import { editorStore } from "../state/editor.store";
import { useEffect, useMemo, useState } from "react";
import { MediaLayer } from "./preview/MediaLayer";
import * as THREE from 'three/webgpu'
import * as TSL from 'three/tsl'
import { Canvas, extend, useFrame, useThree, type ThreeToJSXElements } from '@react-three/fiber'

declare module '@react-three/fiber' {
    interface ThreeElements extends ThreeToJSXElements<typeof THREE> { }
}

extend(THREE as any)

function Scene() {
    const snap = useSnapshot(editorStore);
    const t = useMemo(() => snap.timeline.currentTimeMs / 1000, [
        snap.timeline.currentTimeMs,
    ]);

    return (
        <group>
            {/* Background */}
            <mesh position={[0, 0, 0]}>
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial color={"#0a0a0a"} />
            </mesh>

            {/* Visible media */}
            <group position={[0, 0, 0.05]}>
                <MediaLayer />
            </group>
        </group>
    );
}

export function Preview() {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);
    return (
        <div className="w-full h-full">
            {isClient ? (
                <Canvas gl={async (props) => {
                    const renderer = new THREE.WebGPURenderer(props as any)
                    await renderer.init()
                    return renderer
                }} orthographic dpr={[1, 2]}>
                                        <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={300} />
                                        <Scene />
                </Canvas>
            ) : (
                <div className="w-full h-full bg-black" />
            )}
        </div>
    );
}
