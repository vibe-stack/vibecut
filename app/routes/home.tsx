

import VideoEditor from "../editor/video-editor";

export function meta() {
  return [
    { title: "VibeCut - Video Editor" },
    { name: "description", content: "Professional video editing in 3D space" },
  ];
}

export default function Home() {
  return <VideoEditor />;
}
