export function getOriginalUrl(id: string): string {
  if (import.meta.env.DEV) {
    return `/images/${id}.jpg`;
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    return `/images/${id}.jpg`;
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/infinite-cats/${id}.jpg`;
}

export function getThumbSrcSet(id: string): string {
  // 250w for 1x displays, 500w for 2x retina
  return `/images/thumbs/${id}-250w.webp 1x, /images/thumbs/${id}-500w.webp 2x`;
}

export function getThumbUrl(id: string): string {
  return `/images/thumbs/${id}-250w.webp`;
}
