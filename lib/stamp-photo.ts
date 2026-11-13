const maxPhotoDimension = 2048;

interface StampPhotoOptions {
  accent: string;
  memberName: string;
  stampedAt: Date;
}

export function formatStampDateTime(stampedAt: Date) {
  const date = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(stampedAt);
  const time = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(stampedAt);

  return `${date} ${time}`;
}

function getOutputDimensions(width: number, height: number) {
  const scale = Math.min(1, maxPhotoDimension / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function createStampedPhoto(file: File, options: StampPhotoOptions) {
  let image: ImageBitmap;

  try {
    image = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("이 사진 형식은 사용할 수 없어요. JPG, PNG 또는 WebP 사진을 선택해 주세요.");
  }

  const dimensions = getOutputDimensions(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");

  if (!context) {
    image.close();
    throw new Error("사진을 처리할 수 없어요. 다시 시도해 주세요.");
  }

  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  image.close();

  const shortSide = Math.min(dimensions.width, dimensions.height);
  const padding = Math.max(24, Math.round(shortSide * 0.045));
  const titleSize = Math.max(24, Math.round(shortSide * 0.052));
  const detailSize = Math.max(18, Math.round(shortSide * 0.034));
  const bandHeight = Math.max(116, Math.round(shortSide * 0.19));
  const gradient = context.createLinearGradient(0, dimensions.height - bandHeight, 0, dimensions.height);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.42, "rgba(0, 0, 0, 0.58)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.82)");
  context.fillStyle = gradient;
  context.fillRect(0, dimensions.height - bandHeight, dimensions.width, bandHeight);

  context.fillStyle = options.accent;
  context.beginPath();
  context.arc(padding + titleSize * 0.18, dimensions.height - padding - detailSize * 1.85, titleSize * 0.16, 0, Math.PI * 2);
  context.fill();

  context.textBaseline = "bottom";
  context.fillStyle = "#ffffff";
  context.font = `900 ${titleSize}px sans-serif`;
  context.fillText("SWEAT STAMP", padding + titleSize * 0.48, dimensions.height - padding - detailSize * 1.42);
  context.font = `700 ${detailSize}px sans-serif`;
  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.fillText(`${options.memberName} · ${formatStampDateTime(options.stampedAt)}`, padding, dimensions.height - padding);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("사진을 저장할 수 없어요. 다시 시도해 주세요."));
      }
    }, "image/jpeg", 0.9);
  });

  const baseName = file.name.replace(/\.[^.]+$/, "") || "workout";
  return new File([blob], `${baseName}-stamped.jpg`, {
    type: "image/jpeg",
    lastModified: options.stampedAt.getTime(),
  });
}