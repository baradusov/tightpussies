import { useState } from 'react';
import { motion } from 'motion/react';
import styles from './InfoButton.module.css';

export function InfoButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.container}>
      <motion.div
        className={isOpen ? styles.popup : styles.button}
        layout
        onClick={() => !isOpen && setIsOpen(true)}
        initial={false}
        animate={{
          borderRadius: isOpen ? 16 : 24,
        }}
        transition={{
          layout: { type: 'spring', stiffness: 500, damping: 35 },
          borderRadius: { duration: 0.2 },
        }}
        style={{ cursor: isOpen ? 'default' : 'pointer' }}
      >
        {isOpen ? (
          <>
            <motion.button
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              ×
            </motion.button>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
            >
              сделано <a href="https://baradusov.ru" target="_blank" rel="noopener noreferrer">нурилем</a>
              <br/>для канала <a href="https://t.me/tightpussies" target="_blank" rel="noopener noreferrer">тесные киски</a>
            </motion.p>
          </>
        ) : (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            i
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}
