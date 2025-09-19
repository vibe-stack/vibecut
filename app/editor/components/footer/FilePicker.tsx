import { useRef } from "react";

type Props = {
  accept: string;
  label: string;
  onFiles: (files: FileList) => void;
};

export function FilePicker({ accept, label, onFiles }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
          // reset for re-selection of same file
          e.currentTarget.value = "";
        }}
      />
      <button
        className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-200 text-sm active:scale-[.98]"
        onClick={() => ref.current?.click()}
      >
        {label}
      </button>
    </>
  );
}
