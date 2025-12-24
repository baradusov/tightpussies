import type { ImageMeta, PlacedImage } from '../types';

// Virtual canvas size - large enough to feel infinite, wraps at edges
export const WORLD_SIZE = 12000;
const TARGET_ROW_HEIGHT = 320;
const GAP = 30;

let cachedLayout: PlacedImage[] | null = null;
let cachedImageCount = 0;

// Spatial index for fast lookup
const CELL_SIZE = 400;
let spatialIndex: Map<string, PlacedImage[]> | null = null;

function buildSpatialIndex(images: PlacedImage[]): Map<string, PlacedImage[]> {
  const index = new Map<string, PlacedImage[]>();

  for (const img of images) {
    const minCellX = Math.floor(img.x / CELL_SIZE);
    const maxCellX = Math.floor((img.x + img.width) / CELL_SIZE);
    const minCellY = Math.floor(img.y / CELL_SIZE);
    const maxCellY = Math.floor((img.y + img.height) / CELL_SIZE);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy}`;
        if (!index.has(key)) {
          index.set(key, []);
        }
        index.get(key)!.push(img);
      }
    }
  }

  return index;
}

export function computeGlobalLayout(allImages: ImageMeta[]): PlacedImage[] {
  if (cachedLayout && cachedImageCount === allImages.length) {
    return cachedLayout;
  }

  const placedImages: PlacedImage[] = [];
  let currentY = 0;
  let imageIndex = 0;

  // Fill the entire world with rows
  while (currentY < WORLD_SIZE) {
    // Collect images for this row - track ONLY natural widths (no gaps)
    const rowImages: { image: ImageMeta; naturalWidth: number }[] = [];
    let totalNaturalWidth = 0;

    // Keep adding images until natural width (plus gaps) would exceed world size
    while (imageIndex < allImages.length * 100) { // Safety limit
      const image = allImages[imageIndex % allImages.length];
      const naturalWidth = TARGET_ROW_HEIGHT * image.aspectRatio;

      // Calculate what total width would be if we add this image
      const gapsIfAdded = rowImages.length * GAP; // N images = N-1 gaps, but we're adding one more so N gaps
      const widthIfAdded = totalNaturalWidth + naturalWidth + gapsIfAdded;

      // If adding this image would exceed, and we have at least 2 images, stop
      if (widthIfAdded > WORLD_SIZE && rowImages.length >= 2) {
        break;
      }

      rowImages.push({ image, naturalWidth });
      totalNaturalWidth += naturalWidth;
      imageIndex++;
    }

    if (rowImages.length === 0) break;

    // Calculate scale to make row fit EXACTLY
    const numGaps = rowImages.length - 1;
    const availableForImages = WORLD_SIZE - (numGaps * GAP);
    const scale = availableForImages / totalNaturalWidth;
    let rowHeight = Math.round(TARGET_ROW_HEIGHT * scale);

    // If this row would extend beyond WORLD_SIZE (minus GAP for world wrap), scale it to fit
    const remainingHeight = WORLD_SIZE - currentY - GAP; // Leave GAP at the end for world wrap
    if (rowHeight > remainingHeight) {
      // If remaining space is too small, skip this row
      if (remainingHeight < 100) {
        break;
      }
      rowHeight = remainingHeight;
    }

    // Place images in row - they MUST fill exactly WORLD_SIZE
    let currentX = 0;
    for (let i = 0; i < rowImages.length; i++) {
      const item = rowImages[i];

      // For last image, calculate width to fill remaining space (minus GAP for world wrap)
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

  cachedLayout = placedImages;
  cachedImageCount = allImages.length;
  spatialIndex = buildSpatialIndex(placedImages);

  return placedImages;
}

export function getVisibleImages(
  viewX: number,
  viewY: number,
  viewWidth: number,
  viewHeight: number,
  allImages: ImageMeta[]
): { image: PlacedImage; renderX: number; renderY: number }[] {
  const layout = computeGlobalLayout(allImages);

  if (!spatialIndex) {
    spatialIndex = buildSpatialIndex(layout);
  }

  const results: { image: PlacedImage; renderX: number; renderY: number }[] = [];
  const seenKeys = new Set<string>();

  // Calculate which world copies we need to check
  // For negative coordinates, we need to look at world copies to the left/above
  const startWorldX = Math.floor(viewX / WORLD_SIZE);
  const endWorldX = Math.floor((viewX + viewWidth) / WORLD_SIZE);
  const startWorldY = Math.floor(viewY / WORLD_SIZE);
  const endWorldY = Math.floor((viewY + viewHeight) / WORLD_SIZE);

  for (let wy = startWorldY; wy <= endWorldY; wy++) {
    for (let wx = startWorldX; wx <= endWorldX; wx++) {
      const worldOffsetX = wx * WORLD_SIZE;
      const worldOffsetY = wy * WORLD_SIZE;

      // What part of this world copy is visible?
      const localMinX = Math.max(0, viewX - worldOffsetX);
      const localMaxX = Math.min(WORLD_SIZE, viewX + viewWidth - worldOffsetX);
      const localMinY = Math.max(0, viewY - worldOffsetY);
      const localMaxY = Math.min(WORLD_SIZE, viewY + viewHeight - worldOffsetY);

      if (localMinX >= localMaxX || localMinY >= localMaxY) continue;

      // Which cells to check
      const minCellX = Math.floor(localMinX / CELL_SIZE);
      const maxCellX = Math.floor(localMaxX / CELL_SIZE);
      const minCellY = Math.floor(localMinY / CELL_SIZE);
      const maxCellY = Math.floor(localMaxY / CELL_SIZE);

      for (let cy = minCellY; cy <= maxCellY; cy++) {
        for (let cx = minCellX; cx <= maxCellX; cx++) {
          const cellKey = `${cx},${cy}`;
          const cellImages = spatialIndex.get(cellKey);
          if (!cellImages) continue;

          for (const img of cellImages) {
            const renderX = img.x + worldOffsetX;
            const renderY = img.y + worldOffsetY;

            // Bounds check
            if (
              renderX + img.width < viewX ||
              renderX > viewX + viewWidth ||
              renderY + img.height < viewY ||
              renderY > viewY + viewHeight
            ) {
              continue;
            }

            // Unique key per world instance
            const key = `${img.x},${img.y},${wx},${wy}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);

            results.push({ image: img, renderX, renderY });
          }
        }
      }
    }
  }

  return results;
}
