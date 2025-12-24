export interface ImageMeta {
  id: string;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ImageManifest {
  images: ImageMeta[];
  version: number;
}

export interface TileCoord {
  x: number;
  y: number;
}

export interface PlacedImage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
