import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DateProvider } from './context/DateContext';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <DateProvider>
          <App />
        </DateProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
