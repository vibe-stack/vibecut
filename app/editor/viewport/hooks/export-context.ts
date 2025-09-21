import type * as THREE from 'three';

export interface RendererContext {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  size: { width: number; height: number; pixelRatio: number };
}

let ctx: RendererContext | null = null;
let waiters: Array<(c: RendererContext) => void> = [];

export function setRendererContext(next: RendererContext) {
  ctx = next;
  if (waiters.length) {
    const w = waiters.slice();
    waiters.length = 0;
    w.forEach(fn => fn(next));
  }
}

export function getRendererContext(): RendererContext | null {
  return ctx;
}

export function whenRendererReady(timeoutMs = 3000): Promise<RendererContext> {
  if (ctx) return Promise.resolve(ctx);
  return new Promise<RendererContext>((resolve, reject) => {
    const timer = setTimeout(() => {
      const index = waiters.indexOf(resolveWrapper);
      if (index >= 0) waiters.splice(index, 1);
      reject(new Error('Renderer context timeout - Canvas may not be mounted yet'));
    }, Math.max(250, timeoutMs));
    
    const resolveWrapper = (c: RendererContext) => { 
      clearTimeout(timer); 
      resolve(c); 
    };
    waiters.push(resolveWrapper);
  });
}

export interface CutoutRect {
  x: number; // px
  y: number; // px
  width: number; // px
  height: number; // px
}
