import React from 'react';
import ActionsRow from '../actions-row';
import DuplicateClipAction from '../components/duplicate-clip-action';
import SplitClipAction from '../components/split-clip-action';
import RemoveClipAction from '../components/remove-clip-action';
import ClipOpacityAction from '../components/clip-opacity-action';
import ToggleClipVisibilityAction from '../components/toggle-clip-visibility-action';
import ToggleClipMuteAction from '../components/toggle-clip-mute-action';
import { useSnapshot } from 'valtio';
import editorStore from '../../../shared/store';
import ImageFiltersAction from '../components/image-filters-action';
import ImageAdjustAction from '../components/image-adjust-action';
import ChangeTextAction from '../components/change-text-action';
import TextStyleAction from '../components/text-style-action';
import TextAnimationsAction from '../components/animations/text-animations-action';
import AudioFadeInAction from '../components/audio-fade-in-action';
import AudioFadeOutAction from '../components/audio-fade-out-action';
import AudioSpeedAction from '../components/audio-speed-action';
// New AV Speed control (video & audio)
import AVSpeedAction from '../components/av-speed-action';

export const ClipActions: React.FC<{ clipId: string }> = ({ clipId }) => {
  const snap = useSnapshot(editorStore);
  const clip = snap.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
  if (!clip) return null;
  const asset = snap.assets[clip.assetId];

  return (
    <div className="px-3 pb-3 pt-1">
      <ActionsRow>
        <DuplicateClipAction clipId={clip.id} />
        <SplitClipAction clipId={clip.id} />
        <RemoveClipAction clipId={clip.id} />
        <ClipOpacityAction clipId={clip.id} opacity={clip.opacity} />
        <ToggleClipVisibilityAction clipId={clip.id} visible={clip.visible} />
        <ToggleClipMuteAction clipId={clip.id} muted={clip.muted} />

        {asset?.type === 'image' && (
          <>
            <ImageFiltersAction clipId={clip.id} />
            <ImageAdjustAction clipId={clip.id} />
          </>
        )}

        {asset?.type === 'text' && (
          <>
            <ChangeTextAction clipId={clip.id} />
            <TextStyleAction clipId={clip.id} />
            <TextAnimationsAction clipId={clip.id} />
          </>
        )}

        {asset?.type === 'audio' && (
          <>
            <AudioFadeInAction clipId={clip.id} />
            <AudioFadeOutAction clipId={clip.id} />
            <AudioSpeedAction clipId={clip.id} />
          </>
        )}

        {asset?.type === 'video' && (
          <>
            <AVSpeedAction clipId={clip.id} />
          </>
        )}
      </ActionsRow>
    </div>
  );
};

export default ClipActions;
