import { useState, useCallback, useRef, useMemo, lazy, Suspense, useEffect } from 'react';
import type { PointerEvent, CSSProperties } from 'react';
import { getVisibleImages } from '../../lib/globalLayout';
import { getThumbUrl, getThumbSrcSet } from '../../lib/imageUrl';
import type { ImageMeta } from '../../types';
import styles from './Canvas.module.css';

const Lightbox = lazy(() => import('../Lightbox/Lightbox').then(m => ({ default: m.Lightbox })));

interface CanvasProps {
  images: ImageMeta[];
}

export function Canvas({ images }: CanvasProps) {
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [lightboxImage, setLightboxImage] = useState<ImageMeta | null>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const panRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0, time: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastTime = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Update DOM transform directly for smooth performance
  const updateTransform = useCallback((x: number, y: number) => {
    panRef.current = { x, y };
    if (containerRef.current) {
      containerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }, []);

  // Sync state for React (throttled to avoid excessive re-renders)
  const syncStateRef = useRef<number | null>(null);
  const syncState = useCallback(() => {
    if (syncStateRef.current) return;
    syncStateRef.current = requestAnimationFrame(() => {
      setPanPosition({ ...panRef.current });
      syncStateRef.current = null;
    });
  }, []);

  const visibleImages = useMemo(() => {
    const viewX = -panPosition.x;
    const viewY = -panPosition.y;
    const viewWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    return getVisibleImages(viewX, viewY, viewWidth, viewHeight, images);
  }, [panPosition.x, panPosition.y, images]);

  // Custom inertia animation with decay
  const startInertia = useCallback((velX: number, velY: number) => {
    const decay = 0.95; // Friction factor
    const minVelocity = 0.5;

    let vx = velX;
    let vy = velY;

    const tick = () => {
      vx *= decay;
      vy *= decay;

      // Stop when velocity is negligible
      if (Math.abs(vx) < minVelocity && Math.abs(vy) < minVelocity) {
        animationFrameRef.current = null;
        syncState();
        return;
      }

      const newX = panRef.current.x + vx * 0.016; // ~60fps frame time
      const newY = panRef.current.y + vy * 0.016;
      updateTransform(newX, newY);
      syncState();

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [updateTransform, syncState]);

  const stopInertia = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    stopInertia();

    isDragging.current = true;
    setIsGrabbing(true);
    hasDragged.current = false;
    const now = Date.now();
    dragStartPos.current = { x: e.clientX, y: e.clientY, time: now };
    lastPos.current = { x: e.clientX, y: e.clientY };
    lastTime.current = now;
    velocity.current = { x: 0, y: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [stopInertia]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - lastPos.current.x;
    const deltaY = e.clientY - lastPos.current.y;

    const totalDrag = Math.abs(e.clientX - dragStartPos.current.x) + Math.abs(e.clientY - dragStartPos.current.y);
    if (totalDrag > 5) {
      hasDragged.current = true;
    }

    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      // Smooth velocity calculation
      const newVelX = (deltaX / dt) * 1000;
      const newVelY = (deltaY / dt) * 1000;
      velocity.current = {
        x: velocity.current.x * 0.5 + newVelX * 0.5,
        y: velocity.current.y * 0.5 + newVelY * 0.5,
      };
    }
    lastTime.current = now;
    lastPos.current = { x: e.clientX, y: e.clientY };

    // Add mass feeling - canvas starts slow and ramps up
    const dragDuration = now - dragStartPos.current.time;
    const rampUp = Math.min(1, dragDuration / 200);
    const dragSmoothing = 0.2 + rampUp * 0.35;

    const newX = panRef.current.x + deltaX * dragSmoothing;
    const newY = panRef.current.y + deltaY * dragSmoothing;
    updateTransform(newX, newY);
    syncState();
  }, [updateTransform, syncState]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsGrabbing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Apply inertia animation
    const velX = velocity.current.x;
    const velY = velocity.current.y;

    if (Math.abs(velX) > 50 || Math.abs(velY) > 50) {
      startInertia(velX, velY);
    }
  }, [startInertia]);

  const handleImageClick = useCallback((imageId: string) => {
    if (hasDragged.current) return;
    const image = images.find((img) => img.id === imageId);
    if (image) setLightboxImage(image);
  }, [images]);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopInertia();
      if (syncStateRef.current) {
        cancelAnimationFrame(syncStateRef.current);
      }
    };
  }, [stopInertia]);

  return (
    <>
      <div
        className={`${styles.canvas} ${isGrabbing ? styles.canvasGrabbing : styles.canvasIdle}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div
          ref={containerRef}
          className={styles.panContainer}
          style={{ transform: `translate3d(${panPosition.x}px, ${panPosition.y}px, 0)` }}
        >
          {visibleImages.map(({ image, renderX, renderY }, index) => (
            <ImageWithPlaceholder
              key={`${image.id}-${renderX}-${renderY}`}
              imageId={image.id}
              priority={index < 4}
              style={{
                left: renderX,
                top: renderY,
                width: image.width,
                height: image.height,
              }}
              onClick={() => handleImageClick(image.id)}
            />
          ))}
        </div>
      </div>

      {lightboxImage && (
        <Suspense fallback={null}>
          <Lightbox image={lightboxImage} onClose={closeLightbox} />
        </Suspense>
      )}
    </>
  );
}

interface ImageWithPlaceholderProps {
  imageId: string;
  priority?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}

function ImageWithPlaceholder({ imageId, priority, style, onClick }: ImageWithPlaceholderProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`${styles.imageContainer} ${loaded ? styles.imageContainerLoaded : ''}`}
      style={style}
      onClick={onClick}
    >
      <img
        src={getThumbUrl(imageId)}
        srcSet={getThumbSrcSet(imageId)}
        alt=""
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        draggable={false}
        className={`${styles.image} ${loaded ? styles.imageVisible : ''}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
