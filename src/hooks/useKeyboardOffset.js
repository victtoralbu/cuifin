import { useState, useEffect } from 'react';

/**
 * useKeyboardOffset
 * Detects the software keyboard height on mobile (especially iOS) using the
 * visualViewport API. Returns the number of pixels the keyboard is occupying
 * so that fixed/absolute containers can be shifted up accordingly.
 */
const useKeyboardOffset = () => {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // The difference between the layout viewport height and the visual
      // viewport height is roughly the keyboard height.
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update(); // initial check

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return keyboardOffset;
};

export default useKeyboardOffset;
