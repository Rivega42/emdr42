import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { TherapyProvider } from './contexts/TherapyContext';
import { EmotionProvider } from './contexts/EmotionContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <EmotionProvider>
        <TherapyProvider>
          <App />
        </TherapyProvider>
      </EmotionProvider>
    </AuthProvider>
  </React.StrictMode>
);