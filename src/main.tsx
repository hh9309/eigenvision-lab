import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Fix: "ResizeObserver loop completed with undelivered notifications"
// This error is typically benign and often triggered by third-party libraries like Recharts or browser layout cycles.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.message === 'ResizeObserver loop completed with undelivered notifications' || 
        e.message === 'ResizeObserver loop limit exceeded') {
      const resizeObserverErrGuid = 'f709118a-7848-4224-811c-c9d2c2f40004';
      if (window.dispatchEvent) {
        const err = new Error(resizeObserverErrGuid);
        e.stopImmediatePropagation();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
