import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutList, CheckCircle, ShoppingBag, Users, MoreHorizontal, LogOut } from 'lucide-react';
import { useTransactions } from './hooks/useTransactions';
import PlanejarScreen from './screens/PlanejarScreen';
import ComprasScreen from './screens/ComprasScreen';
import MaisScreen from './screens/MaisScreen';
import LoginScreen from './screens/LoginScreen';
import { useAuth } from './context/AuthContext';

const Header = ({ user, onLogout }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="p-4 px-6 flex justify-between items-center bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-900 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-verde rounded-xl rotate-12 flex items-center justify-center shadow-lg shadow-verde/20">
          <span className="text-xl -rotate-12">💰</span>
        </div>
        <h1 className="text-xl font-black italic tracking-tighter">CuiFin</h1>
      </div>
      
      <div className="relative">
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 rounded-full border-2 border-zinc-100 dark:border-zinc-800 overflow-hidden active:scale-95 transition-transform"
        >
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        </button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 p-2 z-50"
            >
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                <p className="font-bold text-sm truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
              </div>
              <button 
                onClick={() => { setShowMenu(false); onLogout(); }}
                className="w-full flex items-center gap-2 p-3 text-vermelho font-bold text-sm rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <LogOut size={16} /> Sair
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'planejar', icon: <LayoutList size={22} />, label: 'Planejar' },
    { id: 'compras', icon: <ShoppingBag size={22} />, label: 'Compras' },
    { id: 'grupos', icon: <Users size={22} />, label: 'Grupos' },
    { id: 'mais', icon: <MoreHorizontal size={22} />, label: 'Mais' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-900 flex justify-around items-center z-40 pb-safe shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center justify-center w-full h-full relative transition-colors ${
            activeTab === tab.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'
          }`}
        >
          <div className="relative z-10 flex flex-col items-center">
            {tab.icon}
            <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">{tab.label}</span>
          </div>
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute inset-x-2 inset-y-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl -z-0"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      ))}
    </nav>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('planejar');
  const { user, logout, loading } = useAuth();
  const { 
    transactions, 
    loading: transactionsLoading, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction 
  } = useTransactions();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-verde border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'planejar': 
        return <PlanejarScreen 
          transactions={transactions} 
          loading={transactionsLoading}
          onAdd={addTransaction}
          onUpdate={updateTransaction} 
          onDelete={deleteTransaction} 
        />;
      case 'compras': 
        return <ComprasScreen />;
      case 'grupos':
        return <MaisScreen forceView="grupos" />; // Temporary: MaisScreen handles Grupos logic
      case 'mais': 
        return <MaisScreen />;
      default: 
        return <PlanejarScreen transactions={transactions} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <Header user={user} onLogout={logout} />
      <main className="pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
