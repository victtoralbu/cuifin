import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Calendar, Users, Smile, User, Plus, Paperclip, Repeat, Trash2 } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useAuth } from '../context/AuthContext';

const PRESET_EMOJIS = ['💸', '🏠', '🍔', '⚡', '🌐', '🚗', '🛒', '💊', '🍿', '🎮', '🍎', '🍺'];

const TransactionForm = ({ isOpen, onClose, onSave, initialData }) => {
  const [isDivided, setIsDivided] = useState(false);
  const [showCustomEmoji, setShowCustomEmoji] = useState(false);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    type: 'despesa',
    emoji: '💸',
    splitWith: [], // Array of user IDs
    groupId: null,
    groupName: null,
    paidById: null,
    paidByName: null,
    installmentCount: 1,
    attachmentUrl: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showInstallmentPicker, setShowInstallmentPicker] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [friendsData, groupsData] = await Promise.all([
          dataService.getFriends(),
          dataService.getGroups()
        ]);
        setFriends(friendsData);
        setGroups(groupsData);
      } catch (e) {
        console.error('Error fetching data:', e);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        amount: initialData.amount.toString(),
        splitWith: initialData.splitWith || [],
        groupId: initialData.groupId || null,
        groupName: initialData.groupName || null,
        paidById: initialData.paidById || user?.id,
        paidByName: initialData.paidByName || user?.user_metadata?.full_name || user?.email
      });
      setIsDivided(!!(initialData.splitWith && initialData.splitWith.length > 0));
      setShowCustomEmoji(!PRESET_EMOJIS.includes(initialData.emoji));
    } else {
      setFormData({
        title: '',
        amount: '',
        dueDate: new Date().toLocaleDateString('en-CA'),
        type: 'despesa',
        emoji: '💸',
        splitWith: [],
        groupId: null,
        groupName: null,
        paidById: user?.id,
        paidByName: user?.user_metadata?.full_name || user?.email
      });
      setIsDivided(false);
      setShowCustomEmoji(false);
    }
  }, [initialData, isOpen]);

  const toggleUser = (userId) => {
    const current = formData.splitWith;
    // If we were in a group split, clicking a friend should clear the group
    // and switch to individual split mode.
    if (formData.groupId) {
      setFormData({ 
        ...formData, 
        splitWith: [userId],
        groupId: null,
        groupName: null
      });
      return;
    }

    if (current.includes(userId)) {
      setFormData({ ...formData, splitWith: current.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, splitWith: [...current, userId] });
    }
  };

  const toggleGroup = (group) => {
    // IMPORTANT: Exclude the current user from the splitWith array
    // shareCount = splitWith.length + 1
    const groupMemberIds = group.members
      .filter(m => m.user_id && m.user_id !== null && m.user_id !== user.id)
      .map(m => m.user_id);
    
    const isThisGroupSelected = formData.groupId === group.id;

    if (isThisGroupSelected) {
      // Deselect group -> Back to personal
      setFormData({ 
        ...formData, 
        splitWith: [],
        groupId: null,
        groupName: null
      });
    } else {
      // Select group -> Clear all other individual selections and use group members
      setFormData({ 
        ...formData, 
        splitWith: groupMemberIds,
        groupId: group.id,
        groupName: group.name
      });
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
            <button onClick={onClose} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-2xl transition-colors"><X size={24} /></button>
            <h2 className="text-sm font-black uppercase tracking-widest opacity-40">
              {initialData ? 'Editar' : 'Novo Item'}
            </h2>
            <button onClick={handleSubmit} className="p-2 text-verde hover:bg-verde/10 rounded-2xl transition-colors"><Check size={24} /></button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
            {/* Split Mode & Payer Selection */}
            <div className="space-y-4">
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

              {/* Split Selection - Only when divided */}
              <AnimatePresence>
                {isDivided && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <label className="text-[10px] uppercase font-black text-orange-500 tracking-wider block mt-2 text-center">Dividir com quem?</label>
                    <div className="flex flex-col gap-6 overflow-x-auto pt-3 pb-4 no-scrollbar px-1 justify-center">
                      {/* Groups List */}
                      {groups.length > 0 && (
                        <div className="flex gap-4 items-center mb-2 justify-center">
                          {groups.map(g => {
                            const groupMemberIds = g.members
                              .filter(m => m.user_id && m.user_id !== null)
                              .map(m => m.user_id);
                            const isGroupSelected = groupMemberIds.length > 0 && groupMemberIds.every(id => formData.splitWith.includes(id));
                            
                            return (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => toggleGroup(g)}
                                className={`flex flex-col items-center gap-1 transition-all flex-shrink-0`}
                              >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${isGroupSelected ? 'bg-orange-500 border-orange-500 text-white scale-110 shadow-lg shadow-orange-500/20' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-orange-500'}`}>
                                  <Users size={20} />
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-tighter max-w-[48px] truncate ${isGroupSelected ? 'text-orange-500' : 'text-zinc-400'}`}>
                                  {g.name}
                                </span>
                              </button>
                            );
                          })}
                          <div className="w-px h-8 bg-zinc-100 dark:bg-zinc-800 mx-2 flex-shrink-0" />
                          
                          {/* Friends List */}
                          {friends.length > 0 ? friends.map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => toggleUser(u.id)}
                              className={`flex flex-col items-center gap-1 transition-all flex-shrink-0`}
                            >
                              <div className={`w-12 h-12 rounded-full border-2 transition-all p-0.5 ${formData.splitWith.includes(u.id) ? 'border-orange-500 scale-110 shadow-lg shadow-orange-500/20' : 'border-transparent grayscale opacity-50'}`}>
                                <img
                                  src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random`}
                                  className="w-full h-full rounded-full object-cover"
                                  alt={u.name}
                                />
                              </div>
                              <span className={`text-[8px] font-black uppercase tracking-tighter max-w-[48px] truncate ${formData.splitWith.includes(u.id) ? 'text-orange-500' : 'text-zinc-400'}`}>
                                {u.name.split(' ')[0]}
                              </span>
                            </button>
                          )) : (
                            <p className="text-[10px] font-bold text-zinc-400 italic">Conecte amigos</p>
                          )}
                        </div>
                      )}

                      {/* If no groups but has friends */}
                      {groups.length === 0 && (
                        <div className="flex justify-center gap-6 items-center">
                           {friends.length > 0 ? friends.map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => toggleUser(u.id)}
                              className={`flex flex-col items-center gap-2 transition-all flex-shrink-0`}
                            >
                              <div className={`w-12 h-12 rounded-full border-2 transition-all p-0.5 ${formData.splitWith.includes(u.id) ? 'border-orange-500 scale-110 shadow-lg shadow-orange-500/20' : 'border-transparent grayscale opacity-50'}`}>
                                <img
                                  src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random`}
                                  className="w-full h-full rounded-full object-cover"
                                  alt={u.name}
                                />
                              </div>
                              <span className={`text-[8px] font-black uppercase tracking-tighter max-w-[48px] truncate ${formData.splitWith.includes(u.id) ? 'text-orange-500' : 'text-zinc-400'}`}>
                                {u.name.split(' ')[0]}
                              </span>
                            </button>
                          )) : (
                            <p className="text-[10px] text-zinc-400 italic py-2">Nenhum amigo encontrado.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Payer Selection - Only when divided */}
              <AnimatePresence>
                {isDivided && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 border-b border-zinc-50 dark:border-zinc-900 pb-4"
                  >
                    <label className="text-[10px] uppercase font-black text-orange-500 tracking-wider block mb-3 text-center">Quem pagou?</label>
                    <div className="flex gap-4 overflow-x-auto pt-3 pb-2 no-scrollbar px-1 justify-center">
                      {/* Current User */}
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paidById: user.id, paidByName: user?.user_metadata?.full_name || user?.email })}
                        className={`flex flex-col items-center gap-1 transition-all flex-shrink-0`}
                      >
                        <div className={`w-12 h-12 rounded-full border-2 transition-all p-0.5 ${formData.paidById === user.id ? 'border-verde scale-110 shadow-lg shadow-verde/20' : 'border-transparent grayscale opacity-50'}`}>
                          <img
                            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.user_metadata?.full_name || 'Voce'}&background=random`}
                            className="w-full h-full rounded-full object-cover"
                            alt="Você"
                          />
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-tighter ${formData.paidById === user.id ? 'text-verde' : 'text-zinc-400'}`}>
                          Você
                        </span>
                      </button>

                      {/* Members (Group or Individual splitWith) */}
                      {(formData.groupId ? (groups.find(g => g.id === formData.groupId)?.members || []) : friends.filter(f => formData.splitWith.includes(f.id))).map(m => {
                        const mId = m.user_id || m.id;
                        const mName = m.name;
                        if (mId === user.id) return null;
                        
                        return (
                          <button
                            key={mId}
                            type="button"
                            onClick={() => setFormData({ ...formData, paidById: mId, paidByName: mName })}
                            className={`flex flex-col items-center gap-1 transition-all flex-shrink-0`}
                          >
                            <div className={`w-12 h-12 rounded-full border-2 transition-all p-0.5 ${formData.paidById === mId ? 'border-verde scale-110 shadow-lg shadow-verde/20' : 'border-transparent grayscale opacity-50'}`}>
                              <img
                                src={m.avatar || `https://ui-avatars.com/api/?name=${mName}&background=random`}
                                className="w-full h-full rounded-full object-cover"
                                alt={mName}
                              />
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-tighter max-w-[48px] truncate ${formData.paidById === mId ? 'text-verde' : 'text-zinc-400'}`}>
                              {mName.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Transaction Type Toggle */}
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl pt-2">
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
                  className={`bg-transparent text-5xl font-black focus:outline-none w-full max-w-[200px] text-center tracking-tighter ${formData.type === 'receita' ? 'text-verde' : 'text-zinc-900 dark:text-white'}`}
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
                className="w-full bg-transparent border-none p-5 rounded-3xl font-black text-2xl text-center focus:ring-0 tracking-tight placeholder:opacity-20"
              />
            </div>

            {/* Emoji Selection Horizontal Scroll */}
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block text-center">Identificado por</label>
              <div className="flex overflow-x-auto gap-4 pt-4 pb-4 px-1 no-scrollbar scroll-smooth">
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
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-black text-zinc-400 tracking-wider block text-center">📅 DATA DE VENCIMENTO / RECEBIMENTO</label>
                <div className="flex items-center justify-center gap-4">
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="bg-zinc-100 dark:bg-zinc-900 border-none p-5 px-6 rounded-[2rem] font-black text-sm text-center focus:ring-2 focus:ring-verde/20 transition-all"
                    />
                  </div>
                  
                  {/* Actions: Installments */}
                  <button
                    type="button"
                    onClick={() => setShowInstallmentPicker(!showInstallmentPicker)}
                    className={`h-[60px] px-6 rounded-[2rem] flex items-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${formData.installmentCount > 1 ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'}`}
                  >
                    <Repeat size={18} />
                    {formData.installmentCount > 1 ? `${formData.installmentCount} Parcelas` : 'À Vista'}
                  </button>
                </div>

                <AnimatePresence>
                  {showInstallmentPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 justify-center pt-2"
                    >
                      {[1, 2, 3, 4, 5, 6, 12, 18, 24].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, installmentCount: num });
                            setShowInstallmentPicker(false);
                          }}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.installmentCount === num ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-transparent text-zinc-400 border border-zinc-100 dark:border-zinc-800'}`}
                        >
                          {num === 1 ? '1x (À Vista)' : `${num}x`}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>


          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransactionForm;
