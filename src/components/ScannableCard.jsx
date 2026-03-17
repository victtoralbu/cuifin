import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, User, Paperclip, Check, ChevronDown, ChevronUp, Edit, Trash2, CheckCircle, Share2, X, Camera, Image } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../lib/dataService';
import { Loader2 } from 'lucide-react';

const ScannableCard = ({
  transaction,
  friends = [],
  onUpdate,
  onDelete,
  onEdit,
  isSelected,
  onSelect,
  isSelectionMode,
  isExpanded,
  onToggleExpand
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  const { user } = useAuth();
  const isOwner = transaction.userId === user?.id;

  const getFriendData = (id) => {
    // If it's me, return 'Você'
    if (id === user?.id) return { name: 'Você', avatar: user.avatar || `https://ui-avatars.com/api/?name=V&background=random` };

    const friend = friends.find(f => f.id === id);
    if (!friend) return { name: 'Convidado Amigo', avatar: `https://ui-avatars.com/api/?name=A&background=random` };
    return {
      name: friend.name,
      avatar: friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=random`
    };
  };

  const getStatusColor = (dueDate) => {
    if (!dueDate || transaction.status === 'pago') return 'status-gray';
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalized today
    const due = new Date(dueDate + 'T12:00:00'); // Safe local date
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return 'status-vermelho';
    if (diff <= 2) return 'status-laranja';
    return 'status-gray';
  };

  const handleDragEnd = (event, info) => {
    if (info.offset.x < -100) {
      if (window.navigator.vibrate) window.navigator.vibrate([10, 30]);
      onDelete(transaction.id);
    } else if (info.offset.x > 100) {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      onEdit(transaction);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob failed'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.8);
        };
        img.onerror = (e) => reject(new Error('Image load failed'));
      };
      reader.onerror = (e) => reject(new Error('File reader failed'));
    });
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset input so same file can be picked again
    e.target.value = '';
    try {
      setIsUploading(true);
      
      // Compression stage to prevent mobile crashes with high-res photos
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(file);
          console.log('Image compressed successfully:', { 
            original: (file.size / 1024 / 1024).toFixed(2) + 'MB', 
            compressed: (fileToUpload.size / 1024 / 1024).toFixed(2) + 'MB' 
          });
        } catch (compressErr) {
          console.warn('Compression failed, uploading original:', compressErr);
        }
      }

      const url = await dataService.uploadTransactionAttachment(fileToUpload);
      console.log('Upload success, URL:', url);
      await onUpdate({ ...transaction, attachmentUrl: url });
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    } catch (err) {
      console.error('Error uploading attachment:', err);
      alert('Erro ao enviar arquivo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };  return (
    <div className={`relative h-full ${isExpanded ? 'col-span-2' : ''}`}>
      {/* Modals outside main card to avoid opacity inheritance */}
      <AnimatePresence>
        {showAttachmentOptions && (
          <div className="fixed inset-0 z-[200]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAttachmentOptions(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[300px] bg-white dark:bg-zinc-800 rounded-[32px] shadow-2xl border border-zinc-100 dark:border-zinc-700 p-2 flex flex-col gap-1 z-[210]"
            >
              <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-700/50 mb-1 flex justify-between items-center">
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Anexar Comprovante</span>
                <button onClick={() => setShowAttachmentOptions(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                  <X size={16} />
                </button>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                  setShowAttachmentOptions(false);
                }}
                className="flex items-center gap-4 w-full p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-2xl transition-colors text-zinc-900 dark:text-zinc-100 font-black text-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-azul/10 text-azul flex items-center justify-center shadow-inner">
                  <Camera size={20} />
                </div>
                Tirar Foto
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                  setShowAttachmentOptions(false);
                }}
                className="flex items-center gap-4 w-full p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-2xl transition-colors text-zinc-900 dark:text-zinc-100 font-black text-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-verde/10 text-verde flex items-center justify-center shadow-inner">
                  <Image size={20} />
                </div>
                Galeria
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAttachmentPreview && transaction.attachmentUrl && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90"
              onClick={() => setShowAttachmentPreview(false)}
            />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-[310]"
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <div className="relative aspect-[4/5] bg-white p-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAttachmentPreview(false);
                  }}
                  className="absolute top-6 right-6 z-20 w-12 h-12 bg-black/80 rounded-full flex items-center justify-center text-white active:scale-90 transition-all shadow-xl"
                >
                  <X size={28} />
                </button>
                <img
                  src={transaction.attachmentUrl}
                  className="w-full h-full object-contain rounded-[24px] shadow-sm"
                />
              </div>
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 flex gap-4">
                <button
                  onClick={() => {
                    setShowAttachmentPreview(false);
                    setShowAttachmentOptions(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all text-zinc-900 dark:text-white shadow-sm border border-zinc-100 dark:border-zinc-700"
                >
                  <Edit size={18} /> Trocar
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Deseja remover este comprovante?')) {
                      await onUpdate({ ...transaction, attachmentUrl: null });
                      setShowAttachmentPreview(false);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-vermelho text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-vermelho/20"
                >
                  <Trash2 size={18} /> Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/80"
          >
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4">
              <Loader2 size={48} className="animate-spin text-verde" />
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest text-center">
                Enviando Comprovante...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center justify-between px-6 rounded-xl overflow-hidden opacity-30 bg-zinc-100 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2 text-zinc-400">
          <Edit size={24} />
        </div>
        <div className="flex items-center gap-2 text-vermelho">
          <Trash2 size={24} />
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.95 }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (window.navigator.vibrate) window.navigator.vibrate(100);
          onSelect(transaction.id);
        }}
        className={`scannable-card relative z-10 h-full ${isSelected
          ? 'ring-2 ring-verde bg-verde/5 dark:bg-verde/10'
          : transaction.status === 'pago'
            ? 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
            : getStatusColor(transaction.dueDate)
          } transition-all duration-300 overflow-hidden`}
      >
        {isSelected && (
          <div className="absolute inset-0 z-20 bg-verde/15 dark:bg-verde/25 pointer-events-none rounded-2xl ring-2 ring-verde shadow-lg flex items-start justify-end p-1.5">
            <div className="bg-verde rounded-full p-1 shadow-md border-2 border-white dark:border-zinc-900">
              <Check size={14} className="text-white font-black" strokeWidth={4} />
            </div>
          </div>
        )}

        <div
          className="flex flex-col gap-1 cursor-pointer p-3"
          onClick={() => {
            if (isSelectionMode) {
              onSelect(transaction.id);
            } else {
              onToggleExpand();
            }
          }}
        >
          <div className="flex justify-between items-start">
            <span className={`text-3xl ${transaction.status === 'pago' ? 'grayscale opacity-50' : ''}`}>{transaction.emoji || '💰'}</span>
            <div className="text-right">
              <p className={`font-black text-sm ${transaction.status === 'pago' ? 'text-zinc-500/60 line-through' : (transaction.type === 'receita' ? 'text-verde' : (getStatusColor(transaction.dueDate) === 'status-vermelho' ? 'text-vermelho' : 'text-zinc-900 dark:text-zinc-100'))}`}>
                {transaction.type === 'receita' ? '+' : ''} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                {transaction.splitWith?.length > 0 && (
                  <span className="block text-[9px] opacity-40 font-medium leading-none mt-1">
                    R$ {(transaction.amount / (transaction.splitWith.length + 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada
                  </span>
                )}
              </p>
              {isExpanded ? <ChevronUp size={14} className={`ml-auto mt-1 ${transaction.status === 'pago' ? 'opacity-30' : ''}`} /> : <ChevronDown size={14} className={`ml-auto mt-1 ${transaction.status === 'pago' ? 'opacity-30' : ''}`} />}
            </div>
          </div>

          <div className="mt-auto">
            <div className={`flex justify-between items-start gap-2 ${transaction.status === 'pago' ? 'opacity-40' : ''}`}>
              <p className={`font-bold text-base leading-tight flex-1 ${transaction.status === 'pago' ? 'text-zinc-500 line-through' : 'text-zinc-900 dark:text-zinc-100'} line-clamp-1`}>
                {transaction.title}
              </p>
              {transaction.status === 'pago' && <CheckCircle className="text-verde flex-shrink-0" size={22} />}
            </div>
            <div className={`flex justify-between items-center mt-1 ${transaction.status === 'pago' ? 'opacity-30' : ''}`}>
              <p className="text-[11px] font-medium text-zinc-500">
                {transaction.dueDate ? transaction.dueDate.split('-').reverse().join('/') : 'Sem data'}
              </p>
              {transaction.splitWith?.length > 0 && (
                <div className="flex -space-x-1.5 overflow-hidden">
                  {transaction.splitWith.map(id => {
                    const friend = getFriendData(id);
                    return (
                      <img
                        key={id}
                        className="inline-block h-4 w-4 rounded-full ring-1 ring-white dark:ring-zinc-900 object-cover bg-zinc-100 shadow-sm"
                        src={friend.avatar}
                        alt={friend.name}
                        title={friend.name}
                      />
                    );
                  })}
                  <span className="text-[8px] font-black text-orange-500 ml-1 mt-0.5">÷</span>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Tipo</label>
                    <div className="text-sm font-black capitalize min-h-[24px] flex items-center leading-none">
                      {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Parcelas</label>
                    <div className="text-sm font-black min-h-[24px] flex items-center leading-none">
                      {transaction.installments || '1/1'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Divisão</label>
                    <div className="flex items-center gap-2 min-h-[24px]">
                      {transaction.splitWith?.length > 0 && (
                        <div className="flex -space-x-1.5 flex-wrap">
                          {transaction.splitWith.map(id => {
                            const friend = getFriendData(id);
                            return (
                              <img
                                key={id}
                                className="h-6 w-6 rounded-full border border-white dark:border-zinc-900 shadow-sm object-cover bg-zinc-100"
                                src={friend.avatar}
                                alt={friend.name}
                              />
                            );
                          })}
                        </div>
                      )}
                      <span className="text-[9px] font-black text-zinc-900 dark:text-zinc-100 uppercase leading-none">
                        {transaction.splitWith?.length > 0 ? (transaction.groupId ? `Grupo ${transaction.groupName}` : `${transaction.splitWith.length + 1} pessoas`) : 'Pessoal'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Quem pagou?</label>
                    <div className="flex items-center gap-2 min-h-[24px]">
                      <img
                        className="h-6 w-6 rounded-full border border-white dark:border-zinc-900 shadow-sm object-cover bg-zinc-100"
                        src={getFriendData(transaction.paidById || transaction.userId).avatar}
                        alt=""
                      />
                      <span className="text-[9px] font-black text-zinc-900 dark:text-zinc-100 uppercase truncate max-w-[80px] leading-none">
                        {transaction.paidById === user?.id ? 'VOCÊ' : (transaction.paidByName || 'Desconhecido')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg ${
                      transaction.status === 'pago' 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shadow-none' 
                        : 'bg-verde text-white shadow-verde/20'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({ ...transaction, status: transaction.status === 'pago' ? 'pendente' : 'pago' });
                    }}
                  >
                    {transaction.status === 'pago' ? 'Desfazer Pagamento' : 'Marcar como Pago'}
                  </button>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (transaction.attachmentUrl) {
                          setShowAttachmentPreview(true);
                        } else {
                          setShowAttachmentOptions(!showAttachmentOptions);
                        }
                      }}
                      className="w-[60px] h-[60px] rounded-2xl transition-all flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 active:scale-95 overflow-hidden group border border-transparent hover:border-verde/30"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 size={24} className="animate-spin text-verde" />
                      ) : transaction.attachmentUrl ? (
                        <img src={transaction.attachmentUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      ) : (
                        <Paperclip size={24} />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleAttachmentUpload}
      />
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleAttachmentUpload}
      />
    </div>
  );
};

export default ScannableCard;
