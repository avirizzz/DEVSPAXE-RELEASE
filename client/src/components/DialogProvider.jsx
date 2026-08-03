import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DialogContext = createContext(null);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

export function DialogProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: 'prompt', // 'prompt' | 'confirm'
    title: '',
    message: '',
    defaultValue: '',
    placeholder: '',
    resolve: null,
  });

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const promptAsync = (title, message = '', defaultValue = '', placeholder = '') => {
    return new Promise((resolve) => {
      setInputValue(defaultValue);
      setDialogState({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        defaultValue,
        placeholder,
        resolve,
      });
    });
  };

  const confirmAsync = (title, message = '') => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        resolve,
      });
    });
  };

  const closeDialog = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (dialogState.resolve) {
      if (dialogState.type === 'prompt') {
        dialogState.resolve(inputValue);
      } else {
        dialogState.resolve(true);
      }
    }
    closeDialog();
  };

  const handleCancel = () => {
    if (dialogState.resolve) {
      if (dialogState.type === 'prompt') {
        dialogState.resolve(null);
      } else {
        dialogState.resolve(false);
      }
    }
    closeDialog();
  };

  useEffect(() => {
    if (dialogState.isOpen && dialogState.type === 'prompt' && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [dialogState.isOpen, dialogState.type]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <DialogContext.Provider value={{ promptAsync, confirmAsync }}>
      {children}
      <AnimatePresence>
        {dialogState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={handleCancel}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl p-6 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Subtle top highlight */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <h2 className="text-lg font-bold text-white mb-2">{dialogState.title}</h2>
              
              {dialogState.message && (
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  {dialogState.message}
                </p>
              )}

              {dialogState.type === 'prompt' && (
                <div className="mb-6">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={dialogState.placeholder}
                    className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end mt-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-primary text-black hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  {dialogState.type === 'prompt' ? 'Confirm' : 'Yes, continue'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}
