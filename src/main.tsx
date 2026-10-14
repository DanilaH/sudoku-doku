import {createRoot} from 'react-dom/client';
import Doku from './App';
// Keep initialization single: storage leases and SDK callbacks have a process lifetime.
createRoot(document.getElementById('root')!).render(<Doku/>);
