import { dataService } from '../lib/dataService';

const PRESET_EMOJIS = ['💸', '🏠', '🍔', '⚡', '🌐', '🚗', '🛒', '💊', '🍿', '🎮', '🍎', '🍺'];

const TransactionForm = ({ isOpen, onClose, onSave, initialData }) => {
  const [isDivided, setIsDivided] = useState(false);
  const [showCustomEmoji, setShowCustomEmoji] = useState(false);
  const [friends, setFriends] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    type: 'despesa',
    emoji: '💸',
    splitWith: [] // Array of user IDs
  });

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const data = await dataService.getFriends();
        setFriends(data);
      } catch (e) {
        console.error('Error fetching friends:', e);
      }
    };
    if (isOpen) fetchFriends();
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        amount: initialData.amount.toString(),
        splitWith: initialData.splitWith || []
      });
      setIsDivided(!!(initialData.splitWith && initialData.splitWith.length > 0));
      setShowCustomEmoji(!PRESET_EMOJIS.includes(initialData.emoji));
    } else {
      setFormData({
        title: '',
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
        type: 'despesa',
        emoji: '💸',
        splitWith: []
      });
      setIsDivided(false);
      setShowCustomEmoji(false);
    }
  }, [initialData, isOpen]);

  const toggleUser = (userId) => {
    const current = formData.splitWith;
    if (current.includes(userId)) {
      setFormData({ ...formData, splitWith: current.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, splitWith: [...current, userId] });
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    onSave({
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      splitWith: isDivided ? formData.splitWith : []
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col"
        >
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center mt-safe">
            <button onClick={onClose} className="p-2 text-zinc-500"><X size={24} /></button>
            <h2 className="text-lg font-black uppercase tracking-widest">
              {initialData ? 'Editar' : 'Novo Item'}
            </h2>
            <button onClick={handleSubmit} className="p-2 text-verde"><Check size={24} /></button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Control Group: Split and Type */}
            <div className="space-y-3">
              {/* Split Mode Toggle */}
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setIsDivided(false)}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${!isDivided ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}
                >
                  Pessoal
                </button>
                <button
                  type="button"
                  onClick={() => setIsDivided(true)}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isDivided ? 'bg-white dark:bg-zinc-800 shadow-sm text-orange-500' : 'text-zinc-500'}`}
                >
                  Dividida
                </button>
              </div>

              {/* Transaction Type Toggle */}
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'receita' })}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${formData.type === 'receita' ? 'bg-white dark:bg-zinc-800 shadow-sm text-verde' : 'text-zinc-500'}`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'despesa' })}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${formData.type === 'despesa' ? 'bg-white dark:bg-zinc-800 shadow-sm text-vermelho' : 'text-zinc-500'}`}
                >
                  Despesa
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="text-center pt-2">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block mb-2">Valor Total</label>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-2xl font-black ${formData.type === 'receita' ? 'text-verde' : 'text-zinc-400'}`}>R$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
                  className={`bg-transparent text-5xl font-black focus:outline-none w-full max-w-[200px] text-center ${formData.type === 'receita' ? 'text-verde' : 'text-zinc-900 dark:text-white'}`}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block text-center">Descrição do Item</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Aluguel, Salário, Pizza..."
                className="w-full bg-zinc-50 dark:bg-zinc-900 border-none p-5 rounded-3xl font-bold text-lg text-center focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800"
              />
            </div>

            {/* Emoji Selection Horizontal Scroll */}
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block text-center">Identificado por</label>
              <div className="flex overflow-x-auto gap-4 pb-2 px-1 no-scrollbar scroll-smooth">
                {PRESET_EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, emoji: e });
                      setShowCustomEmoji(false);
                    }}
                    className={`text-3xl flex-shrink-0 p-3 rounded-2xl transition-all ${formData.emoji === e && !showCustomEmoji ? 'bg-zinc-100 dark:bg-zinc-800 scale-110 shadow-sm' : ''}`}
                  >
                    {e}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowCustomEmoji(true)}
                  className={`text-xl flex-shrink-0 w-14 h-14 rounded-2xl transition-all flex items-center justify-center border-2 border-dashed ${showCustomEmoji ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800' : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}
                >
                  <Plus size={24} />
                </button>
              </div>

              <AnimatePresence>
                {showCustomEmoji && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex justify-center pt-2"
                  >
                    <div className="relative group">
                      <input
                        type="text"
                        maxLength={2}
                        placeholder="😀"
                        value={PRESET_EMOJIS.includes(formData.emoji) ? '' : formData.emoji}
                        onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                        className="w-20 bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl font-black text-3xl text-center focus:border-zinc-900 dark:focus:border-white transition-all"
                      />
                      <span className="absolute -top-2 -right-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full p-1"><Smile size={10} /></span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block text-center italic">📅 Data de Vencimento / Recebimento</label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border-none p-4 rounded-3xl font-bold text-sm text-center"
                />
              </div>
            </div>

            {/* Split Selection */}
            <AnimatePresence>
              {isDivided && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden pt-4 border-t border-zinc-100 dark:border-zinc-900"
                >
                  <label className="text-[10px] uppercase font-black text-orange-500 tracking-wider block text-center">👥 Dividir com amigos</label>
                  <div className="flex justify-center gap-6 overflow-x-auto pb-2 no-scrollbar">
                    {friends.length > 0 ? friends.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUser(u.id)}
                        className={`flex flex-col items-center gap-2 transition-all flex-shrink-0`}
                      >
                        <div className={`w-14 h-14 rounded-full border-2 transition-all p-0.5 ${formData.splitWith.includes(u.id) ? 'border-orange-500 scale-110 shadow-lg shadow-orange-500/20' : 'border-transparent grayscale opacity-50'}`}>
                          <img 
                            src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random`} 
                            className="w-full h-full rounded-full object-cover" 
                            alt={u.name} 
                          />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${formData.splitWith.includes(u.id) ? 'text-orange-500' : 'text-zinc-500'}`}>{u.name}</span>
                      </button>
                    )) : (
                      <p className="text-[10px] text-zinc-400 italic py-4">Nenhum amigo encontrado. Convide alguém!</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button
              type="submit"
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-5 rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-all mt-8 uppercase tracking-widest"
            >
              {initialData ? 'Salvar Edição' : 'Confirmar Registro'}
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransactionForm;
