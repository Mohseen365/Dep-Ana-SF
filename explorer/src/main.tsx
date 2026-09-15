import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SelectionProvider } from './context/SelectionContext';
import { ProjectProvider } from './context/ProjectContext';
import { ProjectStateProvider } from './context/ProjectStateContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProjectProvider>
      <ProjectStateProvider>
        <SelectionProvider>
          <App />
        </SelectionProvider>
      </ProjectStateProvider>
    </ProjectProvider>
  </React.StrictMode>
);
