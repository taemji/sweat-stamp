import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sweat Stamp",
    short_name: "Sweat Stamp",
    description: "네 사람의 매일 운동을 사진으로 남기는 인증 앱",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fef2c9",
    theme_color: "#fef2c9",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
