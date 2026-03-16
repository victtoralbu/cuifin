import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';

const SwipeTutorial = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          
          <div className="relative flex flex-col items-center gap-6">
            <div className="w-64 h-32 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden">
              <motion.div
                animate={{ 
                  x: [-40, 40, -40],
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-verde"
              >
                <MousePointer2 size={48} fill="currentColor" />
              </motion.div>
              
              <div className="absolute inset-x-4 h-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
            </div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-2xl shadow-xl"
            >
              <p className="text-sm font-black uppercase tracking-widest text-center">
                Arraste os cards para o lado<br/>
                <span className="text-[10px] opacity-60">Para editar ou excluir</span>
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SwipeTutorial;
