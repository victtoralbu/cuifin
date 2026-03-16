import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus } from 'lucide-react';

const ShoppingItemForm = ({ isOpen, onClose, onSave, initialData }) => {
  const [showCustomEmoji, setShowCustomEmoji] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    price: '',
    emoji: '🛒'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        price: initialData.price.toString()
      });
      setShowCustomEmoji(!['🛒', '🍎', '🥩', '🥛', '🍞', '🥤', '🧼', '🍗', '🥬', '🍚'].includes(initialData.emoji));
    } else {
      setFormData({
        name: '',
        quantity: 1,
        price: '',
        emoji: '🛒'
      });
      setShowCustomEmoji(false);
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    onSave({
      ...formData,
      price: parseFloat(formData.price) || 0,
      quantity: parseInt(formData.quantity) || 1
    });
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
          className="fixed inset-0 z-[60] bg-white dark:bg-zinc-950 flex flex-col"
        >
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center mt-safe">
            <button onClick={onClose} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-3xl transition-colors"><X size={24} /></button>
            <h2 className="text-sm font-black uppercase tracking-widest opacity-40">
              {initialData ? 'Editar Item' : 'Novo Item'}
            </h2>
            <button onClick={handleSubmit} className="p-2 text-verde hover:bg-verde/10 rounded-2xl transition-colors"><Check size={24} /></button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-10 pb-32">
            {/* Name Input */}
            <div className="space-y-2 text-center">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-widest italic block">O que você vai comprar?</label>
              <input
                type="text"
                required
                autoFocus
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Arroz, Feijão..."
                className="w-full bg-transparent border-none p-4 text-center font-black text-3xl focus:outline-none placeholder:text-zinc-100 dark:placeholder:text-zinc-900 tracking-tighter"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Quantity */}
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black text-zinc-400 tracking-widest block text-center">Quantidade</label>
                <div className="flex items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-2 border border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                    className="w-12 h-12 flex items-center justify-center font-black text-2xl active:scale-90 transition-transform bg-white dark:bg-zinc-800 rounded-2xl shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-12 bg-transparent text-center font-black text-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                    className="w-12 h-12 flex items-center justify-center font-black text-2xl active:scale-90 transition-transform bg-white dark:bg-zinc-800 rounded-2xl shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black text-zinc-400 tracking-widest block text-center">Preço Unitário</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-zinc-400 text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 pl-14 rounded-3xl font-black text-xl text-center focus:ring-2 focus:ring-verde/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Emoji Selection */}
            <div className="space-y-6">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-widest block text-center">Identificar por</label>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-1">
                {['🛒', '🍎', '🥩', '🥛', '🍞', '🥤', '🧼', '🍗', '🥬', '🍚'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => { setFormData({ ...formData, emoji }); setShowCustomEmoji(false); }}
                    className={`text-3xl flex-shrink-0 p-3 rounded-2xl transition-all ${formData.emoji === emoji && !showCustomEmoji ? 'bg-zinc-100 dark:bg-zinc-800 scale-110 shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowCustomEmoji(true)}
                  className={`text-xl flex-shrink-0 w-14 h-14 rounded-2xl transition-all flex items-center justify-center border-2 border-dashed ${showCustomEmoji ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}
                >
                  <Plus size={24} />
                </button>
              </div>

              <AnimatePresence>
                {showCustomEmoji && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex justify-center pt-2"
                  >
                    <div className="relative group">
                      <input
                        type="text"
                        maxLength={2}
                        placeholder="🥑"
                        value={['🛒', '🍎', '🥩', '🥛', '🍞', '🥤', '🧼', '🍗', '🥬', '🍚'].includes(formData.emoji) ? '' : formData.emoji}
                        onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                        className="w-20 bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl font-black text-3xl text-center focus:border-zinc-900 dark:focus:border-white transition-all shadow-lg"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShoppingItemForm;
