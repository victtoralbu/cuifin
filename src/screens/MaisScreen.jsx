import React, { useState, useEffect } from 'react';
import { Users, History, ArrowLeft, Plus, Share2, Mail, Edit, Trash2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SimpleEntryForm from '../components/SimpleEntryForm';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../lib/dataService';

const calculateSmartTransfers = (members) => {
  if (!members || members.length <= 1) return [];
  const avg = members.reduce((sum, m) => sum + m.paid, 0) / members.length;
  const balances = members.map(m => ({ name: m.name, balance: m.paid - avg }));
  
  const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
  
  const transfers = [];
  let i = 0, j = 0;
  
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].balance, creditors[j].balance);
    if (amount > 0.01) {
      transfers.push({ from: debtors[i].name, to: creditors[j].name, amount });
    }
    
    debtors[i].balance += amount;
    creditors[j].balance -= amount;
    
    if (debtors[i].balance === 0) i++;
    if (creditors[j].balance === 0) j++;
  }
  
  return transfers;
};

const InviteModal = ({ isOpen, onClose, user }) => {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}?invite=${user?.id}`;
  const message = `Ei! Comecei a usar o CuiFin para organizar minhas contas e queria te convidar. Clica aqui pra gente dividir os gastos: ${inviteLink}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
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
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-2xl"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-verde/10 text-verde rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Share2 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2">Convidar Amigo</h3>
              <p className="text-sm text-zinc-500 font-medium">Compartilhe o link para que seu amigo seja adicionado automaticamente à sua lista.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleWhatsApp}
                className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-green-500/20"
              >
                Enviar no WhatsApp
              </button>
              
              <button
                onClick={handleCopy}
                className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                {copied ? <Check size={18} className="text-verde" /> : <Copy size={18} />}
                {copied ? 'Mensagem Copiada!' : 'Copiar Link Convite'}
              </button>
            </div>

            <button 
              onClick={onClose}
              className="w-full mt-6 py-2 text-zinc-400 font-bold text-xs uppercase tracking-tighter"
            >
              Fechar
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const MaisScreen = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [formConfig, setFormConfig] = useState({ title: '', onSave: () => {}, initialData: null, friends: [] });
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await dataService.getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const data = await dataService.getFriends();
      setFriends(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchFriends();
    }
  }, [user]);

  const openForm = (title, onSave, initialData = null, availableFriends = [], placeholder = "Nome do Membro...") => {
    setFormConfig({ title, onSave, initialData, friends: availableFriends, placeholder });
    setIsFormOpen(true);
  };

  const handleSave = (value) => {
    formConfig.onSave(value);
    setIsFormOpen(false);
  };

  const addGroup = async (name) => {
    try {
      await dataService.addGroup(name);
      fetchGroups();
    } catch (e) { console.error(e); }
  };

  const updateGroup = async (id, newName) => {
    try {
      await dataService.updateGroup(id, newName);
      fetchGroups();
    } catch (e) { console.error(e); }
  };

  const deleteGroup = async (id) => {
    if (window.navigator.vibrate) window.navigator.vibrate([10, 30]);
    try {
      await dataService.deleteGroup(id);
      fetchGroups();
    } catch (e) { console.error(e); }
  };

  const addMember = async (groupId, memberData) => {
    try {
      if (typeof memberData === 'string') {
        await dataService.addGroupMember(groupId, { name: memberData });
      } else {
        await dataService.addGroupMember(groupId, { userId: memberData.id, name: memberData.name });
      }
      fetchGroups();
    } catch (e) { 
      console.error(e);
      alert('Erro ao adicionar membro: ' + e.message);
    }
  };

  const removeMember = async (memberId) => {
    try {
      await dataService.removeGroupMember(memberId);
      fetchGroups();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="px-4 pb-4 pt-0">
      {/* HEADER SECTION - Improved to cover gap */}
      <div className="sticky top-0 z-30 bg-zinc-50/95 dark:bg-black/95 backdrop-blur-xl -mx-4 px-4 pt-24 pb-2 mb-4 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-end transition-all">
        <div className="pb-1">
          <h2 className="text-3xl font-black italic tracking-tighter transition-all">Grupos</h2>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Social & Divisões</p>
        </div>
        <div className="flex gap-3 pb-1">
          <button 
            onClick={() => setIsInviteOpen(true)}
            className="bg-zinc-100 dark:bg-zinc-900 text-verde p-3 rounded-2xl active:scale-90 transition-all shadow-sm border border-zinc-200 dark:border-zinc-800"
          >
            <Mail size={22} />
          </button>
          <button 
            onClick={() => openForm('Novo Grupo', addGroup, null, [], 'Nome do Grupo...')}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-3 rounded-2xl active:scale-90 transition-all shadow-xl shadow-zinc-500/10"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* FRIENDS SECTION */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-black uppercase text-zinc-400 tracking-widest">Meus Amigos</p>
          <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600 uppercase">{friends.length} cadastrados</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {friends.length > 0 ? (
            friends.map(friend => (
              <div key={friend.id} className="flex flex-col items-center gap-2 min-w-[70px]">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-50 dark:border-zinc-800 p-0.5 overflow-hidden shadow-sm">
                  <img src={friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`} alt="" className="w-full h-full object-cover rounded-xl" />
                </div>
                <span className="text-[10px] font-black text-center truncate w-full opacity-60 uppercase tracking-tighter">{friend.name}</span>
              </div>
            ))
          ) : (
            <div className="w-full py-6 text-center bg-zinc-50/50 dark:bg-zinc-900/50 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-loose">
                 Nenhum amigo ainda.<br/>Convide alguém para começar!
               </p>
            </div>
          )}
        </div>
      </section>

      {/* GROUPS SECTION */}
      <div className="space-y-6 pb-20">
        <div className="flex border-b border-zinc-50 dark:border-zinc-800 pb-2">
          <p className="text-xs font-black uppercase text-zinc-400 tracking-widest">Meus Grupos</p>
        </div>

        {loading && <div className="text-center py-10 opacity-50">Sincronizando grupos...</div>}

        <div className="space-y-4">
          {groups.length > 0 ? (
            groups.map(group => (
              <div key={group.id} className="relative">
                <div className="absolute inset-0 flex items-center justify-between px-6 rounded-2xl opacity-40">
                  <Edit size={24} className="text-zinc-400" />
                  <Trash2 size={24} className="text-vermelho" />
                </div>

                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragEnd={(e, info) => {
                    if (info.offset.x < -100) deleteGroup(group.id);
                    else if (info.offset.x > 100) openForm('Editar Grupo', (name) => updateGroup(group.id, name), group.name);
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm relative z-10"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl tracking-tight">{group.name}</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex border-b border-zinc-50 dark:border-zinc-800 pb-1">
                      <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Integrantes</p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {group.members?.map(m => (
                        <div key={m.id} className="bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                          <span className="opacity-80 uppercase tracking-tighter">{m.name || 'Usuário'}</span>
                          {m.user_id !== user?.id && (
                            <button onClick={() => removeMember(m.id)} className="text-zinc-400 hover:text-vermelho active:scale-90 transition-all font-black">
                              <Plus size={14} className="rotate-45" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const notInGroup = friends.filter(f => !group.members?.some(m => m.user_id === f.id));
                          openForm('Novo Membro', (data) => addMember(group.id, data), null, notInGroup);
                        }}
                        className="bg-verde text-white h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-verde/20 active:scale-95 transition-all"
                      >
                        + Membro
                      </button>
                    </div>

                    <div className="pt-6 border-t border-zinc-50 dark:border-zinc-800">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest text-verde/60">Saldos Sugeridos</p>
                        <Share2 size={14} className="text-zinc-300" />
                      </div>
                      {calculateSmartTransfers(group.members || []).length > 0 ? (
                        <div className="space-y-2">
                          {calculateSmartTransfers(group.members).map((t, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100/50 dark:border-zinc-700/30">
                              <span className="text-xs font-bold opacity-70 italic">{t.from} ➔ {t.to}</span>
                              <span className="font-black text-verde text-sm">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest opacity-40 bg-zinc-50/50 dark:bg-zinc-800/50 p-4 rounded-2xl text-center italic">✨ Contas Equilibradas</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <div className="text-[9px] text-zinc-400 font-black uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg">Membros: {group.members?.length || 0}</div>
                    <div className="text-right">
                      <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest mb-0.5 opacity-50">Despesas Totais</p>
                      <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">R$ {group.members?.reduce((s, m) => s + parseFloat(m.paid || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center opacity-30 select-none">
              <Users size={48} className="mx-auto mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhum grupo ainda</p>
            </div>
          )}
        </div>
      </div>
      
      <SimpleEntryForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={formConfig.title}
        onSave={handleSave}
        initialData={formConfig.initialData}
        friends={formConfig.friends || []}
        placeholder={formConfig.placeholder}
      />
      <InviteModal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
        user={user} 
      />
    </div>
  );
};

export default MaisScreen;
