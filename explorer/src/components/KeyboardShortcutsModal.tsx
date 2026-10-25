import React, { useEffect, useRef } from 'react';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ShortcutGroup {
  group: string;
  items: { keys: string[]; action: string }[];
}

export const WORKING_SHORTCUTS: ShortcutGroup[] = [
  {
    group: 'Navigation',
    items: [
      { keys: ['+', '='], action: 'Zoom in' },
      { keys: ['-'], action: 'Zoom out' },
      { keys: ['f', '0'], action: 'Fit all to screen' },
      { keys: ['Arrow keys'], action: 'Navigate to neighbor component' },
      { keys: ['Alt', '←'], action: 'History back' },
      { keys: ['Alt', '→'], action: 'History forward' },
    ],
  },
  {
    group: 'Selection & View',
    items: [
      { keys: ['Click'], action: 'Select component or relationship' },
      { keys: ['Double click'], action: 'Open component inspection drawer' },
      { keys: ['Escape'], action: 'Clear selection / cancel path mode' },
      { keys: ['?'], action: 'Show keyboard shortcuts' },
    ],
  },
  {
    group: 'Actions',
    items: [
      { keys: ['Shift', 'C'], action: 'Copy file path or location' },
      { keys: ['Ctrl', 'K'], action: 'Command palette' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="shortcuts-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="shortcuts-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '560px',
          width: '90%',
          maxHeight: '85vh',
          overflowY: 'auto',
          color: '#f8fafc',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid #334155',
            paddingBottom: '12px',
          }}
        >
          <h2 id="shortcuts-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            ⌨️ Keyboard Shortcuts
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {WORKING_SHORTCUTS.map((group) => (
            <div key={group.group}>
              <h3
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#38bdf8',
                }}
              >
                {group.group}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: '#cbd5e1' }}>{item.action}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          style={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: '#f1f5f9',
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
