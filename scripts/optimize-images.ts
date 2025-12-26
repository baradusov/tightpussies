import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const THUMBS_DIR = path.join(IMAGES_DIR, 'thumbs');

// Thumbnail widths: 1x for standard displays, 2x for retina
const THUMB_SIZES = [250, 500] as const;

async function optimizeImages(): Promise<void> {
  console.log('Scanning images directory:', IMAGES_DIR);

  // Create thumbs directory
  if (!fs.existsSync(THUMBS_DIR)) {
    fs.mkdirSync(THUMBS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(IMAGES_DIR).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });

  console.log(`Found ${files.length} images to optimize`);

  let successCount = 0;
  let skipCount = 0;

  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file);
    const id = path.basename(file, path.extname(file));

    // Skip if it's a directory
    if (fs.statSync(filePath).isDirectory()) continue;

    try {
      for (const width of THUMB_SIZES) {
        const outputName = `${id}-${width}w.webp`;
        const outputPath = path.join(THUMBS_DIR, outputName);

        // Skip if already exists
        if (fs.existsSync(outputPath)) {
          skipCount++;
          continue;
        }

        await sharp(filePath)
          .resize(width, null, {
            withoutEnlargement: true,
            fit: 'inside',
          })
          .webp({ quality: 80 })
          .toFile(outputPath);

        successCount++;
      }

      // Progress indicator
      if (successCount % 20 === 0 && successCount > 0) {
        console.log(`  Processed ${successCount} thumbnails...`);
      }
    } catch (error) {
      console.warn(`Failed to process ${file}:`, error);
    }
  }

  console.log(`\nOptimization complete:`);
  console.log(`  - Generated: ${successCount} thumbnails`);
  console.log(`  - Skipped (existing): ${skipCount} thumbnails`);
  console.log(`  - Output directory: ${THUMBS_DIR}`);

  // Calculate size savings
  const originalSize = files.reduce((sum, file) => {
    const filePath = path.join(IMAGES_DIR, file);
    if (fs.statSync(filePath).isFile()) {
      return sum + fs.statSync(filePath).size;
    }
    return sum;
  }, 0);

  const thumbFiles = fs.readdirSync(THUMBS_DIR);
  const thumbSize = thumbFiles.reduce((sum, file) => {
    return sum + fs.statSync(path.join(THUMBS_DIR, file)).size;
  }, 0);

  console.log(`\nSize comparison:`);
  console.log(`  - Originals: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - Thumbnails: ${(thumbSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - Savings: ${(((originalSize - thumbSize) / originalSize) * 100).toFixed(1)}%`);
}

optimizeImages().catch(console.error);
