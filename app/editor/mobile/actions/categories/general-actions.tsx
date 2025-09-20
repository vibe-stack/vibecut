import React from 'react';
import ActionsRow from '../actions-row';
import AddVideoAction from '../components/add-video-action';
import AddTrackAction from '../components/add-track-action';

export const GeneralActions: React.FC = () => {
  return (
    <div className="px-3 pb-3 pt-1">
      <ActionsRow>
        <AddVideoAction />
        <AddTrackAction />
      </ActionsRow>
    </div>
  );
};

export default GeneralActions;
