import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Mail, Plus, X, Search } from 'lucide-react';

const FriendSelectionModal = ({ isOpen, onClose, friends, onSelect, user, collaborators = [] }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInviteFriend = () => {
    const inviteLink = `${window.location.origin}?invite=${user?.id}`;
    const message = `Ei! Comecei a usar o CuiFin para organizar minhas compras e queria te convidar para compartilhar uma lista comigo. Clica aqui: ${inviteLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black mb-1">Compartilhar Lista</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Selecione um amigo para dividir</p>
              </div>
              <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="relative mb-6">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar entre seus amigos..."
                className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-verde transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 mb-6">
              {friends.length > 0 ? (
                filteredFriends.length > 0 ? (
                  filteredFriends.map(friend => {
                    const isCollaborator = collaborators.some(c => c.id === friend.id);
                    return (
                      <button
                        key={friend.id}
                        onClick={() => onSelect(friend, isCollaborator)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border active:scale-[0.98] transition-all ${
                          isCollaborator 
                            ? 'bg-vermelho/5 border-vermelho/10 hover:bg-vermelho/10' 
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                            <img src={friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{friend.name}</p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase truncate max-w-[150px]">{friend.email}</p>
                          </div>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          isCollaborator 
                            ? 'bg-vermelho text-white' 
                            : 'bg-verde/10 text-verde'
                        }`}>
                          {isCollaborator ? <X size={18} /> : <Plus size={18} />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-10 opacity-40 italic text-sm">Nenhum amigo encontrado</div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-zinc-50 dark:bg-zinc-800/30 rounded-[2rem] border-2 border-dashed border-zinc-100 dark:border-zinc-800">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                    <Users size={32} className="text-zinc-400" />
                  </div>
                  <h4 className="text-base font-black mb-2 uppercase tracking-tighter">Nenhum amigo ainda</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                    Você ainda não tem amigos conectados. Envie um convite para começar a compartilhar!
                  </p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-[10px] font-bold text-zinc-400 text-center uppercase tracking-widest">Seu amigo ainda não está no CuiFin?</p>
              <p className="text-[10px] font-bold text-zinc-400 text-center uppercase tracking-widest">Envie um convite!</p>
            </div>

            <button
              onClick={handleInviteFriend}
              className="w-full bg-verde text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-verde/20"
            >
              <Mail size={18} />
              Enviar Convite
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FriendSelectionModal;
