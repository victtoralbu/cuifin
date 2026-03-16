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

const MaisScreen = ({ forceView }) => {
  const [view, setView] = useState(forceView || 'menu');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [formConfig, setFormConfig] = useState({ title: '', onSave: () => {}, initialData: null });
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

  const openForm = (title, onSave, initialData = null) => {
    setFormConfig({ title, onSave, initialData });
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

  const menuItems = [
    { id: 'transacoes', label: 'Todas Transações', icon: <History />, color: 'text-zinc-500' },
    { id: 'invite', label: 'Convidar Amigo', icon: <Mail />, color: 'text-verde' },
  ];

  if (view === 'grupos') {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Meus Grupos</h2>
          <button 
            onClick={() => openForm('Novo Grupo', addGroup)}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-2 rounded-full active:scale-90 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>

        {loading && <div className="text-center py-10 opacity-50">Carregando grupos...</div>}

        <div className="space-y-4 pb-20">
          {groups.map(group => (
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
                  <div className="flex border-b border-zinc-50 dark:border-zinc-800 pb-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Membros do Grupo</p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {group.members?.map(m => (
                      <div key={m.id} className="bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border border-zinc-100 dark:border-zinc-700/50">
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
                      className="bg-verde text-white h-9 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-verde/20 active:scale-95 transition-all"
                    >
                      + Membro
                    </button>
                  </div>

                  <div className="pt-6 border-t border-zinc-50 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Ajustes Sugeridos</p>
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
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest opacity-50 bg-zinc-50/50 dark:bg-zinc-800/50 p-4 rounded-2xl text-center italic">✨ Saldos Equilibrados</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <div className="text-[9px] text-zinc-400 font-black uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg">Membros: {group.members?.length || 0}</div>
                  <div className="text-right">
                    <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest mb-0.5">Fundo do Grupo</p>
                    <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">R$ {group.members?.reduce((s, m) => s + parseFloat(m.paid || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
        
        <SimpleEntryForm 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={formConfig.title}
          onSave={handleSave}
          initialData={formConfig.initialData}
          friends={formConfig.friends || []}
        />
      </div>
    );
  }

  if (view === 'transacoes') {
    const allTransactions = [
      { title: 'Supermercado', amount: 340.50, date: '2026-03-15', type: 'pago' },
      { title: 'Combustível', amount: 200.00, date: '2026-03-14', type: 'pago' },
      { title: 'Restaurante', amount: 85.00, date: '2026-03-12', type: 'pago' },
    ];

    return (
      <div className="p-4">
        <button onClick={() => setView('menu')} className="mb-6 flex items-center gap-2 text-zinc-500">
          <ArrowLeft size={20} /> Voltar
        </button>
        <h2 className="text-2xl font-bold mb-6">Todas Transações</h2>
        <div className="space-y-3">
          {allTransactions.map((t, idx) => (
            <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-xl flex justify-between items-center border border-zinc-100 dark:border-zinc-800">
              <div>
                <p className="font-bold">{t.title}</p>
                <p className="text-xs text-zinc-500">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
              </div>
              <p className="font-black text-zinc-900 dark:text-zinc-100">R$ {t.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-8">Mais</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {menuItems.map(item => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (item.id === 'invite') {
                setIsInviteOpen(true);
              } else {
                setView(item.id);
              }
            }}
            className="flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800"
          >
            <div className={`p-3 rounded-full bg-zinc-50 dark:bg-zinc-800 ${item.color}`}>
              {item.icon}
            </div>
            <span className="font-bold text-sm text-center line-clamp-1">{item.label}</span>
          </motion.button>
        ))}
      </div>

      <SimpleEntryForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={formConfig.title}
        onSave={handleSave}
        initialData={formConfig.initialData}
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
