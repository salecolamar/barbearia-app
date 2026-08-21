import { useEffect, useState } from 'react';
import { Calendar, Home as HomeIcon, ListChecks, Scissors } from 'lucide-react';
import { authReady } from './firebase';
import HomePage from './pages/Home';
import Booking from './pages/Booking';
import MyAppointments from './pages/MyAppointments';
import Admin from './pages/Admin';

const abaInicial = new URLSearchParams(window.location.search).get('tab') === 'agendar' ? 'agendar' : 'inicio';
const forcarNovoCliente = new URLSearchParams(window.location.search).get('novo') === '1';

export default function App() {
  const [authOk, setAuthOk] = useState(false);
  const [aba, setAba] = useState(abaInicial);
  const isAdmin = window.location.pathname.startsWith('/admin');

  useEffect(() => {
    authReady.then(() => setAuthOk(true));
  }, []);

  if (!authOk) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', color: 'var(--text-dim)' }}>
        Carregando…
      </div>
    );
  }

  if (isAdmin) return <Admin />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 14px' }}>
        <Scissors size={22} color="var(--gold)" />
        <h1 style={{ fontSize: 20 }}>Sistema de Agendamento</h1>
      </header>

      <main style={{ flex: 1, padding: '0 16px 90px' }}>
        {aba === 'inicio' && <HomePage irParaAgendar={() => setAba('agendar')} />}
        {aba === 'agendar' && <Booking forcarCadastro={forcarNovoCliente} />}
        {aba === 'meus' && <MyAppointments />}
      </main>

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 520,
          display: 'flex',
          borderTop: '1px solid var(--border)',
          background: 'var(--panel)',
        }}
      >
        <button type="button" onClick={() => setAba('inicio')} style={navBtnStyle(aba === 'inicio')}>
          <HomeIcon size={20} />
          Início
        </button>
        <button type="button" onClick={() => setAba('agendar')} style={navBtnStyle(aba === 'agendar')}>
          <Calendar size={20} />
          Agendar
        </button>
        <button type="button" onClick={() => setAba('meus')} style={navBtnStyle(aba === 'meus')}>
          <ListChecks size={20} />
          Meus horários
        </button>
      </nav>
    </div>
  );
}

function navBtnStyle(ativo) {
  return {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
    background: 'transparent',
    border: 'none',
    color: ativo ? 'var(--gold)' : 'var(--text-dim)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  };
}
