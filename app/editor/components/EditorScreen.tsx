import { usePlayback } from "../hooks/usePlayback";
import { Preview } from "./Preview";
import { Controls } from "./controls/Controls";
import { Timeline } from "./timeline/Timeline";
import { ActionsBar } from "./footer/ActionsBar";

export function EditorScreen() {
  usePlayback();
  return (
    <div className="min-h-screen w-full bg-gray-950 text-gray-200 flex flex-col">
      <header className="px-4 py-3 border-b border-gray-800">
        <h1 className="text-lg font-semibold tracking-tight">VibeCut</h1>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Preview Area - top half */}
        <section className="relative" style={{ height: "50vh" }}>
          <Preview />
        </section>

        {/* Controls Area */}
        <section className="px-4 py-2 border-t border-gray-800">
          <Controls />
        </section>

        {/* Tracks Area */}
        <section className="flex-1 overflow-hidden border-t border-gray-800">
          <Timeline />
        </section>
      </main>

      {/* Modifiers & Actions Area */}
      <footer className="border-t border-gray-800">
        <ActionsBar />
      </footer>
    </div>
  );
}
