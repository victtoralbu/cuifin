import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit, Share2, Users, CheckCircle } from 'lucide-react';
import ShoppingItemForm from '../components/ShoppingItemForm';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';

const ComprasScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenuId, setShowMenuId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const { user } = useAuth();

  const fetchItems = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await dataService.getShoppingItems();
      setItems(data);
    } catch (error) {
      console.error('Error fetching shopping items:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleBought = async (item) => {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
    
    const updatedStatus = !item.bought;
    try {
      // Optimistic update
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, bought: updatedStatus } : i));
      await dataService.updateShoppingItem(item.id, { bought: updatedStatus });
    } catch (error) {
      console.error('Error toggling bought status:', error);
      fetchItems();
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingItem) {
        await dataService.updateShoppingItem(editingItem.id, data);
      } else {
        await dataService.addShoppingItem(data);
      }
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
    }
    setEditingItem(null);
  };

  const openAddForm = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const deleteItem = async (id) => {
    if (window.navigator.vibrate) window.navigator.vibrate([10, 30]);
    try {
      setItems(prev => prev.filter(item => item.id !== id));
      await dataService.deleteShoppingItem(id);
    } catch (error) {
      console.error('Error deleting item:', error);
      fetchItems();
    }
  };

  const shareList = () => {
    const listUrl = window.location.origin + '?invite=' + user?.id;
    navigator.clipboard.writeText(listUrl);
    alert('Link de convite copiado! Agora seus amigos podem entrar e compartilhar esta lista.');
    if (window.navigator.vibrate) window.navigator.vibrate(50);
  };

  const finalizeList = async () => {
    const boughtItems = items.filter(item => item.bought);
    if (boughtItems.length === 0) {
      alert('Selecione os itens que você já pegou no carrinho primeiro! 😉');
      return;
    }
    
    if (confirm(`Finalizar compra de R$ ${total.toLocaleString('pt-BR')}? Os itens marcados serão removidos da lista.`)) {
      try {
        await dataService.finalizeShoppingList();
        setItems(items.filter(item => !item.bought));
        if (window.navigator.vibrate) window.navigator.vibrate([30, 50, 30]);
      } catch (error) {
        console.error('Error finalizing list:', error);
        fetchItems();
      }
    }
  };

  const total = items
    .filter(item => item.bought)
    .reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-verde border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 relative min-h-[calc(100vh-160px)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Lista de Compras</h2>
          <div className="flex items-center gap-1.5 mt-1">
             <div className="flex -space-x-1.5 grayscale opacity-50">
               <img src={user?.avatar} className="w-4 h-4 rounded-full border border-white dark:border-zinc-950 object-cover" alt="" />
            </div>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Sua Lista</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={shareList}
            className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 p-2.5 rounded-full active:scale-90 transition-transform"
          >
            <Share2 size={20} />
          </button>
          <button 
            onClick={openAddForm}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-2.5 rounded-full active:scale-90 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-32">
        {items.map(item => (
          <div key={item.id} className="relative">
            <div className="absolute inset-0 flex items-center justify-between px-4 rounded-xl opacity-40">
              <Edit size={20} className="text-zinc-400" />
              <Trash2 size={20} className="text-vermelho" />
            </div>

            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(e, info) => {
                if (info.offset.x < -80) deleteItem(item.id);
                else if (info.offset.x > 80) openEditForm(item);
              }}
              whileTap={{ scale: 0.95 }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (window.navigator.vibrate) window.navigator.vibrate(100);
                setShowMenuId(item.id);
              }}
              onClick={() => toggleBought(item)}
              className={`scannable-card h-full relative z-10 p-4 ${item.bought ? 'status-verde opacity-60' : 'status-gray'} cursor-pointer flex flex-col justify-between`}
            >
              <AnimatePresence>
                {showMenuId === item.id && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-2"
                    onClick={(e) => { e.stopPropagation(); setShowMenuId(null); }}
                  >
                    <button 
                      onClick={() => { setShowMenuId(null); openEditForm(item); }}
                      className="flex items-center gap-2 font-bold text-xs"
                    >
                      <Edit size={14} /> Editar
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="flex items-center gap-2 font-bold text-xs text-vermelho"><Trash2 size={14} /> Excluir</button>
                    <button className="text-[8px] font-bold text-zinc-400 mt-1 uppercase">Fechar</button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between items-start mb-3">
                <span className="text-3xl">{item.emoji}</span>
                <p className={`font-black text-sm ${item.bought ? 'text-verde' : 'text-zinc-900 dark:text-zinc-100'}`}>
                  R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className={`font-bold text-base leading-tight ${item.bought ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                  {item.name}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Qtd: {item.quantity}</p>
                  {item.bought && <CheckCircle size={14} className="text-verde" />}
                </div>
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-24 left-4 right-4 p-4 bg-zinc-900/95 dark:bg-zinc-100/95 backdrop-blur-xl border border-white/10 dark:border-black/5 rounded-3xl z-30 shadow-2xl">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 tracking-widest">No Carrinho</p>
            <p className="text-xl font-black text-verde">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <button 
            onClick={finalizeList}
            className="bg-verde text-white dark:bg-verde dark:text-white px-8 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-xl shadow-verde/20"
          >
            Finalizar
          </button>
        </div>
      </div>

      <ShoppingItemForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={editingItem}
      />
    </div>
  );
};

export default ComprasScreen;
