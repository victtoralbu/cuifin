import React, { useState, useEffect } from 'react';
import ScannableCard from '../components/ScannableCard';
import TransactionForm from '../components/TransactionForm';
import SwipeTutorial from '../components/SwipeTutorial';
import { Plus, Calendar as CalendarIcon, ArrowLeft, Copy, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { dataService } from '../lib/dataService';

const PlanejarScreen = ({ transactions, loading, onAdd, onUpdate, onDelete }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'list' or 'calendar'
  const [collapsedYears, setCollapsedYears] = useState(() => {
    // Past years are collapsed by default
    const currentYear = new Date().getFullYear();
    return {}; // Will be populated when months data is computed
  });
  const [selectedMonth, setSelectedMonth] = useState(() => localStorage.getItem('cuifin_selected_month')); // null/undefined means all visible months
  const [showTutorial, setShowTutorial] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isCopying, setIsCopying] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

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
    // Note: We don't null editingItem or close form if we want to keep it open?
    // But here we usually want to close it.
    // However, for in-card updates like attachment, ScannableCard calls onUpdate directly.
    setEditingItem(null);
    setIsFormOpen(false);
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

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Deseja excluir as ${selectedIds.length} transações selecionadas?`)) {
      for (const id of selectedIds) {
        await onDelete(id);
      }
      setSelectedIds([]);
    }
  };

  const handleBulkCopy = async (targetMonth, targetYear) => {
    const selectedTransactions = transactions.filter(t => selectedIds.includes(t.id));

    for (const t of selectedTransactions) {
      const originalDate = t.dueDate ? new Date(t.dueDate + 'T12:00:00') : new Date();
      // Create new date with target month/year but keeping original day
      let newDate = new Date(targetYear, targetMonth, originalDate.getDate());

      // Handle month overflow (e.g. copying 31st to a month with 30 days)
      if (newDate.getMonth() !== targetMonth) {
        newDate = new Date(targetYear, targetMonth + 1, 0); // Last day of target month
      }

      const { id, created_at, ...copyData } = t;
      await onAdd({
        ...copyData,
        dueDate: newDate.toISOString().split('T')[0],
        status: 'pendente' // Reset status for copies
      });
    }

    setSelectedIds([]);
    setIsCopying(false);
    alert(`${selectedTransactions.length} itens copiados com sucesso!`);
  };

  const nextSixMonths = (() => {
    const months = [];
    const now = new Date();
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        label: d.toLocaleString('pt-BR', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear()
      });
    }
    return months;
  })();

  if (viewMode === 'calendar') {
    // Group months by year
    const currentYear = new Date().getFullYear();
    const monthsByYear = {};
    Object.entries(monthsData).forEach(([key, data]) => {
      const year = data.year;
      if (!monthsByYear[year]) monthsByYear[year] = [];
      monthsByYear[year].push({ key, data });
    });
    const sortedYears = Object.keys(monthsByYear).map(Number).sort((a, b) => a - b);

    const toggleYear = (year) => {
      setCollapsedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    // By default: past years collapsed (unless explicitly opened), current/future expanded
    const isYearCollapsed = (year) => {
      if (collapsedYears[year] !== undefined) return collapsedYears[year];
      return year < currentYear; // past years collapsed by default
    };

    return (
      <div className="p-4 pt-4 pb-32">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-zinc-50/95 dark:bg-black/95 backdrop-blur-xl -mx-4 px-4 pt-24 pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-900">
          <h2 className="text-3xl font-black tracking-tighter">Planejar</h2>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Selecione um mês</p>
        </div>

        <div className="space-y-6">
          {sortedYears.map(year => {
            const collapsed = isYearCollapsed(year);
            const isPast = year < currentYear;
            return (
              <div key={year}>
                {/* Year header — clickable to expand/collapse past years */}
                <button
                  onClick={() => toggleYear(year)}
                  className={`w-full flex items-center justify-between mb-3 px-4 py-3 rounded-2xl transition-all ${
                    isPast
                      ? 'bg-zinc-100 dark:bg-zinc-900 opacity-60 hover:opacity-90'
                      : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                >
                  <span className={`text-lg font-black tracking-tight ${
                    year === currentYear ? 'text-verde' : 'text-zinc-500 dark:text-zinc-400'
                  }`}>{year}</span>
                  <motion.span
                    animate={{ rotate: collapsed ? -90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-zinc-400"
                  >
                    <ChevronDown size={18} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="grid grid-cols-2 gap-4 overflow-hidden"
                    >
                      {monthsByYear[year].map(({ key, data }) => {
                        const isSelected = selectedMonth === key;
                        const hasItems = data.items.length > 0;
                        return (
                          <motion.button
                            key={key}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSelectedMonth(key);
                              localStorage.setItem('cuifin_selected_month', key);
                              setViewMode('list');
                            }}
                            className={`p-5 rounded-3xl border text-left flex flex-col justify-between h-36 transition-all ${isSelected
                              ? 'bg-verde/20 border-verde/60 text-white shadow-lg shadow-verde/10'
                              : hasItems
                                ? 'bg-zinc-900 dark:bg-zinc-800 text-white border-zinc-800 shadow-md'
                                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                              }`}
                          >
                            <div>
                              <h3 className="text-base font-black">{data.name}</h3>
                              {hasItems && (
                                <p className={`text-sm font-bold mt-1 ${isSelected ? 'text-verde' : (data.total >= 0 ? 'text-verde' : 'text-vermelho')
                                  }`}>
                                  R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                            <p className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? 'text-white/50' : hasItems ? 'text-zinc-400' : 'text-zinc-300 dark:text-zinc-700'
                              }`}>
                              {hasItems ? `${data.items.length} item${data.items.length > 1 ? 's' : ''}` : 'Vazio'}
                            </p>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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
          <div>
            <h2 className="text-2xl font-black tracking-tight leading-tight">
              {selectedIds.length > 0
                ? `${selectedIds.length} selecionado${selectedIds.length > 1 ? 's' : ''}`
                : selectedMonth ? (monthsData[selectedMonth]?.name || monthCapitalize(selectedMonth.split(' ')[0])) : 'Planejar'}
            </h2>
            {selectedMonth && selectedIds.length === 0 && (
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                {monthsData[selectedMonth]?.year || selectedMonth.split(' ')[1]}
              </p>
            )}
          </div>
          {selectedIds.length > 0 && (
            <button onClick={() => setSelectedIds([])} className="text-[10px] font-black uppercase text-vermelho bg-vermelho/10 px-2 py-1 rounded-lg">Cancelar</button>
          )}
        </div>
        <div className="flex gap-2 pb-1 relative">
          {selectedIds.length > 0 ? (
            <>
              <div className="relative">
                <button
                  onClick={() => setIsCopying(!isCopying)}
                  className="bg-zinc-100 dark:bg-zinc-900 text-verde p-3 rounded-2xl active:scale-95 transition-all shadow-sm border border-zinc-200 dark:border-zinc-800"
                >
                  <Copy size={22} />
                </button>
                <AnimatePresence>
                  {isCopying && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute right-0 top-full mt-3 bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-zinc-100 dark:border-zinc-800 p-3 min-w-[180px] z-50 overflow-hidden"
                    >
                      <p className="text-[9px] font-black uppercase text-zinc-400 px-2 pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">Copiar para:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {nextSixMonths.map(m => (
                          <button
                            key={`${m.month}-${m.year}`}
                            onClick={() => handleBulkCopy(m.month, m.year)}
                            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-verde/10 dark:hover:bg-verde/20 border border-zinc-100 dark:border-zinc-800 transition-all active:scale-90"
                          >
                            <span className="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-300">{m.label}</span>
                            <span className="text-[7px] font-bold text-zinc-400 mt-0.5">{m.year}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={handleBulkDelete}
                className="bg-vermelho/10 text-vermelho p-3 rounded-2xl active:scale-95 transition-all shadow-sm border border-vermelho/20"
              >
                <Trash2 size={22} />
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="pb-40 space-y-10">
        {Object.entries(currentGrouped).length > 0 ? (
          Object.entries(currentGrouped).map(([month, data]) => (
            <div key={month}>
              {!selectedMonth && (
                <div className="bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-3 px-4 rounded-2xl flex justify-between items-center mb-4 shadow-sm transition-all">
                  <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-100 capitalize">{month}</h3>
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
                    isSelected={selectedIds.includes(t.id)}
                    onSelect={toggleSelection}
                    isSelectionMode={selectedIds.length > 0}
                    isExpanded={expandedId === t.id}
                    onToggleExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
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
            <p className={`text-[10px] font-bold uppercase ${balance >= 0 ? 'text-verde' : 'text-vermelho'}`}>
              {balance >= 0 ? 'Sobra' : 'Falta'}
            </p>

            <p className={`text-xl font-black ${balance >= 0 ? 'text-verde' : 'text-vermelho'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-tighter">Saldo</p>
            <div className="flex gap-3 mt-1">
              <span className="text-[11px] font-bold text-zinc-200 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 rounded">
                + R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-bold text-zinc-200 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 rounded">
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
