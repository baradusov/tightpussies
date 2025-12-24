import { motion, useMotionValue, useMotionValueEvent, animate } from 'motion/react';
import { useState, useCallback, useRef, useMemo } from 'react';
import { getVisibleImages } from '../../lib/globalLayout';
import { Lightbox } from '../Lightbox/Lightbox';
import type { ImageMeta } from '../../types';
import styles from './Canvas.module.css';

interface CanvasProps {
  images: ImageMeta[];
}

export function Canvas({ images }: CanvasProps) {
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);

  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [lightboxImage, setLightboxImage] = useState<ImageMeta | null>(null);

  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0, time: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastTime = useRef(0);
  const animationRef = useRef<{ x?: ReturnType<typeof animate>; y?: ReturnType<typeof animate> }>({});

  useMotionValueEvent(panX, 'change', (x) => {
    setPanPosition((prev) => ({ ...prev, x }));
  });
  useMotionValueEvent(panY, 'change', (y) => {
    setPanPosition((prev) => ({ ...prev, y }));
  });

  const visibleImages = useMemo(() => {
    const viewX = -panPosition.x;
    const viewY = -panPosition.y;
    const viewWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    return getVisibleImages(viewX, viewY, viewWidth, viewHeight, images);
  }, [panPosition.x, panPosition.y, images]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Stop any ongoing animations
    animationRef.current.x?.stop();
    animationRef.current.y?.stop();

    isDragging.current = true;
    hasDragged.current = false;
    const now = Date.now();
    dragStartPos.current = { x: e.clientX, y: e.clientY, time: now };
    lastPos.current = { x: e.clientX, y: e.clientY };
    lastTime.current = now;
    velocity.current = { x: 0, y: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
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
      const newVelX = (deltaX / dt) * 1000; // pixels per second
      const newVelY = (deltaY / dt) * 1000;
      // Smooth the velocity with previous value
      velocity.current = {
        x: velocity.current.x * 0.5 + newVelX * 0.5,
        y: velocity.current.y * 0.5 + newVelY * 0.5,
      };
    }
    lastTime.current = now;
    lastPos.current = { x: e.clientX, y: e.clientY };

    // Add mass feeling - canvas starts slow and ramps up
    const dragDuration = now - dragStartPos.current.time;
    const rampUp = Math.min(1, dragDuration / 200); // Ramp up over 200ms
    const dragSmoothing = 0.2 + rampUp * 0.35; // Start at 0.2, max at 0.55
    panX.set(panX.get() + deltaX * dragSmoothing);
    panY.set(panY.get() + deltaY * dragSmoothing);
  }, [panX, panY]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Apply inertia animation
    const velX = velocity.current.x;
    const velY = velocity.current.y;

    if (Math.abs(velX) > 50 || Math.abs(velY) > 50) {
      animationRef.current.x = animate(panX, panX.get() + velX * 0.8, {
        type: 'decay',
        velocity: velX,
        decay: 0.92,
      } as any);

      animationRef.current.y = animate(panY, panY.get() + velY * 0.8, {
        type: 'decay',
        velocity: velY,
        decay: 0.92,
      } as any);
    }
  }, [panX, panY]);

  const handleImageClick = useCallback((imageId: string) => {
    if (hasDragged.current) return;
    const image = images.find((img) => img.id === imageId);
    if (image) setLightboxImage(image);
  }, [images]);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  return (
    <>
      <div
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <motion.div
          className={styles.panContainer}
          style={{ x: panX, y: panY }}
        >
          {visibleImages.map(({ image, renderX, renderY }) => (
            <div
              key={`${image.id}-${renderX}-${renderY}`}
              className={styles.imageContainer}
              style={{
                position: 'absolute',
                left: renderX,
                top: renderY,
                width: image.width,
                height: image.height,
                cursor: 'pointer',
              }}
              onClick={() => handleImageClick(image.id)}
            >
              <img
                src={`/images/${image.id}.jpg`}
                alt=""
                loading="lazy"
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  pointerEvents: 'none',
                }}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {lightboxImage && (
        <Lightbox image={lightboxImage} onClose={closeLightbox} />
      )}
    </>
  );
}
