import React, { useState, useEffect } from 'react';
import { Users, History, ArrowLeft, Plus, Share2, Mail, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SimpleEntryForm from '../components/SimpleEntryForm';

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

const MaisScreen = ({ forceView }) => {
  const [view, setView] = useState(forceView || 'menu');
  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem('cuifin_groups');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Apartamento', members: [
        { name: 'Você', paid: 1500 },
        { name: 'João', paid: 0 },
        { name: 'Maria', paid: 0 }
      ] }
    ];
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formConfig, setFormConfig] = useState({ title: '', onSave: () => {}, initialData: null });

  useEffect(() => {
    if (forceView) {
      setView(forceView);
    }
  }, [forceView]);

  useEffect(() => {
    localStorage.setItem('cuifin_groups', JSON.stringify(groups));
  }, [groups]);

  const openForm = (title, onSave, initialData = null) => {
    setFormConfig({ title, onSave, initialData });
    setIsFormOpen(true);
  };

  const handleSave = (value) => {
    formConfig.onSave(value);
    setIsFormOpen(false);
  };

  const addGroup = (name) => {
    setGroups([...groups, { id: Date.now().toString(), name, members: [{ name: 'Você', paid: 0 }] }]);
  };

  const updateGroup = (id, newName) => {
    setGroups(groups.map(g => g.id === id ? { ...g, name: newName } : g));
  };

  const deleteGroup = (id) => {
    if (window.navigator.vibrate) window.navigator.vibrate([10, 30]);
    setGroups(groups.filter(g => g.id !== id));
  };

  const addMember = (groupId, name) => {
    setGroups(groups.map(g => 
      g.id === groupId ? { ...g, members: [...g.members, { name, paid: 0 }] } : g
    ));
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

        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.id} className="relative">
              {/* Background Icons for Swipe */}
              <div className="absolute inset-0 flex items-center justify-between px-6 rounded-2xl opacity-40">
                <Edit size={24} className="text-zinc-400" />
                <Trash2 size={24} className="text-vermelho" />
              </div>

              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(e, info) => {
                  if (info.offset.x < -80) deleteGroup(group.id);
                  else if (info.offset.x > 80) openForm('Editar Grupo', (name) => updateGroup(group.id, name), group.name);
                }}
                whileTap={{ scale: 0.98 }}
                className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative z-10"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">{group.name}</h3>
                  <button 
                    onClick={() => openForm('Novo Membro', (name) => addMember(group.id, name))}
                    className="text-xs font-bold uppercase text-zinc-400 p-2"
                  >
                    + Membro
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-zinc-50 dark:border-zinc-800 pb-2">
                    <p className="text-[10px] font-bold uppercase text-zinc-400">Transferências Inteligentes</p>
                  </div>
                  {calculateSmartTransfers(group.members).length > 0 ? (
                    calculateSmartTransfers(group.members).map((t, idx) => (
                      <div key={idx} className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-medium">{t.from} ➔ {t.to}</span>
                        <span className="font-black text-verde">R$ {t.amount.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-400 italic">Saldos zerados.</p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Membros: {group.members.length}</div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase text-right">Total: R$ {group.members.reduce((s, m) => s + m.paid, 0).toFixed(2)}</div>
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
                alert('Link de convite copiado!');
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
    </div>
  );
};

export default MaisScreen;
