import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutList, CheckCircle, ShoppingBag, Users, MoreHorizontal, LogOut, RefreshCcw } from 'lucide-react';
import { useTransactions } from './hooks/useTransactions';
import PlanejarScreen from './screens/PlanejarScreen';
import ComprasScreen from './screens/ComprasScreen';
import MaisScreen from './screens/MaisScreen';
import LoginScreen from './screens/LoginScreen';
import { useAuth } from './context/AuthContext';
import { dataService } from './lib/dataService';
import { useEffect } from 'react';
import { Bell } from 'lucide-react';
import NotificationModal from './components/NotificationModal';

const Header = ({ user, onLogout, notificationCount, onShowNotifications }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="fixed top-4 left-4 right-4 z-50 pointer-events-none">
      <div className="max-w-5xl mx-auto flex justify-between items-center bg-white/40 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 p-2 px-4 rounded-3xl shadow-xl shadow-black/5 pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-verde rounded-xl rotate-12 flex items-center justify-center shadow-lg shadow-verde/20 ring-1 ring-white/20">
            <span className="text-lg -rotate-12">💰</span>
          </div>
          <h1 className="text-xl font-black italic tracking-tighter opacity-80">CuiFin</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onShowNotifications()}
            className="p-2 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-90 transition-all relative"
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-verde rounded-full border border-white dark:border-black" />
            )}
          </button>
          <button 
            onClick={() => {
              if (window.confirm('Forçar atualização do aplicativo? Isso limpará o cache local.')) {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) {
                      registration.unregister();
                    }
                  });
                }
                window.location.reload(true);
              }
            }}
            className="p-2 flex items-center justify-center text-zinc-500 hover:text-verde active:scale-90 transition-all"
            title="Forçar Atualização"
          >
            <RefreshCcw size={20} /> 
          </button>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-full border border-white/40 dark:border-white/10 overflow-hidden active:scale-95 transition-transform shadow-inner"
          >
            <img 
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
              alt={user.name} 
              className="w-full h-full object-cover" 
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
              }}
            />
          </button>
        </div>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-3 w-56 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/5 p-2 z-50 origin-top-right"
            >
              <div className="p-4 border-b border-black/5 dark:border-white/5 mb-1">
                <p className="font-bold text-sm truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-500 truncate font-medium uppercase tracking-widest">{user.email}</p>
              </div>
              <button 
                onClick={() => { setShowMenu(false); onLogout(); }}
                className="w-full flex items-center gap-3 p-3 text-vermelho font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-vermelho/5 transition-colors"
              >
                <LogOut size={16} /> Sair da Conta
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
  ];

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-50 pointer-events-none">
      <div className="max-w-lg mx-auto bg-white/30 dark:bg-black/30 backdrop-blur-3xl border border-white/20 dark:border-white/5 rounded-[32px] p-3 flex justify-around items-center shadow-2xl shadow-black/10 pointer-events-auto relative overflow-hidden">
        {/* Subtle inner reflection */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-2.5 px-6 rounded-2xl relative transition-all duration-500 ${
              activeTab === tab.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`relative z-10 flex flex-col items-center transition-transform duration-300 ${activeTab === tab.id ? 'scale-110 -translate-y-0.5' : ''}`}>
              {tab.icon}
              <span className={`text-[7px] font-black uppercase mt-1 tracking-tighter transition-all ${activeTab === tab.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                {tab.label}
              </span>
            </div>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-x-0 inset-y-0 bg-white/80 dark:bg-white/10 rounded-[24px] shadow-sm -z-0 border border-white/20 dark:border-white/5"
                transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('cuifin_active_tab') || 'planejar');
  const { user, logout, loading } = useAuth();
  const { 
    transactions, 
    loading: transactionsLoading, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction 
  } = useTransactions();
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await dataService.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s refresh

    // Dynamic Status Bar Color
    const updateMetaTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      const color = isDark ? '#000000' : '#f9fafb';
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', color);
    };

    updateMetaTheme();
    
    // Watch for color scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateMetaTheme);

    return () => {
      clearInterval(interval);
      mediaQuery.removeEventListener('change', updateMetaTheme);
    };
  }, [user]);

  const handleRespondToNotification = async (id, status) => {
    try {
      await dataService.respondToNotification(id, status);
      fetchNotifications();
      if (status === 'accepted') {
        alert('Convite aceito! Agora vocês compartilham a lista de compras. 🛒');
        window.location.reload(); // Force refresh to sync shared lists
      }
    } catch (e) {
      console.error('Error responding to notification:', e);
    }
  };

  // Handle Invitations
  useEffect(() => {
    if (user && !loading) {
      const params = new URLSearchParams(window.location.search);
      const inviteId = params.get('invite');
      
      if (inviteId && inviteId !== user.id) {
        const processInvite = async () => {
          try {
            await dataService.addFriendByInvite(inviteId);
            // Clear the URL without reloading
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            setActiveTab('grupos'); // Navigate to groups screen to see new friend
            alert('Novo amigo adicionado com sucesso! 🎉');
          } catch (error) {
            console.error('Erro ao processar convite:', error);
          }
        };
        processInvite();
      }
    }
  }, [user, loading]);

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
        return <MaisScreen forceView="grupos" />;
      default: 
        return <PlanejarScreen transactions={transactions} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <Header 
        user={user} 
        onLogout={logout} 
        notificationCount={notifications.length}
        onShowNotifications={() => setShowNotifications(true)}
      />
      <main className="max-w-5xl mx-auto pb-36">
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
      <BottomNav activeTab={activeTab} onTabChange={(tab) => {
        setActiveTab(tab);
        localStorage.setItem('cuifin_active_tab', tab);
      }} />
      
      <NotificationModal 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onRespond={handleRespondToNotification}
      />
    </div>
  );
}

export default App;
