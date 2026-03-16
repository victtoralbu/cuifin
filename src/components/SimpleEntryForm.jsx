import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

const SimpleEntryForm = ({ isOpen, onClose, onSave, initialData, title = "Adicionar" }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(typeof initialData === 'string' ? initialData : initialData.name || '');
    } else {
      setName('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col"
        >
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center mt-safe">
            <button onClick={onClose} className="p-2 text-zinc-500"><X size={24} /></button>
            <h2 className="text-lg font-black uppercase tracking-widest">{title}</h2>
            <button onClick={handleSubmit} className="p-2 text-verde"><Check size={24} /></button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 p-6 flex flex-col justify-center gap-8">
            <div className="space-y-4 text-center">
              <label className="text-xs uppercase font-black text-zinc-400 tracking-widest block">Insira o Nome</label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="..."
                className="w-full bg-transparent border-none text-center p-4 font-black text-4xl focus:outline-none placeholder:text-zinc-100 dark:placeholder:text-zinc-900"
              />
            </div>

            <button
              type="submit"
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-5 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all"
            >
              Confirmar
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SimpleEntryForm;
