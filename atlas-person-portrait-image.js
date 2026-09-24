(() => {
  "use strict";

  const PORTRAIT_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
  const PORTRAIT_OUTPUT_MAX_BYTES = 3 * 1024 * 1024;
  const PORTRAIT_TARGET_WIDTH = 1024;
  const PORTRAIT_TARGET_HEIGHT = 1280;
  const PORTRAIT_ASPECT = PORTRAIT_TARGET_WIDTH / PORTRAIT_TARGET_HEIGHT;

  function imageElementFromFile(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve({
        image,
        release:() => URL.revokeObjectURL(objectUrl)
      });
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("이미지를 읽을 수 없습니다."));
      };
      image.src = objectUrl;
    });
  }

  function canvasWebpBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob || blob.type !== "image/webp") {
          reject(new Error("이 브라우저는 WebP 변환을 지원하지 않습니다."));
          return;
        }
        resolve(blob);
      }, "image/webp", quality);
    });
  }

  async function blobBase64(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize)));
    }
    return btoa(binary);
  }

  async function portraitFileToWebpBase64(file) {
    if (!file || !String(file.type || "").startsWith("image/")) {
      throw new Error("이미지 파일을 선택하세요.");
    }
    if (Number(file.size || 0) > PORTRAIT_SOURCE_MAX_BYTES) {
      throw new Error("원본 이미지는 20MB 이하만 업로드할 수 있습니다.");
    }

    const loaded = await imageElementFromFile(file);
    try {
      const sourceWidth = Number(loaded.image.naturalWidth || loaded.image.width || 0);
      const sourceHeight = Number(loaded.image.naturalHeight || loaded.image.height || 0);
      if (!(sourceWidth > 0 && sourceHeight > 0)) throw new Error("이미지 크기를 확인할 수 없습니다.");

      const sourceAspect = sourceWidth / sourceHeight;
      let sx = 0;
      let sy = 0;
      let sw = sourceWidth;
      let sh = sourceHeight;
      if (sourceAspect > PORTRAIT_ASPECT) {
        sw = Math.round(sourceHeight * PORTRAIT_ASPECT);
        sx = Math.floor((sourceWidth - sw) / 2);
      } else if (sourceAspect < PORTRAIT_ASPECT) {
        sh = Math.round(sourceWidth / PORTRAIT_ASPECT);
        sy = Math.floor((sourceHeight - sh) / 2);
      }

      const outputScale = Math.min(1, PORTRAIT_TARGET_WIDTH / sw, PORTRAIT_TARGET_HEIGHT / sh);
      let outputWidth = Math.max(4, Math.floor((sw * outputScale) / 4) * 4);
      let outputHeight = Math.round(outputWidth / PORTRAIT_ASPECT);
      if (outputHeight > PORTRAIT_TARGET_HEIGHT) {
        outputHeight = PORTRAIT_TARGET_HEIGHT;
        outputWidth = PORTRAIT_TARGET_WIDTH;
      }

      const qualities = [0.9, 0.82, 0.74, 0.66];
      let scale = 1;
      for (let pass = 0; pass < 4; pass += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(4, Math.floor((outputWidth * scale) / 4) * 4);
        canvas.height = Math.round(canvas.width / PORTRAIT_ASPECT);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("이미지 변환 컨텍스트를 만들 수 없습니다.");
        context.drawImage(loaded.image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

        for (const quality of qualities) {
          const blob = await canvasWebpBlob(canvas, quality);
          if (blob.size <= PORTRAIT_OUTPUT_MAX_BYTES) {
            return Object.freeze({
              image_base64:await blobBase64(blob),
              width_px:canvas.width,
              height_px:canvas.height,
              bytes:blob.size
            });
          }
        }
        scale *= 0.8;
      }
      throw new Error("WebP 변환 후에도 3MB를 초과합니다. 더 작은 이미지를 사용하세요.");
    } finally {
      loaded.release();
    }
  }

  window.ATLAS_PERSON_PORTRAIT_IMAGE = Object.freeze({
    PORTRAIT_SOURCE_MAX_BYTES,
    PORTRAIT_OUTPUT_MAX_BYTES,
    PORTRAIT_TARGET_WIDTH,
    PORTRAIT_TARGET_HEIGHT,
    PORTRAIT_ASPECT,
    imageElementFromFile,
    canvasWebpBlob,
    blobBase64,
    portraitFileToWebpBase64
  });
})();
