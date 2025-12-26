import { useState } from 'react';
import styles from './InfoButton.module.css';

export function InfoButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.container}>
      {isOpen ? (
        <div className={styles.popup}>
          <button
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
          >
            ×
          </button>
          <p>
            сделано <a href="https://baradusov.ru" target="_blank" rel="noopener noreferrer">нурилем</a>
            <br/>для канала <a href="https://t.me/tightpussies" target="_blank" rel="noopener noreferrer">тесные киски</a>
          </p>
        </div>
      ) : (
        <button className={styles.button} onClick={() => setIsOpen(true)}>
          <span>i</span>
        </button>
      )}
    </div>
  );
}
