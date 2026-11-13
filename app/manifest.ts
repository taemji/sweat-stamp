import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "땀도장",
    short_name: "땀도장",
    description: "네 사람의 매일 운동을 사진으로 남기는 인증 앱",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f3ef",
    theme_color: "#151515",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}