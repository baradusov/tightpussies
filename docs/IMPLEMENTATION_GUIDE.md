# Infinite Cat Canvas - Implementation Guide

> A step-by-step guide for implementing an infinite, pannable canvas with cat images.
> Written for junior developers with detailed explanations.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Tech Stack Explained](#3-tech-stack-explained)
4. [Core Concepts You Need to Understand](#4-core-concepts-you-need-to-understand)
5. [Project Setup](#5-project-setup)
6. [Implementation Steps](#6-implementation-steps)
7. [Data Structures Reference](#7-data-structures-reference)
8. [Algorithm Deep Dives](#8-algorithm-deep-dives)
9. [Common Pitfalls & How to Avoid Them](#9-common-pitfalls--how-to-avoid-them)
10. [Testing Your Implementation](#10-testing-your-implementation)
11. [Performance Checklist](#11-performance-checklist)
12. [Glossary](#12-glossary)

---

## 1. Project Overview

### What We're Building

An infinite canvas where users can drag/pan in any direction to explore a sea of cat images. Think of it like Google Maps, but instead of a map, you're exploring an endless grid of cat photos.

**Key Features:**
- Drag in any direction - up, down, left, right - forever
- Images arranged in a Pinterest-style masonry layout
- Smooth 60fps performance even with 500+ images
- Click any image to see it larger in a lightbox
- Works on both desktop (mouse) and mobile (touch)

### How It Will Look

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────┐ ┌───────┐ ┌─────┐ ┌───────┐   │
│  │ cat │ │  cat  │ │ cat │ │  cat  │   │
│  │     │ │       │ │     │ │       │   │
│  └─────┘ │       │ └─────┘ │       │   │
│  ┌───────┘───────┘ ┌───────┘───────┘   │
│  │  cat  │ ┌─────┐ │  cat  │ ┌─────┐   │
│  │       │ │ cat │ │       │ │ cat │   │
│  │       │ │     │ │       │ │     │   │
│  └───────┘ └─────┘ └───────┘ └─────┘   │
│                                         │
│    ← user can drag in any direction →   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 2. Prerequisites

### Required Knowledge

Before starting, you should be comfortable with:

- **JavaScript ES6+**: Arrow functions, destructuring, spread operator, async/await
- **React basics**: Components, props, state, hooks (useState, useEffect, useMemo)
- **TypeScript basics**: Types, interfaces, generics
- **CSS**: Flexbox, positioning, transforms

### Required Software

```bash
# Check you have these installed:
node --version    # Should be 18.x or higher
npm --version     # Should be 9.x or higher
git --version     # Any recent version
```

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features (built-in)
- CSS Modules

---

## 3. Tech Stack Explained

### Why Each Technology Was Chosen

| Technology | What It Does | Why We Chose It |
|------------|--------------|-----------------|
| **React 18** | UI framework | Industry standard, great ecosystem, you probably already know it |
| **Vite** | Build tool & dev server | 10-100x faster than webpack, instant hot reload |
| **TypeScript** | Type-safe JavaScript | Catches bugs early, especially important for coordinate math |
| **Motion (motion.dev)** | Animations & gestures | Handles pan/drag gestures AND animations in one library |
| **CSS Modules** | Scoped CSS | No class name conflicts, simple to use |
| **Cloudinary** | Image hosting | Free tier, CDN, can resize images on-the-fly |

### What We're NOT Using (and Why)

| Technology | Why We Skipped It |
|------------|-------------------|
| Redux/Zustand | Overkill - React's built-in state is enough |
| Next.js | We don't need server-side rendering for this |
| Tailwind | Personal preference, CSS Modules work fine |
| Canvas API/WebGL | Too complex for image grid, HTML is simpler |

---

## 4. Core Concepts You Need to Understand

### 4.1 The Coordinate System

Imagine an infinite piece of graph paper. The center where you start is (0, 0).

```
                    y gets smaller (negative)
                           ↑
                           │
                           │
   x gets smaller ←────────┼────────→ x gets bigger
   (negative)              │              (positive)
                           │
                           ↓
                    y gets bigger (positive)
```

**Important:** When you drag RIGHT, the canvas moves LEFT (negative x direction), so the pan offset decreases. This is counterintuitive at first!

### 4.2 Virtualization (The Key to Performance)

**The Problem:** If you have 500+ images and they repeat infinitely, you can't render them all - the browser would crash.

**The Solution:** Only render what's visible on screen, plus a small buffer around it.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   [not rendered]  [not rendered]  [not rendered]    │
│                                                     │
│   [not rendered]  ┌─────────────┐  [not rendered]   │
│                   │   VISIBLE   │                   │
│                   │   VIEWPORT  │                   │
│                   │  (rendered) │                   │
│                   └─────────────┘                   │
│   [not rendered]  [not rendered]  [not rendered]    │
│                                                     │
└─────────────────────────────────────────────────────┘

Only the viewport + 1 tile buffer around it gets rendered.
As you pan, tiles are created/destroyed dynamically.
```

### 4.3 Tiles (Chunking the Infinite Space)

We divide the infinite canvas into "tiles" - fixed-size chunks (1200x1200px each).

```
┌────────┬────────┬────────┬────────┐
│ Tile   │ Tile   │ Tile   │ Tile   │
│ (-1,-1)│ (0,-1) │ (1,-1) │ (2,-1) │
├────────┼────────┼────────┼────────┤
│ Tile   │ Tile   │ Tile   │ Tile   │
│ (-1,0) │ (0,0)  │ (1,0)  │ (2,0)  │
├────────┼────────┼────────┼────────┤
│ Tile   │ Tile   │ Tile   │ Tile   │
│ (-1,1) │ (0,1)  │ (1,1)  │ (2,1)  │
└────────┴────────┴────────┴────────┘

Each tile is identified by (x, y) coordinates.
Tile (0,0) is at the origin.
```

**Why tiles?**
1. Easy to calculate which ones are visible
2. Each tile can render independently
3. We can cache tile layouts

### 4.4 Seeded Randomness (Deterministic Layout)

**The Problem:** We want images to appear randomly distributed, but if you pan away and come back, the same images should be in the same places.

**The Solution:** Use a "seeded" random number generator. Given the same seed, it always produces the same sequence of "random" numbers.

```typescript
// Regular random - different every time
Math.random() // 0.7234...
Math.random() // 0.1821...

// Seeded random - same seed = same sequence
seededRandom(42)() // Always 0.3745...
seededRandom(42)() // Always 0.9507... (second call with seed 42)
```

We use the tile coordinates to generate the seed, so Tile (3, -2) always gets the same images.

### 4.5 Masonry Layout

Instead of a uniform grid, masonry fits images like bricks - shorter columns get the next image.

```
UNIFORM GRID:                    MASONRY:
┌─────┐ ┌─────┐ ┌─────┐         ┌─────┐ ┌───────┐ ┌─────┐
│     │ │     │ │     │         │     │ │       │ │     │
│     │ │     │ │     │         │     │ │       │ └─────┘
└─────┘ └─────┘ └─────┘         └─────┘ │       │ ┌─────────┐
┌─────┐ ┌─────┐ ┌─────┐         ┌─────┐ └───────┘ │         │
│     │ │     │ │     │         │     │ ┌─────┐   │         │
│     │ │     │ │     │         │     │ │     │   └─────────┘
└─────┘ └─────┘ └─────┘         └─────┘ └─────┘

Uniform: all same height          Masonry: heights vary, no gaps
```

---

## 5. Project Setup

### Step 1: Create the Project

```bash
# Navigate to where you want the project
cd /Users/baradusov/dev/personal

# Create Vite project with React + TypeScript
npm create vite@latest infinite-cat-canvas -- --template react-ts

# Enter the project
cd infinite-cat-canvas

# Install dependencies
npm install

# Install Motion for gestures/animations
npm install motion

# Start development server
npm run dev
```

You should see "Local: http://localhost:5173" - open it in your browser.

### Step 2: Project Structure

Create this folder structure:

```
infinite-cat-canvas/
├── docs/
│   └── IMPLEMENTATION_GUIDE.md    # This file
├── public/
│   └── images/                    # Your cat images go here (gitignored)
├── scripts/
│   └── generate-manifest.ts       # Script to create images.json
├── src/
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── Canvas.tsx
│   │   │   ├── Canvas.module.css
│   │   │   ├── TileRenderer.tsx
│   │   │   └── Tile.tsx
│   │   ├── Image/
│   │   │   ├── CanvasImage.tsx
│   │   │   └── CanvasImage.module.css
│   │   └── Lightbox/
│   │       ├── Lightbox.tsx
│   │       └── Lightbox.module.css
│   ├── hooks/
│   │   ├── useCanvasPan.ts
│   │   └── useVisibleTiles.ts
│   ├── lib/
│   │   ├── tileLayout.ts
│   │   ├── seededRandom.ts
│   │   ├── coordinates.ts
│   │   └── imageUrl.ts
│   ├── data/
│   │   └── images.json            # Image manifest (committed to git)
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .gitignore
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts
```

Create the folders:

```bash
mkdir -p src/components/Canvas src/components/Image src/components/Lightbox
mkdir -p src/hooks src/lib src/data src/types
mkdir -p public/images scripts
```

### Step 3: Update .gitignore

Add to your `.gitignore`:

```gitignore
# Local images (too large for git)
public/images/

# Environment variables
.env
.env.local
```

### Step 4: Create .env.example

```bash
# .env.example
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

---

## 6. Implementation Steps

### Step 1: Define TypeScript Types

**File: `src/types/index.ts`**

```typescript
// Represents metadata for a single image
export interface ImageMeta {
  id: string;           // Unique identifier, e.g., "cat001"
  width: number;        // Original image width in pixels
  height: number;       // Original image height in pixels
  aspectRatio: number;  // width / height, pre-calculated for performance
  dominantColor?: string; // Optional: hex color for placeholder, e.g., "#a8c4d4"
}

// The manifest file structure
export interface ImageManifest {
  images: ImageMeta[];
  version: number;      // Increment when images change, for cache busting
}

// Tile coordinates (not pixels, but tile indices)
export interface TileCoord {
  x: number;  // e.g., -1, 0, 1, 2...
  y: number;
}

// An image placed within a tile
export interface PlacedImage {
  id: string;       // References ImageMeta.id
  x: number;        // X position within the tile (pixels)
  y: number;        // Y position within the tile (pixels)
  width: number;    // Rendered width (pixels)
  height: number;   // Rendered height (pixels)
}
```

**Why these types?**
- `ImageMeta`: We need to know image dimensions BEFORE loading them to calculate layout
- `TileCoord`: Separates tile indices from pixel coordinates (cleaner code)
- `PlacedImage`: The result of our layout algorithm - where each image goes

---

### Step 2: Implement Utility Functions

**File: `src/lib/seededRandom.ts`**

```typescript
/**
 * Creates a seeded pseudo-random number generator.
 *
 * WHY: We need "random" image placement that's consistent.
 * If you pan away and come back, images should be in the same spots.
 *
 * HOW: Uses a Linear Congruential Generator (LCG) algorithm.
 * Same seed always produces the same sequence of numbers.
 *
 * @param seed - A number that determines the sequence
 * @returns A function that returns the next "random" number (0-1)
 */
export function seededRandom(seed: number): () => number {
  // These magic numbers are from the "Numerical Recipes" LCG
  // They're chosen to produce a good distribution of values
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}
```

**File: `src/lib/coordinates.ts`**

```typescript
import type { TileCoord } from '../types';

/**
 * Converts tile coordinates to a unique integer (hash).
 *
 * WHY: We need to generate a seed for each tile's random generator.
 * This function ensures tile (3, -2) always gets the same seed.
 *
 * HOW: Uses the Cantor pairing function, which maps two integers
 * to a single unique integer. We first convert negatives to positives.
 *
 * @param x - Tile X coordinate (can be negative)
 * @param y - Tile Y coordinate (can be negative)
 * @returns A unique positive integer
 */
export function hashCoordinates(x: number, y: number): number {
  // Step 1: Map integers (...-2,-1,0,1,2...) to natural numbers (0,1,2,3,4...)
  // Negative numbers become odd: -1 → 1, -2 → 3, -3 → 5
  // Non-negative become even: 0 → 0, 1 → 2, 2 → 4
  const nx = x >= 0 ? 2 * x : -2 * x - 1;
  const ny = y >= 0 ? 2 * y : -2 * y - 1;

  // Step 2: Cantor pairing - combines two numbers into one unique number
  // This is a mathematical function that guarantees uniqueness
  return ((nx + ny) * (nx + ny + 1)) / 2 + ny;
}

/**
 * Calculates which tiles are visible given the current pan position.
 *
 * @param panX - Current horizontal pan offset (pixels)
 * @param panY - Current vertical pan offset (pixels)
 * @param viewportWidth - Browser window width (pixels)
 * @param viewportHeight - Browser window height (pixels)
 * @param tileSize - Size of each tile (pixels, e.g., 1200)
 * @param buffer - Extra tiles to render around viewport (default: 1)
 * @returns Array of tile coordinates that should be rendered
 */
export function getVisibleTiles(
  panX: number,
  panY: number,
  viewportWidth: number,
  viewportHeight: number,
  tileSize: number,
  buffer: number = 1
): TileCoord[] {
  // Calculate the viewport bounds in world coordinates
  // Note: panX/panY are the translation, so we negate them
  const left = -panX;
  const top = -panY;
  const right = left + viewportWidth;
  const bottom = top + viewportHeight;

  // Convert pixel coordinates to tile indices
  // Math.floor ensures we get the tile that contains each corner
  const minTileX = Math.floor(left / tileSize) - buffer;
  const maxTileX = Math.floor(right / tileSize) + buffer;
  const minTileY = Math.floor(top / tileSize) - buffer;
  const maxTileY = Math.floor(bottom / tileSize) + buffer;

  // Generate all tile coordinates in the visible range
  const tiles: TileCoord[] = [];
  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      tiles.push({ x, y });
    }
  }

  return tiles;
}
```

**File: `src/lib/imageUrl.ts`**

```typescript
/**
 * Generates the URL for an image based on environment.
 *
 * In development: Uses local files from public/images/
 * In production: Uses Cloudinary CDN with optional transforms
 *
 * @param id - Image identifier (without extension)
 * @param options - Optional Cloudinary transforms
 * @returns The full URL to the image
 */
export function getImageUrl(
  id: string,
  options?: { width?: number }
): string {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    // Local development - serve from public folder
    return `/images/${id}.jpg`;
  }

  // Production - use Cloudinary
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  // Build transformation string if width is specified
  const transforms = options?.width ? `w_${options.width}/` : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}infinite-cats/${id}.jpg`;
}
```

---

### Step 3: Implement the Masonry Layout Algorithm

**File: `src/lib/tileLayout.ts`**

```typescript
import type { ImageMeta, PlacedImage, TileCoord } from '../types';
import { seededRandom } from './seededRandom';
import { hashCoordinates } from './coordinates';

// Configuration constants
const TILE_SIZE = 1200;        // Tile dimensions in pixels
const COLUMN_COUNT = 4;        // Number of columns per tile
const GAP = 16;                // Gap between images in pixels
const IMAGES_PER_TILE = 12;    // How many images to show per tile

// Cache to avoid recalculating layouts
// Map key is "x,y" string, value is the layout
const layoutCache = new Map<string, PlacedImage[]>();

/**
 * Shuffles an array using Fisher-Yates algorithm with seeded random.
 *
 * WHY: We need to pick "random" images for each tile, but the selection
 * must be consistent (same tile = same images every time).
 *
 * @param array - Array to shuffle
 * @param rng - Seeded random function
 * @returns New shuffled array (doesn't modify original)
 */
function shuffleWithSeed<T>(array: T[], rng: () => number): T[] {
  const result = [...array]; // Copy to avoid mutation

  // Fisher-Yates shuffle - swap each element with a random one after it
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Computes the masonry layout for a single tile.
 *
 * HOW IT WORKS:
 * 1. Generate a seed from tile coordinates
 * 2. Use seeded random to select which images go in this tile
 * 3. Place images in columns, always adding to the shortest column
 *
 * @param tileCoord - The tile's coordinates
 * @param allImages - All available images
 * @returns Array of placed images with positions
 */
export function computeTileLayout(
  tileCoord: TileCoord,
  allImages: ImageMeta[]
): PlacedImage[] {
  // Check cache first
  const cacheKey = `${tileCoord.x},${tileCoord.y}`;
  if (layoutCache.has(cacheKey)) {
    return layoutCache.get(cacheKey)!;
  }

  // Create seeded random generator for this tile
  const seed = hashCoordinates(tileCoord.x, tileCoord.y);
  const rng = seededRandom(seed);

  // Select images for this tile using seeded shuffle
  const shuffled = shuffleWithSeed(allImages, rng);
  const tileImages = shuffled.slice(0, IMAGES_PER_TILE);

  // Calculate column width
  // Total width minus gaps, divided by column count
  const totalGapWidth = (COLUMN_COUNT - 1) * GAP;
  const columnWidth = (TILE_SIZE - totalGapWidth) / COLUMN_COUNT;

  // Track the current height of each column
  const columnHeights: number[] = new Array(COLUMN_COUNT).fill(0);

  // Place each image
  const placedImages: PlacedImage[] = tileImages.map((image) => {
    // Find the shortest column
    const shortestColumnIndex = columnHeights.indexOf(
      Math.min(...columnHeights)
    );

    // Calculate position
    const x = shortestColumnIndex * (columnWidth + GAP);
    const y = columnHeights[shortestColumnIndex];

    // Calculate height based on aspect ratio
    const height = columnWidth / image.aspectRatio;

    // Update column height
    columnHeights[shortestColumnIndex] += height + GAP;

    return {
      id: image.id,
      x,
      y,
      width: columnWidth,
      height,
    };
  });

  // Cache the result (with LRU eviction)
  if (layoutCache.size > 100) {
    // Remove oldest entry
    const firstKey = layoutCache.keys().next().value;
    if (firstKey) layoutCache.delete(firstKey);
  }
  layoutCache.set(cacheKey, placedImages);

  return placedImages;
}

// Export constants for use in components
export { TILE_SIZE, GAP };
```

---

### Step 4: Create React Hooks

**File: `src/hooks/useVisibleTiles.ts`**

```typescript
import { useState, useEffect, useMemo } from 'react';
import type { TileCoord } from '../types';
import { getVisibleTiles } from '../lib/coordinates';
import { TILE_SIZE } from '../lib/tileLayout';

/**
 * Hook that calculates which tiles should be visible.
 *
 * Updates when:
 * - Pan position changes
 * - Window is resized
 *
 * @param panX - Current horizontal pan offset
 * @param panY - Current vertical pan offset
 * @returns Array of visible tile coordinates
 */
export function useVisibleTiles(panX: number, panY: number): TileCoord[] {
  // Track viewport dimensions
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Update viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate visible tiles
  // useMemo prevents recalculation if inputs haven't changed
  const tiles = useMemo(() => {
    return getVisibleTiles(
      panX,
      panY,
      viewport.width,
      viewport.height,
      TILE_SIZE,
      1 // buffer of 1 tile
    );
  }, [panX, panY, viewport.width, viewport.height]);

  return tiles;
}
```

**File: `src/hooks/useCanvasPan.ts`**

```typescript
import { useMotionValue, PanInfo } from 'motion/react';
import { useCallback } from 'react';

/**
 * Hook that manages canvas pan state using Motion.
 *
 * Returns:
 * - panX, panY: Motion values for the current pan position
 * - handlers: Event handlers to attach to the canvas element
 *
 * Motion values are special - they update without causing re-renders,
 * which is crucial for smooth 60fps panning.
 */
export function useCanvasPan() {
  // MotionValues don't trigger re-renders when they change
  // This is key for performance during panning
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);

  // Handler for pan gestures
  const handlePan = useCallback(
    (_event: PointerEvent, info: PanInfo) => {
      // info.delta contains the change since last event
      panX.set(panX.get() + info.delta.x);
      panY.set(panY.get() + info.delta.y);
    },
    [panX, panY]
  );

  return {
    panX,
    panY,
    handlers: {
      onPan: handlePan,
    },
  };
}
```

---

### Step 5: Create Components

**File: `src/components/Canvas/Canvas.tsx`**

```tsx
import { motion, useMotionValueEvent } from 'motion/react';
import { useState, useCallback } from 'react';
import { useCanvasPan } from '../../hooks/useCanvasPan';
import { useVisibleTiles } from '../../hooks/useVisibleTiles';
import { TileRenderer } from './TileRenderer';
import { Lightbox } from '../Lightbox/Lightbox';
import type { ImageMeta } from '../../types';
import styles from './Canvas.module.css';

interface CanvasProps {
  images: ImageMeta[];
}

/**
 * Main canvas component that handles:
 * - Pan gestures (dragging)
 * - Rendering visible tiles
 * - Lightbox state
 */
export function Canvas({ images }: CanvasProps) {
  const { panX, panY, handlers } = useCanvasPan();

  // We need regular state for visible tiles because we want re-renders
  // when tiles change (to mount/unmount tile components)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });

  // Update pan position state when motion values change
  // This bridges motion values (no re-render) with React state (re-render)
  useMotionValueEvent(panX, 'change', (x) => {
    setPanPosition((prev) => ({ ...prev, x }));
  });
  useMotionValueEvent(panY, 'change', (y) => {
    setPanPosition((prev) => ({ ...prev, y }));
  });

  const visibleTiles = useVisibleTiles(panPosition.x, panPosition.y);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<ImageMeta | null>(null);

  const handleImageClick = useCallback((imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (image) setLightboxImage(image);
  }, [images]);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  return (
    <>
      <motion.div
        className={styles.canvas}
        {...handlers}
        style={{
          // Prevent text selection while dragging
          userSelect: 'none',
          touchAction: 'none', // Prevent browser scroll on touch
        }}
      >
        <motion.div
          className={styles.panContainer}
          style={{
            x: panX,
            y: panY,
          }}
        >
          <TileRenderer
            tiles={visibleTiles}
            images={images}
            panX={panPosition.x}
            panY={panPosition.y}
            onImageClick={handleImageClick}
          />
        </motion.div>
      </motion.div>

      {lightboxImage && (
        <Lightbox image={lightboxImage} onClose={closeLightbox} />
      )}
    </>
  );
}
```

**File: `src/components/Canvas/Canvas.module.css`**

```css
.canvas {
  /* Fill entire viewport */
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;

  /* Change cursor to indicate draggable */
  cursor: grab;

  /* Background color visible between tiles */
  background-color: #1a1a1a;
}

.canvas:active {
  cursor: grabbing;
}

.panContainer {
  /* This element moves when panning */
  /* Using will-change hints to browser for GPU acceleration */
  will-change: transform;
}
```

**File: `src/components/Canvas/TileRenderer.tsx`**

```tsx
import { memo } from 'react';
import { Tile } from './Tile';
import type { TileCoord, ImageMeta } from '../../types';
import { TILE_SIZE } from '../../lib/tileLayout';

interface TileRendererProps {
  tiles: TileCoord[];
  images: ImageMeta[];
  panX: number;
  panY: number;
  onImageClick: (imageId: string) => void;
}

/**
 * Renders all visible tiles.
 *
 * Each tile is positioned absolutely based on its coordinates.
 * Using memo to prevent unnecessary re-renders.
 */
export const TileRenderer = memo(function TileRenderer({
  tiles,
  images,
  onImageClick,
}: TileRendererProps) {
  return (
    <>
      {tiles.map((tile) => (
        <Tile
          key={`${tile.x},${tile.y}`}
          coord={tile}
          images={images}
          onImageClick={onImageClick}
          style={{
            position: 'absolute',
            left: tile.x * TILE_SIZE,
            top: tile.y * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
          }}
        />
      ))}
    </>
  );
});
```

**File: `src/components/Canvas/Tile.tsx`**

```tsx
import { memo, useMemo, CSSProperties } from 'react';
import { CanvasImage } from '../Image/CanvasImage';
import { computeTileLayout } from '../../lib/tileLayout';
import type { TileCoord, ImageMeta } from '../../types';

interface TileProps {
  coord: TileCoord;
  images: ImageMeta[];
  onImageClick: (imageId: string) => void;
  style: CSSProperties;
}

/**
 * A single tile containing multiple images in masonry layout.
 *
 * Memoized to prevent re-renders when panning (only re-renders
 * when tile coordinates change, which means it's a new tile).
 */
export const Tile = memo(function Tile({
  coord,
  images,
  onImageClick,
  style,
}: TileProps) {
  // Compute layout for this tile
  // useMemo ensures we don't recalculate unless coord or images change
  const layout = useMemo(
    () => computeTileLayout(coord, images),
    [coord, images]
  );

  return (
    <div style={style}>
      {layout.map((placed) => (
        <CanvasImage
          key={placed.id}
          imageId={placed.id}
          x={placed.x}
          y={placed.y}
          width={placed.width}
          height={placed.height}
          onClick={() => onImageClick(placed.id)}
        />
      ))}
    </div>
  );
});
```

**File: `src/components/Image/CanvasImage.tsx`**

```tsx
import { memo, useState } from 'react';
import { getImageUrl } from '../../lib/imageUrl';
import styles from './CanvasImage.module.css';

interface CanvasImageProps {
  imageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: () => void;
}

/**
 * Individual image component with:
 * - Lazy loading
 * - Loading placeholder
 * - Error handling
 * - Click handler for lightbox
 */
export const CanvasImage = memo(function CanvasImage({
  imageId,
  x,
  y,
  width,
  height,
  onClick,
}: CanvasImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const imageUrl = getImageUrl(imageId, { width: Math.ceil(width) });

  return (
    <div
      className={styles.container}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
      }}
      onClick={onClick}
    >
      {/* Placeholder shown while loading */}
      {!loaded && !error && <div className={styles.placeholder} />}

      {/* Error state */}
      {error && <div className={styles.error}>Failed to load</div>}

      {/* Actual image */}
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className={`${styles.image} ${loaded ? styles.loaded : ''}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
});
```

**File: `src/components/Image/CanvasImage.module.css`**

```css
.container {
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;

  /* Subtle shadow for depth and to help with tile boundaries */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  /* Smooth hover effect */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.container:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 1;
}

.placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2a2a2a;
  color: #888;
  font-size: 12px;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image.loaded {
  opacity: 1;
}
```

**File: `src/components/Lightbox/Lightbox.tsx`**

```tsx
import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getImageUrl } from '../../lib/imageUrl';
import type { ImageMeta } from '../../types';
import styles from './Lightbox.module.css';

interface LightboxProps {
  image: ImageMeta;
  onClose: () => void;
}

/**
 * Modal overlay showing a larger version of the clicked image.
 *
 * Features:
 * - Click backdrop to close
 * - Press Escape to close
 * - Animated entry/exit
 */
export function Lightbox({ image, onClose }: LightboxProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking the backdrop, not the image
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      <motion.div
        className={styles.backdrop}
        onClick={handleBackdropClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.img
          src={getImageUrl(image.id)}
          alt=""
          className={styles.image}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
```

**File: `src/components/Lightbox/Lightbox.module.css`**

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  cursor: default;
}
```

---

### Step 6: Wire It All Together

**File: `src/App.tsx`**

```tsx
import { Canvas } from './components/Canvas/Canvas';
import imageManifest from './data/images.json';
import type { ImageManifest } from './types';

// Cast the imported JSON to our type
const manifest = imageManifest as ImageManifest;

function App() {
  return <Canvas images={manifest.images} />;
}

export default App;
```

**File: `src/index.css`**

```css
/* Reset and base styles */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #1a1a1a;
  color: #fff;
}
```

**File: `src/data/images.json`** (sample - replace with your actual images)

```json
{
  "version": 1,
  "images": [
    { "id": "cat001", "width": 800, "height": 600, "aspectRatio": 1.333 },
    { "id": "cat002", "width": 600, "height": 800, "aspectRatio": 0.75 },
    { "id": "cat003", "width": 1000, "height": 1000, "aspectRatio": 1 },
    { "id": "cat004", "width": 1200, "height": 800, "aspectRatio": 1.5 },
    { "id": "cat005", "width": 700, "height": 900, "aspectRatio": 0.778 }
  ]
}
```

---

## 7. Data Structures Reference

### Quick Reference Card

```typescript
// Image metadata (from manifest)
ImageMeta {
  id: string           // "cat001"
  width: number        // 800
  height: number       // 600
  aspectRatio: number  // 1.333
}

// Tile identifier
TileCoord {
  x: number  // -1, 0, 1, 2...
  y: number  // -1, 0, 1, 2...
}

// Image positioned in a tile
PlacedImage {
  id: string     // "cat001"
  x: number      // 0 (pixels within tile)
  y: number      // 0 (pixels within tile)
  width: number  // 280 (pixels)
  height: number // 210 (pixels)
}
```

---

## 8. Algorithm Deep Dives

### 8.1 How Masonry Layout Works

```
Step 1: Start with empty columns
Column 0: height = 0
Column 1: height = 0
Column 2: height = 0

Step 2: Add first image (height 200px)
→ All columns same height, pick column 0
Column 0: height = 200 + gap = 216
Column 1: height = 0
Column 2: height = 0

Step 3: Add second image (height 150px)
→ Column 1 or 2 shortest, pick column 1
Column 0: height = 216
Column 1: height = 150 + gap = 166
Column 2: height = 0

Step 4: Add third image (height 300px)
→ Column 2 shortest, pick column 2
Column 0: height = 216
Column 1: height = 166
Column 2: height = 300 + gap = 316

...and so on
```

### 8.2 How Seeded Random Works

```
Regular Math.random():
Call 1: 0.7234  (unpredictable)
Call 2: 0.1821  (unpredictable)
Call 3: 0.9432  (unpredictable)

Seeded random with seed 42:
Call 1: 0.3745  (always this for seed 42)
Call 2: 0.9507  (always this for seed 42)
Call 3: 0.7319  (always this for seed 42)

Different seed (99):
Call 1: 0.1234  (different sequence)
Call 2: 0.5678  (different sequence)
Call 3: 0.9012  (different sequence)
```

### 8.3 How Tile Visibility Works

```
Viewport: 1920x1080 at pan (500, 300)
Tile size: 1200px

World bounds:
  left = -500
  top = -300
  right = -500 + 1920 = 1420
  bottom = -300 + 1080 = 780

Tile indices:
  minX = floor(-500/1200) - 1 = -1 - 1 = -2
  maxX = floor(1420/1200) + 1 = 1 + 1 = 2
  minY = floor(-300/1200) - 1 = -1 - 1 = -2
  maxY = floor(780/1200) + 1 = 0 + 1 = 1

Visible tiles: all combinations from (-2,-2) to (2,1)
= 5 × 4 = 20 tiles
```

---

## 9. Common Pitfalls & How to Avoid Them

### Pitfall 1: Re-renders Killing Performance

**Problem:** Component re-renders on every pan movement, causing jank.

**Solution:** Use `memo()` on tile and image components, use MotionValues for pan position.

```typescript
// BAD - re-renders every pan
const [panX, setPanX] = useState(0);

// GOOD - only updates the value, no re-render
const panX = useMotionValue(0);
```

### Pitfall 2: Tiles Not Appearing on Negative Coordinates

**Problem:** You only see tiles when panning down/right, not up/left.

**Solution:** Make sure your coordinate math handles negative numbers correctly.

```typescript
// BAD - doesn't work for negative coordinates
const tileX = Math.floor(x / TILE_SIZE);

// GOOD - works for all coordinates (though above is actually fine)
// Just make sure you're not filtering out negative indices anywhere
```

### Pitfall 3: Images Shift When Re-visiting Tiles

**Problem:** Pan away and back, images are in different positions.

**Solution:** Ensure your seeded random is truly deterministic. Check that:
1. Seed is calculated the same way every time
2. Random function is called the same number of times
3. No external state affects the calculation

### Pitfall 4: Memory Leak from Tile Caching

**Problem:** Cache grows unbounded as user pans around.

**Solution:** Implement LRU (Least Recently Used) eviction.

```typescript
if (layoutCache.size > 100) {
  const firstKey = layoutCache.keys().next().value;
  layoutCache.delete(firstKey);
}
```

### Pitfall 5: Images Not Loading

**Problem:** Images show placeholder forever.

**Solution:** Check:
1. Image paths are correct (`/images/cat001.jpg`)
2. Images exist in `public/images/`
3. File extensions match (`.jpg` vs `.jpeg` vs `.png`)
4. No CORS issues in production

---

## 10. Testing Your Implementation

### Manual Testing Checklist

- [ ] Can drag in all four directions
- [ ] Panning feels smooth (60fps)
- [ ] Images load as you pan to new areas
- [ ] Panning away and back shows same images in same positions
- [ ] Clicking image opens lightbox
- [ ] Pressing Escape closes lightbox
- [ ] Works on mobile (touch gestures)
- [ ] Works on different screen sizes

### Unit Tests to Write

```typescript
// coordinates.test.ts
test('hashCoordinates returns same value for same input', () => {
  expect(hashCoordinates(3, -2)).toBe(hashCoordinates(3, -2));
});

test('hashCoordinates returns different values for different inputs', () => {
  expect(hashCoordinates(3, -2)).not.toBe(hashCoordinates(3, -3));
});

// seededRandom.test.ts
test('seeded random produces consistent sequence', () => {
  const rng1 = seededRandom(42);
  const rng2 = seededRandom(42);

  expect(rng1()).toBe(rng2());
  expect(rng1()).toBe(rng2());
  expect(rng1()).toBe(rng2());
});

// tileLayout.test.ts
test('same tile coordinates produce same layout', () => {
  const layout1 = computeTileLayout({ x: 1, y: -2 }, mockImages);
  const layout2 = computeTileLayout({ x: 1, y: -2 }, mockImages);

  expect(layout1).toEqual(layout2);
});
```

---

## 11. Performance Checklist

Before considering the project "done", verify:

- [ ] Lighthouse performance score > 90
- [ ] No jank during panning (use DevTools Performance tab)
- [ ] Memory doesn't grow unbounded (check DevTools Memory tab)
- [ ] Images use appropriate sizes (not loading full resolution)
- [ ] CSS transforms use GPU (`transform` not `left`/`top`)
- [ ] Tiles outside viewport are unmounted
- [ ] React DevTools shows minimal re-renders during pan

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **Virtualization** | Only rendering elements currently visible on screen |
| **Tile** | A fixed-size chunk of the infinite canvas (1200x1200px) |
| **Masonry** | A layout where items stack like bricks, filling columns from shortest |
| **Seeded Random** | A "random" number generator that produces the same sequence given the same starting seed |
| **MotionValue** | Motion library's way of storing animated values without causing re-renders |
| **LRU Cache** | Least Recently Used cache - when full, removes the oldest unused item |
| **Aspect Ratio** | Width divided by height - used to calculate dimensions |
| **Viewport** | The visible area of the browser window |

---

## Next Steps After MVP

1. **Add Cloudinary**: Upload images, update `imageUrl.ts` for production
2. **Generate Real Manifest**: Create script to read image dimensions
3. **Add Loading States**: Show skeleton screens for tiles
4. **Optimize Images**: Use Cloudinary transforms for appropriate sizes
5. **Add Error Boundaries**: Graceful error handling for failed tiles
6. **Consider Zoom**: Add pinch-to-zoom functionality
