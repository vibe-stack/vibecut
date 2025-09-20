

import VideoEditor from "../editor/VideoEditor";

export function meta() {
  return [
    { title: "VibeCut - Video Editor" },
    { name: "description", content: "Professional video editing in 3D space" },
  ];
}

export default function Home() {
  return <VideoEditor />;
}
