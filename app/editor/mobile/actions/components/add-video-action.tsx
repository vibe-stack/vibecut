import React from 'react';
import { Image as ImageIcon, Video } from 'lucide-react';
import ActionButton from './action-button';
import { useFileUpload } from '../../../clips/hooks/use-file-upload';

export const AddVideoAction: React.FC = () => {
  const { fileInputRef, handleFileInputChange, handleAddAsset } = useFileUpload();

  return (
    <>
      <ActionButton onClick={handleAddAsset}>
        <Video size={18} />
        <span className="text-[10px] opacity-80">Add media</span>
      </ActionButton>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </>
  );
};

export default AddVideoAction;
