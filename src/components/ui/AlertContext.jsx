import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const AlertContext = createContext(null);

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // 'error', 'warning', 'info', 'success'
    isConfirm: false,
    onConfirm: null,
  });

  const hideModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showAlert = useCallback((message, title = 'Atención', type = 'info') => {
    setModalState({
      isOpen: true,
      message,
      title,
      type,
      isConfirm: false,
      onConfirm: null,
    });
  }, []);

  const showConfirm = useCallback((message, onConfirm, title = 'Confirmar acción', type = 'warning') => {
    setModalState({
      isOpen: true,
      message,
      title,
      type,
      isConfirm: true,
      onConfirm: () => {
        onConfirm();
        hideModal();
      },
    });
  }, [hideModal]);

  const getIcon = (type) => {
    switch (type) {
      case 'error': return <X size={32} />;
      case 'warning': return <AlertCircle size={32} />;
      case 'success': return <CheckCircle2 size={32} />;
      case 'info':
      default: return <Info size={32} />;
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modalState.isOpen && (
        <div className="modal-overlay" onClick={hideModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className={`modal-icon ${modalState.type}`}>
              {getIcon(modalState.type)}
            </div>
            <h3 className="modal-title">{modalState.title}</h3>
            <p className="modal-message">{modalState.message}</p>
            <div className="modal-actions">
              {modalState.isConfirm ? (
                <>
                  <button className="modal-btn modal-btn-secondary" onClick={hideModal}>
                    Cancelar
                  </button>
                  <button className={`modal-btn ${modalState.type === 'error' ? 'modal-btn-danger' : 'modal-btn-primary'}`} onClick={modalState.onConfirm}>
                    Confirmar
                  </button>
                </>
              ) : (
                <button className="modal-btn modal-btn-primary" onClick={hideModal}>
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
