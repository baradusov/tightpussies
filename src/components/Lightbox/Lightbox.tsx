import { useEffect, useCallback, useState } from 'react';
import { getOriginalUrl } from '../../lib/imageUrl';
import type { ImageMeta } from '../../types';
import styles from './Lightbox.module.css';

interface LightboxProps {
  image: ImageMeta;
  onClose: () => void;
}

export function Lightbox({ image, onClose }: LightboxProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for exit animation to complete
    setTimeout(onClose, 150);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    // Prevent background interaction while lightbox is open
    document.body.style.overflow = 'hidden';
    // iOS Safari: force layer to prevent rendering issues
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose]
  );

  return (
    <div
      className={`${styles.backdrop} ${isClosing ? styles.backdropClosing : ''}`}
      onClick={handleBackdropClick}
    >
      <img
        src={getOriginalUrl(image.id)}
        alt=""
        className={`${styles.image} ${isClosing ? styles.imageClosing : ''}`}
      />
      <button className={styles.closeButton} onClick={handleClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
}
