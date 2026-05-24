import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate } from './components/AuthGate';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Today } from './pages/Today';
import { Week } from './pages/Week';
import { Log } from './pages/Log';
import { Readiness } from './pages/Readiness';
import { Coach } from './pages/Coach';
import { Settings } from './pages/Settings';
import { ShortcutLog } from './pages/ShortcutLog';
import { Onboarding } from './pages/Onboarding';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/shortcut-log" element={<ShortcutLog />} />
        <Route element={<AuthGate />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="week" element={<Week />} />
          <Route path="log" element={<Log />} />
          <Route path="readiness" element={<Readiness />} />
          <Route path="coach" element={<Coach />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
