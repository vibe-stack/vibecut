# VibeCut

**Live Demo:** [https://vibe-stack.github.io/vibecut](https://vibe-stack.github.io/vibecut)

A modern, mobile-first video editor built entirely during a live coding session on X (Twitter) in approximately 50 hours. VibeCut demonstrates rapid full-stack development using modern React technologies.

## Overview

VibeCut is a web-based video editor optimized for mobile devices, featuring an intuitive interface for editing videos, images, audio, and text elements. The application provides a timeline-based editing experience with real-time 3D preview rendering.

### Key Features

- **Mobile-optimized interface** with touch-friendly controls
- **Timeline-based editing** with drag-and-drop functionality  
- **Real-time 3D preview** using WebGL
- **Multi-track support** for video, audio, images, and text
- **Asset library** for managing media files
- **Export functionality** with customizable settings
- **Responsive design** that works across devices

### Architecture

The editor is structured around several core areas:
- **Preview viewport** - 3D-rendered preview using react-three-fiber
- **Timeline** - Multi-track editing with precise timing controls
- **Asset library** - Media file management and organization
- **Properties panel** - Element-specific editing controls
- **Export system** - Video rendering and download functionality

## Technology Stack

- **React Router 7** - Application routing and server-side rendering
- **Vite 6** - Build tooling and development server
- **React Three Fiber** - 3D rendering and WebGL integration
- **Valtio** - State management for editor operations
- **Tailwind CSS v4** - Styling and responsive design
- **TypeScript** - Type safety and development experience

## Installation

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/vibe-stack/vibecut.git
   cd vibecut
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Building for Production

```bash
pnpm build
```

The built application will be available in the `build/` directory.

## Project Background

This project was developed live on X (Twitter) as a demonstration of modern web development practices and rapid prototyping. The entire application was built from scratch in approximately 50 hours of live coding, showcasing:

- Real-time problem solving and architecture decisions
- Modern React patterns and best practices
- Performance optimization for mobile devices
- Integration of complex 3D rendering in web applications

## Contributing

This project is open source and contributions are welcome. Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.

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
