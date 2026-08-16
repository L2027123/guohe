// 全局 OCR 工具：Tesseract.js 单例 + 图片压缩
// 修复：默认 CDN 在国内被墙 → 改用国内可访问的 jsdelivr 镜像 + 超时保护

let workerPromise = null;
let isFirstInit = true;

// 国内可访问的 CDN 路径（替代默认的 tessdata.projectnaptha.com）
// worker/core 用 unpkg 镜像，字库用 jsdelivr 的 GitHub 镜像
const TESSERACT_VERSION = '7.0.0';
const CDN_BASE = `https://cdn.jsdelivr.net/npm`;
const WORKER_PATH = `${CDN_BASE}/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`;
const CORE_PATH = `${CDN_BASE}/tesseract.js-core@${TESSERACT_VERSION}/tesseract-core.wasm.js`;
// 字库文件从 GitHub tessdata 仓库镜像（jsdelivr CDN 在国内可访问）
const LANG_PATH = `https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0`;

const INIT_TIMEOUT_MS = 60_000; // 字库下载 60 秒超时
const OCR_TIMEOUT_MS = 30_000;  // 识别 30 秒超时

function getWorker(onProgress) {
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    const { createWorker } = await import('tesseract.js');
    const first = isFirstInit;
    if (first && onProgress) onProgress('init', 0);
    isFirstInit = false;

    // 创建 worker（使用国内可访问的 CDN 路径）
    const worker = await createWorker(['chi_sim', 'eng'], 1, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      logger: (m) => {
        if (!onProgress) return;
        if (m.status === 'loading tesseract core' ||
            m.status === 'initializing tesseract' ||
            m.status === 'loading language traineddata' ||
            m.status === 'initializing api') {
          onProgress('init', Math.round((m.progress || 0) * 100));
        } else if (m.status === 'recognizing text') {
          onProgress('ocr', Math.round((m.progress || 0) * 100));
        }
      },
    });
    if (first && onProgress) onProgress('init', 100);
    return worker;
  })();

  // 超时保护：如果 60 秒内没完成，重置 promise 允许重试
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('OCR initialization timeout')), INIT_TIMEOUT_MS)
  );
  workerPromise = Promise.race([workerPromise, timeout]).catch((err) => {
    // 超时或失败 → 重置，允许下次重试
    workerPromise = null;
    isFirstInit = true;
    throw err;
  });

  return workerPromise;
}

// 压缩图片到 maxWidth（默认 1600px），返回 Blob
export async function compressImage(file, maxWidth = 1600, quality = 0.85) {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          quality,
        );
      } catch {
        resolve(file);
      }
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

// 带超时的 recognizeImage
export async function recognizeImage(file, onProgress) {
  const compressed = await compressImage(file, 1600, 0.85);

  const recognizePromise = (async () => {
    const worker = await getWorker(onProgress);
    if (onProgress) onProgress('ocr', 0);
    const { data } = await worker.recognize(compressed);
    if (onProgress) onProgress('ocr', 100);
    return (data && data.text) ? data.text : '';
  })();

  // OCR 识别超时保护
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('识别超时，请检查网络后重试')), OCR_TIMEOUT_MS)
  );

  return Promise.race([recognizePromise, timeout]);
}

export function isOCRFirstInit() {
  return isFirstInit;
}

// 重置 worker（网络错误后允许重试）
export function resetOCR() {
  workerPromise = null;
  isFirstInit = true;
}
