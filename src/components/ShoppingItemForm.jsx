import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

const ShoppingItemForm = ({ isOpen, onClose, onSave, initialData }) => {
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
    } else {
      setFormData({
        name: '',
        quantity: 1,
        price: '',
        emoji: '🛒'
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
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
          className="fixed inset-0 z-40 bg-white dark:bg-zinc-950 flex flex-col"
        >
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center mt-safe">
            <button onClick={onClose} className="p-2 text-zinc-500"><X size={24} /></button>
            <h2 className="text-lg font-black uppercase tracking-widest">
              {initialData ? 'Editar Item' : 'Novo Item'}
            </h2>
            <button onClick={handleSubmit} className="p-2 text-verde"><Check size={24} /></button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block">Nome do Produto</label>
              <input
                type="text"
                required
                autoFocus
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Arroz, Feijão..."
                className="w-full bg-zinc-50 dark:bg-zinc-900 border-none p-4 rounded-2xl font-bold text-lg focus:ring-2 focus:ring-zinc-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block">Quantidade</label>
                <div className="flex items-center bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-1">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                    className="w-12 h-12 flex items-center justify-center font-bold text-xl active:scale-95 transition-transform"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="flex-1 bg-transparent text-center font-black text-sm focus:outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                    className="w-12 h-12 flex items-center justify-center font-bold text-xl active:scale-95 transition-transform"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block">Preço Unitário</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-xs">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border-none p-4 pl-10 rounded-2xl font-bold text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Emoji Selector */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block">Emoji</label>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {['🛒', '🍎', '🥩', '🥛', '🍞', '🥤', '🧼', '🍗', '🥬', '🍚'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, emoji })}
                    className={`text-2xl p-3 rounded-xl transition-all ${formData.emoji === emoji ? 'bg-zinc-100 dark:bg-zinc-800 scale-110' : 'bg-transparent'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-5 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all mt-8"
            >
              {initialData ? 'Salvar Alterações' : 'Adicionar à Lista'}
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShoppingItemForm;
