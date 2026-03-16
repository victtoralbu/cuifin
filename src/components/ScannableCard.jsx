import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, User, Paperclip, ChevronDown, ChevronUp, Edit, Trash2, CheckCircle } from 'lucide-react';

const MOCK_AVATARS = {
  '2': 'https://ui-avatars.com/api/?name=Joao&background=F39C12&color=fff',
  '3': 'https://ui-avatars.com/api/?name=Maria&background=E74C3C&color=fff',
  '4': 'https://ui-avatars.com/api/?name=Lucas&background=3498DB&color=fff',
};

const ScannableCard = ({ transaction, onUpdate, onDelete, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = React.useRef(null);

  const getStatusColor = (dueDate) => {
    if (!dueDate || transaction.status === 'pago') return 'status-gray';
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return 'status-vermelho';
    if (diff <= 2) return 'status-laranja';
    return 'status-gray';
  };

  const handleDragEnd = (event, info) => {
    if (info.offset.x < -100) {
      if (window.navigator.vibrate) window.navigator.vibrate([10, 30]);
      onDelete(transaction.id);
    } else if (info.offset.x > 100) {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      onEdit(transaction);
    }
  };

  return (
    <div className={`relative ${isExpanded ? 'col-span-2' : ''}`}>
      <div className="absolute inset-0 flex items-center justify-between px-6 rounded-xl overflow-hidden opacity-50 bg-zinc-100 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2 text-zinc-400">
          <Edit size={24} />
          <span className="text-[10px] font-bold uppercase">Editar</span>
        </div>
        <div className="flex items-center gap-2 text-vermelho">
          <span className="text-[10px] font-bold uppercase">Excluir</span>
          <Trash2 size={24} />
        </div>
      </div>

      <motion.div 
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.95 }}
        onContextMenu={(e) => { 
          e.preventDefault(); 
          if (window.navigator.vibrate) window.navigator.vibrate(100);
          setShowMenu(true);
        }}
        className={`scannable-card relative z-10 ${transaction.status === 'pago' ? 'bg-zinc-950 dark:bg-black border-zinc-900' : getStatusColor(transaction.dueDate)} transition-all duration-300 overflow-hidden h-full`}
      >
        <AnimatePresence>
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
            >
              <button 
                onClick={() => { setShowMenu(false); onEdit(transaction); }}
                className="flex items-center gap-3 font-bold text-zinc-900 dark:text-white"
              >
                <Edit size={20} /> Editar Item
              </button>
              <button 
                onClick={() => { setShowMenu(false); onDelete(transaction.id); }}
                className="flex items-center gap-3 font-bold text-vermelho"
              >
                <Trash2 size={20} /> Excluir permanentemente
              </button>
              <button className="text-xs font-bold text-zinc-400 mt-2 uppercase">Fechar</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className={`flex flex-col gap-1 cursor-pointer h-full p-3 ${transaction.status === 'pago' ? 'opacity-40' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex justify-between items-start">
            <span className={`text-3xl ${transaction.status === 'pago' ? 'grayscale opacity-50' : ''}`}>{transaction.emoji || '💰'}</span>
            <div className="text-right">
              <p className={`font-black text-sm ${transaction.status === 'pago' ? 'text-zinc-500 line-through' : (transaction.type === 'receita' ? 'text-verde' : (getStatusColor(transaction.dueDate) === 'status-vermelho' ? 'text-vermelho' : 'text-zinc-900 dark:text-zinc-100'))}`}>
                {transaction.type === 'receita' ? '+' : ''} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              {isExpanded ? <ChevronUp size={14} className="ml-auto mt-1" /> : <ChevronDown size={14} className="ml-auto mt-1" />}
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-start gap-2">
              <p className={`font-bold text-base leading-tight flex-1 ${transaction.status === 'pago' ? 'text-zinc-500 line-through' : 'text-zinc-900 dark:text-zinc-100'} line-clamp-1`}>
                {transaction.title}
              </p>
              {transaction.status === 'pago' && <CheckCircle className="text-verde flex-shrink-0" size={16} />}
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-[11px] font-medium text-zinc-500">
                {transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString('pt-BR') : 'Sem data'}
              </p>
              {transaction.splitWith?.length > 0 && (
                <div className="flex -space-x-1.5 overflow-hidden">
                  {transaction.splitWith.map(id => (
                    <img key={id} className="inline-block h-4 w-4 rounded-full ring-1 ring-white dark:ring-zinc-900 object-cover" src={MOCK_AVATARS[id]} alt="" />
                  ))}
                  <span className="text-[8px] font-black text-orange-500 ml-1 mt-0.5">÷</span>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Tipo</label>
                    <div className="text-sm font-black capitalize">
                      {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Parcelas</label>
                    <div className="text-sm font-black">
                      <span>{transaction.installments || '1/1'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Divisão</label>
                  <div className="flex items-center gap-2">
                    {transaction.splitWith?.length ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                           {transaction.splitWith.map(id => (
                            <img key={id} className="h-6 w-6 rounded-full border border-white dark:border-zinc-900 shadow-sm object-cover" src={MOCK_AVATARS[id]} alt="" />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-orange-500 italic">Dividido igualmente</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-zinc-500">Uso pessoal</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    className="flex-1 bg-verde text-white py-3 rounded-2xl font-black text-base active:opacity-80 transition-all shadow-lg shadow-verde/20"
                    onClick={() => onUpdate({ ...transaction, status: 'pago' })}
                  >
                    Marcar como Pago
                  </button>
                  <button 
                    className="px-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 py-3 rounded-2xl transition-colors active:bg-zinc-200"
                  >
                    <Paperclip size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ScannableCard;
