import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ImageMeta {
  id: string;
  width: number;
  height: number;
  aspectRatio: number;
}

interface PlacedImage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Same constants as globalLayout.ts
const WORLD_SIZE = 12000;
const TARGET_ROW_HEIGHT = 320;
const GAP = 30;

// how many images to prerender
const IMAGES_TO_PRERENDER = 10;

function computeGlobalLayout(allImages: ImageMeta[]): PlacedImage[] {
  const placedImages: PlacedImage[] = [];
  let currentY = 0;
  let imageIndex = 0;

  while (currentY < WORLD_SIZE) {
    const rowImages: { image: ImageMeta; naturalWidth: number }[] = [];
    let totalNaturalWidth = 0;

    while (imageIndex < allImages.length * 100) {
      const image = allImages[imageIndex % allImages.length];
      const naturalWidth = TARGET_ROW_HEIGHT * image.aspectRatio;
      const gapsIfAdded = rowImages.length * GAP;
      const widthIfAdded = totalNaturalWidth + naturalWidth + gapsIfAdded;

      if (widthIfAdded > WORLD_SIZE && rowImages.length >= 2) break;

      rowImages.push({ image, naturalWidth });
      totalNaturalWidth += naturalWidth;
      imageIndex++;
    }

    if (rowImages.length === 0) break;

    const numGaps = rowImages.length - 1;
    const availableForImages = WORLD_SIZE - numGaps * GAP;
    const scale = availableForImages / totalNaturalWidth;
    let rowHeight = Math.round(TARGET_ROW_HEIGHT * scale);

    const remainingHeight = WORLD_SIZE - currentY - GAP;
    if (rowHeight > remainingHeight) {
      if (remainingHeight < 100) break;
      rowHeight = remainingHeight;
    }

    let currentX = 0;
    for (let i = 0; i < rowImages.length; i++) {
      const item = rowImages[i];
      let width: number;
      if (i === rowImages.length - 1) {
        width = WORLD_SIZE - currentX - GAP;
      } else {
        width = Math.round(item.naturalWidth * scale);
      }

      placedImages.push({
        id: item.image.id,
        x: currentX,
        y: currentY,
        width,
        height: rowHeight,
      });

      currentX += width + GAP;
    }

    currentY += rowHeight + GAP;
  }

  return placedImages;
}

function getInitialVisibleImages(
  layout: PlacedImage[],
  viewWidth: number,
  viewHeight: number
): PlacedImage[] {
  const visible: PlacedImage[] = [];

  for (const img of layout) {
    if (
      img.x < viewWidth &&
      img.x + img.width > 0 &&
      img.y < viewHeight &&
      img.y + img.height > 0
    ) {
      visible.push(img);
    }
    // Stop after we've passed the viewport
    if (img.y > viewHeight) break;
  }

  return visible;
}

function generatePrerenderedHtml(images: PlacedImage[]): string {
  const containerStyle = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background-color: gainsboro;
  `.replace(/\s+/g, ' ').trim();

  const imageContainerBase = `
    position: absolute;
    overflow: hidden;
    border-radius: 8px;
    background: linear-gradient(135deg, #f4f6fb, #d8deec, #f4f6fb);
    background-size: 260% 260%;
  `.replace(/\s+/g, ' ').trim();

  const imageElements = images.map((img) => {
    const containerStyle = `${imageContainerBase} left: ${img.x}px; top: ${img.y}px; width: ${img.width}px; height: ${img.height}px;`;

    return `<div style="${containerStyle}"><img src="/images/thumbs/${img.id}-250w.webp" srcset="/images/thumbs/${img.id}-250w.webp 1x, /images/thumbs/${img.id}-500w.webp 2x" alt="" loading="eager" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div>`;
  }).join('');

  return `<div id="prerender" style="${containerStyle}"><div>${imageElements}</div></div>`;
}

export function generatePrerender(): string {
  const manifestPath = path.join(__dirname, '..', 'src', 'data', 'images.json');

  if (!fs.existsSync(manifestPath)) {
    console.warn('Manifest not found, skipping prerender');
    return '';
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const images: ImageMeta[] = manifest.images;

  const layout = computeGlobalLayout(images);

  const visible = getInitialVisibleImages(layout, 800, 900).slice(0, IMAGES_TO_PRERENDER);

  console.log(`Pre-rendering ${visible.length} initial images`);

  return generatePrerenderedHtml(visible);
}

// CLI mode
if (process.argv[1] === __filename) {
  const html = generatePrerender();
  console.log(html);
}
