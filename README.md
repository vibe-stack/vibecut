# VibeCut — Mobile Video Editor (Preview)

Mobile-first video editor UI built with React Router, Vite, Valtio, and react-three-fiber.

## Features

- Preview area (top ~50% viewport) rendered with react-three-fiber
- Controls area with Play/Pause
- Tracks area with time ruler, red playhead, and two categories:
	- General Media (Images, Video, Text)
	- Audio
- Elements on tracks have start:end durations and selection
- Context-aware actions footer for selected elements or add actions when none selected

Dark, calming, minimalistic, and rounded UI. Avoids bright accents; no purple.

## Tech

- React Router 7, Vite 6
- Valtio for editor state
- react-three-fiber and drei for 3D preview
- Tailwind CSS v4 for styling

## Quickstart

```bash
pnpm install
pnpm dev
```

Then open the shown URL. The home route renders the editor UI.

## Notes

- The preview scene is a placeholder that animates a bar based on time.
- Timeline scale is controlled via `timeline.pixelsPerSecond` in `app/editor/state/editor.store.ts`.
- Playback is driven by `usePlayback` which advances frames at the configured FPS.
- All project data (timeline, tracks, elements) lives in a single Valtio store.

## Folder Structure

```
app/
	editor/
		components/
			controls/        # Play/Pause controls
			footer/          # Context-aware actions bar
			timeline/        # Time ruler, tracks, elements
			EditorScreen.tsx # Composes the editor layout
			Preview.tsx      # 3D preview via react-three-fiber
		hooks/
			usePlayback.ts   # Advances currentFrame when playing
		state/
			editor.store.ts  # Valtio store and actions
		utils/
			time.ts          # Formatting and layout helpers
```
