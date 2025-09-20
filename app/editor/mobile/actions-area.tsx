import React, { useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../shared/store';
import { Plus, Video, Layers, Copy, Trash2, Eye, EyeOff, Volume2, VolumeX, SlidersHorizontal } from 'lucide-react';
import { Drawer } from 'vaul';
import { useFileUpload } from '../clips/hooks/use-file-upload';
import { useScrollIntoView } from '../timeline/hooks/use-scroll-into-view';

const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`shrink-0 rounded-2xl bg-white/5 active:bg-white/10 px-3 py-2 text-white flex flex-col items-center gap-1 w-20 ${className}`}
  >
    {children}
  </button>
);

export const ActionsArea: React.FC = () => {
  const snap = useSnapshot(editorStore);
  const [open, setOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const selectedTrack = useMemo(() => snap.tracks.find(t => snap.selectedTrackIds.includes(t.id)), [snap.selectedTrackIds, snap.tracks]);
  const selectedClipId = snap.selectedClipIds[0];
  const { fileInputRef, handleFileInputChange, handleAddAsset } = useFileUpload();
  const { scrollIntoView } = useScrollIntoView();

  const openDrawer = (title: string) => {
    setDrawerTitle(title);
    setOpen(true);
  };

  // No selection -> general actions
  if (!selectedTrack && !selectedClipId) {
    return (
      <div className="px-3 pb-3 pt-1">
        <div className="flex items-stretch gap-2 overflow-x-auto no-scrollbar pb-1">
          <ActionButton onClick={handleAddAsset}>
            <Video size={18} />
            <span className="text-[10px] opacity-80">Add video</span>
          </ActionButton>
          <ActionButton onClick={() => editorActions.addTrack({ name: 'New Track' })}>
            <Layers size={18} />
            <span className="text-[10px] opacity-80">New track</span>
          </ActionButton>
        </div>

        {/* Hidden file input for video upload */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/60" />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-900 text-white p-4">
              <div className="mx-auto max-w-md">
                <div className="h-1 w-12 rounded-full bg-white/20 mx-auto mb-3" />
                <div className="text-sm font-medium mb-4">{drawerTitle}</div>
                {/* Currently no general drawers */}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    );
  }

  // Track selected
  if (selectedTrack && !selectedClipId) {
    const isVisible = selectedTrack.visible;
    const isMuted = selectedTrack.muted;
    return (
      <div className="px-3 pb-3 pt-1">
        <div className="text-xs text-white/60 mb-2">Track</div>
        <div className="flex items-stretch gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* Add video and new track actions also available when a track is selected */}
          <ActionButton onClick={handleAddAsset}>
            <Video size={18} />
            <span className="text-[10px] opacity-80">Add video</span>
          </ActionButton>
          <ActionButton onClick={() => editorActions.addTrack({ name: 'New Track' })}>
            <Layers size={18} />
            <span className="text-[10px] opacity-80">New track</span>
          </ActionButton>

          <ActionButton onClick={() => editorActions.updateTrack(selectedTrack.id, { visible: !isVisible })}>
            {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
            <span className="text-[10px] opacity-80">{isVisible ? 'Hide' : 'Show'}</span>
          </ActionButton>
          <ActionButton onClick={() => editorActions.updateTrack(selectedTrack.id, { muted: !isMuted })}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span className="text-[10px] opacity-80">{isMuted ? 'Unmute' : 'Mute'}</span>
          </ActionButton>
          <ActionButton onClick={() => openDrawer('Track volume')}>
            <SlidersHorizontal size={18} />
            <span className="text-[10px] opacity-80">Volume</span>
          </ActionButton>
          <ActionButton onClick={() => editorActions.removeTrack(selectedTrack.id)} className="bg-red-500/20 text-red-300 active:bg-red-500/30">
            <Trash2 size={18} />
            <span className="text-[10px] opacity-80">Remove</span>
          </ActionButton>
        </div>

        {/* Hidden file input for video upload */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/60" />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-900 text-white p-4">
              <div className="mx-auto max-w-md">
                <div className="h-1 w-12 rounded-full bg-white/20 mx-auto mb-3" />
                <div className="text-sm font-medium mb-4">{drawerTitle}</div>
                {drawerTitle === 'Track volume' && (
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                    value={selectedTrack.volume}
                    onChange={(e) => editorActions.updateTrack(selectedTrack.id, { volume: parseFloat(e.target.value) })}
                  />
                )}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    );
  }

  // Clip selected
  if (selectedClipId) {
    const clip = snap.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);
    if (!clip) return null;
    return (
      <div className="px-3 pb-3 pt-1">
        <div className="text-xs text-white/60 mb-2">Clip</div>
        <div className="flex items-stretch gap-2 overflow-x-auto no-scrollbar pb-1">
          <ActionButton onClick={() => {
            const id = editorActions.duplicateClip(clip.id);
            if (id) {
              // attempt to scroll the new element into view
              requestAnimationFrame(() => scrollIntoView(`[data-clip-id="${id}"]`));
            }
          }}>
            <Copy size={18} />
            <span className="text-[10px] opacity-80">Duplicate</span>
          </ActionButton>
          <ActionButton onClick={() => editorActions.removeClip(clip.id)} className="bg-red-500/20 text-red-300 active:bg-red-500/30">
            <Trash2 size={18} />
            <span className="text-[10px] opacity-80">Remove</span>
          </ActionButton>
          <ActionButton onClick={() => openDrawer('Clip opacity')}>
            <SlidersHorizontal size={18} />
            <span className="text-[10px] opacity-80">Opacity</span>
          </ActionButton>
          <ActionButton onClick={() => editorActions.updateClip(clip.id, { visible: !clip.visible })}>
            {clip.visible ? <Eye size={18} /> : <EyeOff size={18} />}
            <span className="text-[10px] opacity-80">{clip.visible ? 'Hide' : 'Show'}</span>
          </ActionButton>
          <ActionButton onClick={() => editorActions.updateClip(clip.id, { muted: !clip.muted })}>
            {clip.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span className="text-[10px] opacity-80">{clip.muted ? 'Unmute' : 'Mute'}</span>
          </ActionButton>
        </div>

        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/60" />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-neutral-900 text-white p-4">
              <div className="mx-auto max-w-md">
                <div className="h-1 w-12 rounded-full bg-white/20 mx-auto mb-3" />
                <div className="text-sm font-medium mb-4">{drawerTitle}</div>
                {drawerTitle === 'Clip opacity' && (
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                    value={clip.opacity}
                    onChange={(e) => editorActions.updateClip(clip.id, { opacity: parseFloat(e.target.value) })}
                  />
                )}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    );
  }

  return null;
};

export default ActionsArea;
