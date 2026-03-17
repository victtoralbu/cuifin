import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, Trash2, Calendar } from 'lucide-react';

const NotificationModal = ({ isOpen, onClose, notifications, onRespond }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[101] bg-white dark:bg-zinc-950 rounded-t-[3rem] p-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8 px-2">
              <div className="flex items-center gap-3">
                <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-2xl">
                  <Bell className="text-zinc-900 dark:text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter">Notificações</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Acompanhe seus convites e alertas</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-2xl text-zinc-500 active:scale-95 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {notifications.length > 0 ? (
                notifications.map(n => (
                  <div key={n.id} className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 p-5 rounded-[2rem] flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full border-2 border-orange-500/20 p-0.5">
                        <img 
                          src={n.sender.avatar || `https://ui-avatars.com/api/?name=${n.sender.name}&background=random`} 
                          className="w-full h-full rounded-full object-cover"
                          alt=""
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                          {n.type === 'shopping_invite' && (
                            <>
                              <span className="text-orange-500">{n.sender.name}</span> convidou você para dividir uma lista de compras!
                            </>
                          )}
                          {n.type === 'transaction_split' && (
                            <>
                              <span className="text-orange-500">{n.sender.name}</span> dividiu uma conta de <span className="text-verde">R$ {n.data.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> ({n.data.title}) com você!
                            </>
                          )}
                          {n.type === 'group_transaction' && (
                            <>
                              <span className="text-orange-500">{n.sender.name}</span> adicionou uma conta de <span className="text-verde">R$ {n.data.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> em um grupo com você!
                            </>
                          )}
                        </p>
                        <p className="text-[10px] font-medium text-zinc-500 mt-1 uppercase tracking-tighter">
                          {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {n.type === 'shopping_invite' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onRespond(n.id, 'accepted')}
                          className="flex-1 bg-verde text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-verde/20 flex items-center justify-center gap-2"
                        >
                          <Check size={16} /> Aceitar
                        </button>
                        <button 
                          onClick={() => onRespond(n.id, 'rejected')}
                          className="flex-1 bg-zinc-100 dark:bg-zinc-900 text-vermelho py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <X size={16} /> Recusar
                        </button>
                      </div>
                    )}
                    {n.type !== 'shopping_invite' && (
                      <button 
                        onClick={() => onRespond(n.id, 'read')}
                        className="w-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        OK, entendi
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-8 text-center bg-zinc-50/50 dark:bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-zinc-100 dark:border-zinc-800/50">
                   <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-[1.5rem] flex items-center justify-center shadow-xl mb-6 border border-zinc-50 dark:border-zinc-700">
                    <Bell size={24} className="text-zinc-300" />
                  </div>
                  <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Sem novas notificações</h3>
                </div>
              )}
            </div>
            
            <button 
              onClick={onClose}
              className="w-full mt-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 hover:text-zinc-500 transition-colors"
            >
              Fechar Central
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationModal;
