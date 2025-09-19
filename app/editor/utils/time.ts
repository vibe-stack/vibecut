export function framesToTimecode(frames: number, fps: number) {
  const totalSeconds = Math.floor(frames / fps);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  const ff = frames % fps;
  const pad = (n: number, l = 2) => n.toString().padStart(l, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

export function millisecondsToTimecode(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  const msRemainder = Math.floor(ms % 1000);
  const pad = (n: number, l = 2) => n.toString().padStart(l, "0");
  const pad3 = (n: number) => n.toString().padStart(3, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}.${pad3(msRemainder)}`;
}

export function secondsToPx(seconds: number, pixelsPerSecond: number) {
  return seconds * pixelsPerSecond;
}

export function framesToPx(frames: number, fps: number, pixelsPerSecond: number) {
  return secondsToPx(frames / fps, pixelsPerSecond);
}

export function millisecondsToPx(ms: number, pixelsPerSecond: number) {
  return secondsToPx(ms / 1000, pixelsPerSecond);
}

export function pxToMilliseconds(px: number, pixelsPerSecond: number) {
  return (px / pixelsPerSecond) * 1000;
}
