import React, { useEffect, useState } from 'react';

export interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  /** Auto-dismiss timeout in ms. Default 0 = no auto-dismiss. */
  autoDismissMs?: number;
}

const bannerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  padding: '10px 16px',
  background: '#6a1a1a',
  borderBottom: '2px solid #c44',
  color: '#faa',
  fontSize: 13,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  zIndex: 2000,
  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
};

const dismissBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #c44',
  color: '#faa',
  borderRadius: 4,
  padding: '3px 10px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  marginLeft: 12,
  flexShrink: 0,
};

/**
 * A fixed-position error banner that slides in from the top of the viewport.
 * Displays an error message with a dismiss button and optional auto-dismiss.
 */
const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  autoDismissMs = 0,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismissMs > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  return (
    <div style={bannerStyle} role="alert">
      <span>{message}</span>
      <button style={dismissBtnStyle} onClick={handleDismiss}>
        Dismiss
      </button>
    </div>
  );
};

export default React.memo(ErrorBanner);
