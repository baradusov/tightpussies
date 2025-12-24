import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import imageSize from 'image-size';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ImageMeta {
  id: string;
  width: number;
  height: number;
  aspectRatio: number;
}

interface ImageManifest {
  images: ImageMeta[];
  version: number;
}

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'images.json');

function generateManifest(): void {
  console.log('Scanning images directory:', IMAGES_DIR);

  const files = fs.readdirSync(IMAGES_DIR).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });

  console.log(`Found ${files.length} images`);

  const images: ImageMeta[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file);
    const id = path.basename(file, path.extname(file));

    try {
      const buffer = fs.readFileSync(filePath);
      const dimensions = imageSize(buffer);

      if (dimensions.width && dimensions.height) {
        images.push({
          id,
          width: dimensions.width,
          height: dimensions.height,
          aspectRatio: dimensions.width / dimensions.height,
        });
        successCount++;
      }
    } catch (error) {
      failCount++;
      if (failCount <= 3) {
        console.warn(`Failed to read dimensions for ${file}`);
      }
    }
  }

  if (failCount > 3) {
    console.warn(`... and ${failCount - 3} more failures`);
  }

  images.sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  const manifest: ImageManifest = {
    images,
    version: 1,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));

  console.log(`Generated manifest with ${images.length} images (${failCount} failures)`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

generateManifest();
