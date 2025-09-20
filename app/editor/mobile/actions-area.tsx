import React, { useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import editorStore, { editorActions } from '../shared/store';
import { Plus, Video, Layers, Copy, Trash2, Eye, EyeOff, Volume2, VolumeX, SlidersHorizontal } from 'lucide-react';
import { Drawer } from 'vaul';
import { useFileUpload } from '../clips/hooks/use-file-upload';

const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
  <button
    {...props}
    className={`rounded-2xl bg-white/5 active:bg-white/10 px-3 py-2 text-sm text-white flex items-center gap-2 ${className}`}
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

  const openDrawer = (title: string) => {
    setDrawerTitle(title);
    setOpen(true);
  };

  // No selection -> general actions
  if (!selectedTrack && !selectedClipId) {
    return (
      <div className="px-3 pb-4 pt-2">
        <div className="text-xs text-white/60 mb-2">Actions</div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton onClick={handleAddAsset}><Video size={16} /> Add video</ActionButton>
          <ActionButton onClick={() => editorActions.addTrack({ name: 'New Track' })}><Layers size={16} /> New track</ActionButton>
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
      <div className="px-3 pb-4 pt-2">
        <div className="text-xs text-white/60 mb-2">Track actions</div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton onClick={() => editorActions.updateTrack(selectedTrack.id, { visible: !isVisible })}>
            {isVisible ? <Eye size={16} /> : <EyeOff size={16} />} {isVisible ? 'Hide' : 'Show'}
          </ActionButton>
          <ActionButton onClick={() => editorActions.updateTrack(selectedTrack.id, { muted: !isMuted })}>
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />} {isMuted ? 'Unmute' : 'Mute'}
          </ActionButton>
          <ActionButton onClick={() => openDrawer('Track volume')}><SlidersHorizontal size={16} /> Volume</ActionButton>
          <ActionButton onClick={() => editorActions.removeTrack(selectedTrack.id)} className="bg-red-500/20 text-red-300 active:bg-red-500/30"><Trash2 size={16} /> Remove</ActionButton>
        </div>

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
      <div className="px-3 pb-4 pt-2">
        <div className="text-xs text-white/60 mb-2">Clip actions</div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton onClick={() => editorActions.duplicateClip(clip.id)}><Copy size={16} /> Duplicate</ActionButton>
          <ActionButton onClick={() => editorActions.removeClip(clip.id)} className="bg-red-500/20 text-red-300 active:bg-red-500/30"><Trash2 size={16} /> Remove</ActionButton>
          <ActionButton onClick={() => openDrawer('Clip opacity')}><SlidersHorizontal size={16} /> Opacity</ActionButton>
          <ActionButton onClick={() => editorActions.updateClip(clip.id, { visible: !clip.visible })}>
            {clip.visible ? <Eye size={16} /> : <EyeOff size={16} />} {clip.visible ? 'Hide' : 'Show'}
          </ActionButton>
          <ActionButton onClick={() => editorActions.updateClip(clip.id, { muted: !clip.muted })}>
            {clip.muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {clip.muted ? 'Unmute' : 'Mute'}
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
