export function framesToTimecode(frames: number, fps: number) {
  const totalSeconds = Math.floor(frames / fps);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  const ff = frames % fps;
  const pad = (n: number, l = 2) => n.toString().padStart(l, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

export function secondsToPx(seconds: number, pixelsPerSecond: number) {
  return seconds * pixelsPerSecond;
}

export function framesToPx(frames: number, fps: number, pixelsPerSecond: number) {
  return secondsToPx(frames / fps, pixelsPerSecond);
}
