import React, { useState, useEffect } from 'react';
import ScannableCard from '../components/ScannableCard';
import TransactionForm from '../components/TransactionForm';
import SwipeTutorial from '../components/SwipeTutorial';
import { Plus, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { dataService } from '../lib/dataService';

const PlanejarScreen = ({ transactions, loading, onAdd, onUpdate, onDelete }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedMonth, setSelectedMonth] = useState(null); // null means all visible months
  const [showTutorial, setShowTutorial] = useState(false);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const data = await dataService.getFriends();
        setFriends(data);
      } catch (e) {
        console.error('Error fetching friends:', e);
      }
    };
    fetchFriends();
  }, []);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-verde border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // No longer filtering only pending
  const allTransactions = transactions;

  // Group by month/year for data processing
  const getAllMonths = () => {
    const months = {};
    const now = new Date();
    // Pre-populate a 6-month window starting from the current month
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthLabel = d.toLocaleString('pt-BR', { month: 'long' }).toLowerCase();
      const year = d.getFullYear();
      const key = `${monthLabel} ${year}`;
      months[key] = { 
        name: monthCapitalize(monthLabel), 
        year: year, 
        total: 0, 
        items: [] 
      };
    }

    const monthNames = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    allTransactions.forEach(t => {
      // Parse YYYY-MM-DD string as local date by appending time
      const date = t.dueDate ? new Date(t.dueDate + 'T12:00:00') : new Date();
      const monthLabel = date.toLocaleString('pt-BR', { month: 'long' }).toLowerCase();
      const year = date.getFullYear();
      const key = `${monthLabel} ${year}`;

      if (!months[key]) {
        months[key] = { 
          name: monthCapitalize(monthLabel), 
          year: year, 
          total: 0, 
          items: [] 
        };
      }

      const shareCount = (t.splitWith?.length || 0) + 1;
      const amount = t.amount / shareCount;
      const impact = t.type === 'receita' ? t.amount : -amount;

      months[key].total += impact;
      months[key].items.push(t);
    });

    // Sort items within each month: pending first, then paid
    Object.keys(months).forEach(key => {
      months[key].items.sort((a, b) => {
        if (a.status === 'pendente' && b.status === 'pago') return -1;
        if (a.status === 'pago' && b.status === 'pendente') return 1;
        return 0;
      });
    });

    // Return sorted keys (chronological) 
    // This is tricky with strings like "janeiro 2026". Let's sort by date value.
    const sortedKeys = Object.keys(months).sort((a, b) => {
      const [mA, yA] = a.split(' ');
      const [mB, yB] = b.split(' ');
      const dA = new Date(parseInt(yA), monthNames.indexOf(mA));
      const dB = new Date(parseInt(yB), monthNames.indexOf(mB));
      return dA - dB;
    });

    const sortedMonths = {};
    sortedKeys.forEach(k => sortedMonths[k] = months[k]);
    return sortedMonths;
  };

  const monthCapitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const monthsData = getAllMonths();
  
  const getVisibleGroups = () => {
    if (selectedMonth) {
      return monthsData[selectedMonth] ? { [selectedMonth]: monthsData[selectedMonth] } : {};
    }

    // Default view: 6-month window starting from current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 6, 0); // End of the 6th month

    const filtered = {};
    Object.entries(monthsData).forEach(([key, data]) => {
      const [m, y] = key.split(' ');
      const monthNames = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];
      const monthIdx = monthNames.indexOf(m.toLowerCase());
      const year = parseInt(y);
      const checkDate = new Date(year, monthIdx, 1);

      if (checkDate >= startDate && checkDate <= endDate) {
        filtered[key] = data;
      }
    });
    return filtered;
  };

  const currentGrouped = getVisibleGroups();

  // Compute totals for current footer
  const visibleTransactions = selectedMonth ? monthsData[selectedMonth]?.items || [] : allTransactions;
  const totals = visibleTransactions.reduce((acc, t) => {
    const shareCount = (t.splitWith?.length || 0) + 1;
    const amount = t.amount / shareCount;
    if (t.type === 'receita') acc.income += t.amount;
    else acc.expense += amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  const handleSave = (data) => {
    if (editingItem) {
      onUpdate(data);
    } else {
      onAdd(data);
      // Check if tutorial should be shown
      const hasSeenTutorial = localStorage.getItem('cuifin_swipe_tutorial_seen');
      if (!hasSeenTutorial) {
        setShowTutorial(true);
      }
    }
    setEditingItem(null);
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem('cuifin_swipe_tutorial_seen', 'true');
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      onDelete(id);
    }
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  if (viewMode === 'calendar') {
    return (
      <div className="p-4 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setViewMode('list')} className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl active:scale-95 transition-all">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-black tracking-tight">Selecionar Mês</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {Object.entries(monthsData)
            .filter(([_, data]) => data.items.length > 0)
            .map(([key, data]) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedMonth(key);
                setViewMode('list');
              }}
              className="bg-zinc-900 dark:bg-zinc-800 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-left shadow-lg flex flex-col justify-between h-40 group active:scale-95 transition-all text-white"
            >
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">{data.year}</p>
                <h3 className="text-lg font-black">{data.name}</h3>
              </div>
              <div>
                <p className={`text-sm font-black ${data.total >= 0 ? 'text-verde' : 'text-vermelho'}`}>
                  R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[8px] font-bold text-zinc-400 uppercase mt-1 tracking-tighter">Saldo Mensal</p>
              </div>
            </motion.button>
          ))}
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center h-40 text-zinc-400 active:scale-95 transition-all"
          >
            <Plus size={24} className="mb-2" />
            <span className="text-[10px] font-black uppercase">Novo Mês</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 pt-0 relative min-h-[calc(100vh-160px)]">
      {/* Sticky Header */}
      {/* Sticky Header - Improved to cover gap */}
      <div className="sticky top-0 z-30 bg-zinc-50/95 dark:bg-black/95 backdrop-blur-xl -mx-4 px-4 pt-24 pb-2 mb-4 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-end transition-all">
        <div className="flex items-center gap-2 pb-1">
          <h2 className="text-2xl font-black tracking-tight">
            {selectedMonth ? (monthsData[selectedMonth]?.name || monthCapitalize(selectedMonth.split(' ')[0])) : 'Planejar'}
          </h2>
          {selectedMonth && <button onClick={() => setSelectedMonth(null)} className="text-[10px] font-black uppercase text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-lg">Ver tudo</button>}
        </div>
        <div className="flex gap-2 pb-1">
          <button
            onClick={() => setViewMode('calendar')}
            className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 p-3 rounded-2xl active:scale-95 transition-all shadow-sm border border-zinc-200 dark:border-zinc-800"
          >
            <CalendarIcon size={22} />
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-3 rounded-2xl active:scale-95 transition-all shadow-xl shadow-zinc-900/10"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      <div className="pb-40 space-y-10">
        {Object.entries(currentGrouped).length > 0 ? (
          Object.entries(currentGrouped).map(([month, data]) => (
            <div key={month}>
              {!selectedMonth && (
                <div className="bg-zinc-900 dark:bg-zinc-800 text-white p-3 px-4 rounded-xl flex justify-between items-center mb-4 shadow-lg">
                  <h3 className="font-bold capitalize text-sm tracking-wide">{month}</h3>
                  <p className={`font-black text-sm ${data.total >= 0 ? 'text-verde' : 'text-vermelho'}`}>
                    R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {data.items.map(t => (
                  <ScannableCard
                    key={t.id}
                    transaction={t}
                    friends={friends}
                    onUpdate={onUpdate}
                    onDelete={handleDelete}
                    onEdit={openEditForm}
                  />
                ))}

                {/* Dashed Add New Item Card */}
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-zinc-50/50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl flex flex-col items-center justify-center gap-2 opacity-60 hover:opacity-100 active:scale-95 transition-all text-zinc-400 h-full min-h-[120px]"
                >
                  <Plus size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Novo Item</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <button
              onClick={() => setIsFormOpen(true)}
              className="w-16 h-16 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-4 active:scale-95 transition-all shadow-xl shadow-verde/10 ring-4 ring-zinc-50 dark:ring-zinc-900"
            >
              <Plus size={32} />
            </button>
            <p className="text-zinc-400 font-bold">Nenhum item para este período</p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="text-[10px] font-black uppercase text-verde mt-2 tracking-widest"
            >
              Adicionar Novo
            </button>
          </div>
        )}
      </div>

      {/* Sticky Balance Footer - Adjusted margin and background */}
      <div className="fixed bottom-24 left-4 right-4 z-40">
        <div className="bg-zinc-900/90 dark:bg-zinc-800/90 backdrop-blur-lg border border-white/10 dark:border-zinc-700 p-4 rounded-2xl shadow-2xl flex justify-between items-center text-white">
          <div>
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-tighter">Saldo</p>
            <p className={`text-xl font-black ${balance >= 0 ? 'text-verde' : 'text-vermelho'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-[10px] font-bold uppercase ${balance >= 0 ? 'text-verde' : 'text-vermelho'}`}>
              {balance >= 0 ? 'Sobra' : 'Falta'}
            </p>
            <div className="flex gap-2 mt-1">
              <span className="text-[9px] font-bold text-zinc-400 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                + R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] font-bold text-zinc-400 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                - R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={editingItem}
      />
      {showTutorial && <SwipeTutorial onComplete={handleTutorialComplete} />}
    </div>
  );
};

export default PlanejarScreen;
