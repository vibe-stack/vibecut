import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { editorStore, EditorActions } from "../../state/editor.store";

// Drives time using Three's AnimationMixer. We create a dummy AnimationClip spanning durationSeconds.
export function PlaybackDriver({ durationSeconds }: { durationSeconds: number }) {
  const clip = useMemo(() => {
    const track = new THREE.NumberKeyframeTrack(".time", [0, durationSeconds], [0, durationSeconds]);
    const clip = new THREE.AnimationClip("timeline", durationSeconds, [track]);
    clip.duration = durationSeconds;
    return clip;
  }, [durationSeconds]);

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    const obj = new THREE.Object3D();
    const mixer = new THREE.AnimationMixer(obj);
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    action.play();
    action.paused = !editorStore.isPlaying;
    editorStore.playback.mixer = mixer as any;
    editorStore.playback.action = action as any;
    mixerRef.current = mixer;
    actionRef.current = action;
    return () => {
      editorStore.playback.mixer = null;
      editorStore.playback.action = null;
      mixer.stopAllAction();
    };
  }, [clip]);

  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    const action = actionRef.current;
    if (!mixer || !action) return;
    if (!editorStore.isPlaying) return;
    mixer.update(delta);
    editorStore.timeline.currentTimeMs = action.time * 1000; // Convert seconds to milliseconds
    // Stop at end and reset
    if (action.time >= durationSeconds) {
      EditorActions.pause();
      action.time = 0;
      mixer.setTime(0);
      editorStore.timeline.currentTimeMs = 0;
    }
  });

  return null;
}
