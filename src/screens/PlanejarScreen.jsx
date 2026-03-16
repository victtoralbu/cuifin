import React, { useState } from 'react';
import ScannableCard from '../components/ScannableCard';
import TransactionForm from '../components/TransactionForm';
import { Plus, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PlanejarScreen = ({ transactions, loading, onAdd, onUpdate, onDelete }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedMonth, setSelectedMonth] = useState(null); // focused month key

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
    allTransactions.forEach(t => {
      const date = new Date(t.dueDate || Date.now());
      const key = `${date.toLocaleString('pt-BR', { month: 'long' })} ${date.getFullYear()}`;
      if (!months[key]) months[key] = { name: monthCapitalize(date.toLocaleString('pt-BR', { month: 'long' })), year: date.getFullYear(), total: 0, items: [] };
      
      const shareCount = (t.splitWith?.length || 0) + 1;
      const amount = t.amount / shareCount;
      const impact = t.type === 'receita' ? t.amount : -amount;
      
      // We still want the "impact" to reflect what's left to pay or what was planned
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

    return months;
  };

  const monthCapitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const monthsData = getAllMonths();
  const currentGrouped = selectedMonth ? { [selectedMonth]: monthsData[selectedMonth] } : monthsData;

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
    if (editingItem) onUpdate(data);
    else onAdd(data);
    setEditingItem(null);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  if (viewMode === 'calendar') {
    return (
      <div className="p-4">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setViewMode('list')} className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-black tracking-tight">Selecionar Mês</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {Object.entries(monthsData).map(([key, data]) => (
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
                <p className={`text-sm font-black text-verde`}>
                  R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-[8px] font-bold text-zinc-400 uppercase mt-1 tracking-tighter">Impacto no Saldo</p>
              </div>
            </motion.button>
          ))}
          <button className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center h-40 text-zinc-400">
            <Plus size={24} className="mb-2" />
            <span className="text-[10px] font-black uppercase">Novo Mês</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 relative min-h-[calc(100vh-160px)]">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black tracking-tight">{selectedMonth ? monthsData[selectedMonth]?.name : 'Planejar'}</h2>
          {selectedMonth && <button onClick={() => setSelectedMonth(null)} className="text-[10px] font-black uppercase text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-lg">Ver tudo</button>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 p-2.5 rounded-full active:scale-95 transition-all"
          >
            <CalendarIcon size={22} />
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-2.5 rounded-full active:scale-95 transition-all"
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
                  <p className="font-black text-verde text-sm">
                    R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {data.items.map(t => (
                  <ScannableCard
                    key={t.id}
                    transaction={t}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onEdit={openEditForm}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="text-zinc-300" size={32} />
            </div>
            <p className="text-zinc-400 font-bold">Nenhum item para este período</p>
          </div>
        )}
      </div>

      {/* Sticky Balance Footer - Adjusted margin and background */}
      <div className="fixed bottom-24 left-4 right-4 z-40">
        <div className="bg-zinc-900/90 dark:bg-zinc-800/90 backdrop-blur-lg border border-white/10 dark:border-zinc-700 p-4 rounded-2xl shadow-2xl flex justify-between items-center text-white">
          <div>
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-tighter">Saldo Mensal</p>
            <p className={`text-xl font-black ${balance >= 0 ? 'text-verde' : 'text-vermelho'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-[10px] font-bold uppercase ${balance >= 0 ? 'text-verde' : 'text-vermelho'}`}>
              {balance >= 0 ? 'Sobra' : 'Falta'}
            </p>
            <div className="flex gap-2 mt-1">
              <span className="text-[9px] font-bold text-zinc-400 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                + R$ {totals.income.toFixed(0)}
              </span>
              <span className="text-[9px] font-bold text-zinc-400 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                - R$ {totals.expense.toFixed(0)}
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
    </div>
  );
};

export default PlanejarScreen;
