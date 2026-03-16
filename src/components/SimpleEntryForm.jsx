import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

const SimpleEntryForm = ({ isOpen, onClose, onSave, initialData, title = "Adicionar", friends = [] }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(typeof initialData === 'string' ? initialData : initialData.name || '');
    } else {
      setName('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  const selectFriend = (friend) => {
    onSave({ id: friend.id, name: friend.name });
    onClose();
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

          <div className="flex-1 p-6 flex flex-col justify-center gap-12 overflow-y-auto">
            {friends.length > 0 && (
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black text-zinc-400 tracking-widest block text-center italic">Amigos Sugeridos</label>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar justify-center">
                  {friends.map(f => (
                    <button
                      key={f.id}
                      onClick={() => selectFriend(f)}
                      className="flex flex-col items-center gap-2 flex-shrink-0 active:scale-90 transition-transform"
                    >
                      <div className="w-16 h-16 rounded-3xl overflow-hidden border-2 border-zinc-100 dark:border-zinc-800 p-0.5">
                        <img 
                          src={f.avatar || `https://ui-avatars.com/api/?name=${f.name}&background=random`} 
                          className="w-full h-full object-cover rounded-[22px]" 
                          alt={f.name} 
                        />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">{f.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
                <div className="relative h-px bg-zinc-100 dark:bg-zinc-900 mx-10">
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-950 px-3 text-[10px] font-black text-zinc-300 uppercase">ou digite</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2 text-center">
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do Membro..."
                  className="w-full bg-transparent border-none text-center p-4 font-black text-3xl focus:outline-none placeholder:text-zinc-100 dark:placeholder:text-zinc-900"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-5 rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-all uppercase tracking-widest"
              >
                Salvar Manualmente
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SimpleEntryForm;
