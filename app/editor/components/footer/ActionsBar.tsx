import { useSnapshot } from "valtio";
import { editorStore, getElementById, EditorActions } from "../../state/editor.store";
import { FilePicker } from "./FilePicker";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-200 text-sm active:scale-[.98]"
    >
      {children}
    </button>
  );
}

export function ActionsBar() {
  const snap = useSnapshot(editorStore);
  const el = getElementById(snap.selection.elementId);

  if (el) {
    if (el.type === "audio") {
      return (
        <div className="bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/70">
          <Section title="Audio Actions">
            <Btn>Split</Btn>
            <Btn>Volume</Btn>
            <Btn>Fade</Btn>
            <Btn onClick={() => EditorActions.deleteSelected()}>Delete</Btn>
          </Section>
        </div>
      );
    }
    // media actions
    return (
      <div className="bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/70">
        <Section title="Media Actions">
          <Btn>Split</Btn>
          <Btn>Volume</Btn>
          <Btn>Transitions</Btn>
          <Btn>Effects</Btn>
          <Btn onClick={() => EditorActions.deleteSelected()}>Delete</Btn>
          <Btn>Speed</Btn>
          <Btn>Duplicate</Btn>
          <Btn>Replace</Btn>
          <Btn>Filters</Btn>
        </Section>
      </div>
    );
  }

  // nothing selected -> add things
  return (
    <div className="bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/70">
      <Section title="Add to timeline">
        <FilePicker
          accept="image/*"
          label="Image"
          onFiles={(files) => {
            const f = files[0];
            if (!f) return;
            const url = URL.createObjectURL(f);
            EditorActions.addImageFromSrc(url);
          }}
        />
        <FilePicker
          accept="video/*"
          label="Video"
          onFiles={(files) => {
            const f = files[0];
            if (!f) return;
            const url = URL.createObjectURL(f);
            // Get duration from metadata to compute frames
            const video = document.createElement("video");
            video.preload = "metadata";
            video.src = url;
            video.onloadedmetadata = () => {
              const seconds = isFinite(video.duration) ? video.duration : 1;
              EditorActions.addVideoFromSrc(url, seconds);
            };
            video.onerror = () => {
              // Fallback to 1s if metadata fails
              EditorActions.addVideoFromSrc(url, 1);
            };
          }}
        />
        {/* Audio upload could be added later */}
      </Section>
    </div>
  );
}
