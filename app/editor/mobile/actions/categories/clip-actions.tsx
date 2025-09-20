import React from 'react';
import ActionsRow from '../actions-row';
import DuplicateClipAction from '../components/duplicate-clip-action';
import RemoveClipAction from '../components/remove-clip-action';
import ClipOpacityAction from '../components/clip-opacity-action';
import ToggleClipVisibilityAction from '../components/toggle-clip-visibility-action';
import ToggleClipMuteAction from '../components/toggle-clip-mute-action';
import { useSnapshot } from 'valtio';
import editorStore from '../../../shared/store';

export const ClipActions: React.FC<{ clipId: string }> = ({ clipId }) => {
  const snap = useSnapshot(editorStore);
  const clip = snap.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
  if (!clip) return null;

  return (
    <div className="px-3 pb-3 pt-1">
      <div className="text-xs text-white/60 mb-2">Clip</div>
      <ActionsRow>
        <DuplicateClipAction clipId={clip.id} />
        <RemoveClipAction clipId={clip.id} />
        <ClipOpacityAction clipId={clip.id} opacity={clip.opacity} />
        <ToggleClipVisibilityAction clipId={clip.id} visible={clip.visible} />
        <ToggleClipMuteAction clipId={clip.id} muted={clip.muted} />
      </ActionsRow>
    </div>
  );
};

export default ClipActions;
