export function getImageUrl(
  id: string,
  options?: { width?: number }
): string {
  if (import.meta.env.DEV) {
    return `/images/${id}.jpg`;
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    return `/images/${id}.jpg`;
  }

  const transforms = options?.width ? `w_${options.width}/` : '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}infinite-cats/${id}.jpg`;
}
