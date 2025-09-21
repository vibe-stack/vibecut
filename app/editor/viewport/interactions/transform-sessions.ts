import * as THREE from 'three';
import { useSyncExternalStore, useRef, useEffect } from 'react';

export type TransformState = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
};

// Simple external store for ephemeral transforms during gestures (not in Valtio)
const transient = new Map<string, TransformState>();
const globalListeners = new Set<() => void>();
const perIdListeners = new Map<string, Set<() => void>>();
let version = 0; // global version (fallback)
const perIdVersion = new Map<string, number>();

function emitAll() {
  version++;
  globalListeners.forEach((l) => l());
}

export function setTransientTransform(clipId: string, state: TransformState) {
  transient.set(clipId, cloneState(state));
  bump(clipId);
}

export function updateTransientTransform(clipId: string, patch: Partial<TransformState>) {
  const curr = transient.get(clipId);
  if (!curr) return;
  transient.set(clipId, {
    position: patch.position ? patch.position.clone() : curr.position.clone(),
    rotation: patch.rotation ? new THREE.Euler(patch.rotation.x, patch.rotation.y, patch.rotation.z) : new THREE.Euler(curr.rotation.x, curr.rotation.y, curr.rotation.z),
    scale: patch.scale ? patch.scale.clone() : curr.scale.clone(),
  });
  bump(clipId);
}

export function clearTransientTransform(clipId: string) {
  if (transient.has(clipId)) {
    transient.delete(clipId);
    bump(clipId);
  }
}

export function getTransientTransform(clipId: string) {
  const v = transient.get(clipId);
  return v ? cloneState(v) : undefined;
}

function subscribeGlobal(cb: () => void) {
  globalListeners.add(cb);
  return () => globalListeners.delete(cb);
}

function getSnapshot() {
  // Changes only when emitAll() is called
  return version;
}

function bump(clipId: string) {
  version++;
  perIdVersion.set(clipId, (perIdVersion.get(clipId) || 0) + 1);
  // Notify per-id listeners first
  const set = perIdListeners.get(clipId);
  if (set) set.forEach((l) => l());
  // And any global subscribers
  emitAll();
}

export function getClipVersion(clipId: string) {
  return perIdVersion.get(clipId) || 0;
}

function cloneState(s: TransformState): TransformState {
  return {
    position: s.position.clone(),
    rotation: new THREE.Euler(s.rotation.x, s.rotation.y, s.rotation.z),
    scale: s.scale.clone(),
  };
}

/**
 * Hook that returns either a transient transform (if present) or the provided base transform.
 * Triggers re-render when transient store changes for this id.
 */
export function useTransientOrBaseTransform(
  clipId: string,
  base: TransformState
) {
  // Use external store change as a tick; we then select specifically our id
  useSyncExternalStore(
    (cb) => {
      let set = perIdListeners.get(clipId);
      if (!set) {
        set = new Set();
        perIdListeners.set(clipId, set);
      }
      set.add(cb);
      return () => {
        const s = perIdListeners.get(clipId);
        if (s) {
          s.delete(cb);
          if (s.size === 0) perIdListeners.delete(clipId);
        }
      };
    },
    () => getClipVersion(clipId),
    () => getClipVersion(clipId)
  );
  const t = transient.get(clipId);
  return t ? t : base;
}

/** Initialize a transient session for a clip if not present. Returns the initial state ref. */
export function useEnsureTransformSession(
  clipId: string,
  base: TransformState
) {
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && !transient.get(clipId)) {
      setTransientTransform(clipId, base);
      // Immediately clear to avoid persistent session; this primarily ensures consistent object instances
      clearTransientTransform(clipId);
      initialized.current = true;
    }
  }, [clipId, base.position, base.rotation, base.scale]);
}

export function startTransformSession(clipId: string, base: TransformState) {
  setTransientTransform(clipId, base);
}

export function commitTransformSession(
  clipId: string,
  onCommit: (finalState: TransformState) => void
) {
  const final = transient.get(clipId);
  if (final) {
    onCommit(cloneState(final));
  }
  clearTransientTransform(clipId);
}

export function cancelTransformSession(clipId: string) {
  clearTransientTransform(clipId);
}
