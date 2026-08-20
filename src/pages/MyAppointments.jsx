import { useEffect, useState } from 'react';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { CalendarX2, Search } from 'lucide-react';
import { db } from '../firebase';
import { getClienteSalvo, salvarCliente } from '../utils/storage';
import { dateToStr } from '../utils/slots';

export default function MyAppointments() {
  const clienteSalvo = getClienteSalvo();
  const [telefone, setTelefone] = useState(clienteSalvo?.telefone || '');
  const [buscou, setBuscou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [agendamentos, setAgendamentos] = useState([]);
  const [cancelando, setCancelando] = useState(null);

  async function buscar(e) {
    e?.preventDefault();
    if (!telefone.trim()) return;
    setCarregando(true);
    setBuscou(true);
    salvarCliente({ nome: clienteSalvo?.nome || '', telefone: telefone.trim() });
    const snap = await getDocs(query(collection(db, 'agendamentos'), where('clienteTelefone', '==', telefone.trim())));
    const lista = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    setAgendamentos(lista);
    setCarregando(false);
  }

  useEffect(() => {
    if (clienteSalvo?.telefone) buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelar(id) {
    setCancelando(id);
    await updateDoc(doc(db, 'agendamentos', id), { status: 'cancelado' });
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelado' } : a)));
    setCancelando(null);
  }

  const hojeStr = dateToStr(new Date());

  return (
    <div style={{ paddingTop: 8 }}>
      <form onSubmit={buscar} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Seu WhatsApp (com DDD)"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          inputMode="tel"
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }}>
          <Search size={18} />
        </button>
      </form>

      {carregando && <p style={{ color: 'var(--text-dim)' }}>Buscando…</p>}

      {!carregando && buscou && agendamentos.length === 0 && (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 30 }}>
          Nenhum agendamento encontrado para esse número.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {agendamentos.map((a) => {
          const passado = a.data < hojeStr || (a.data === hojeStr && false);
          const cancelavel = a.status === 'confirmado' && a.data >= hojeStr;
          return (
            <div key={a.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.servicoNome}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
                    {new Date(`${a.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} ·{' '}
                    {a.hora} · {a.barbeiroNome}
                  </div>
                </div>
                <StatusChip status={a.status} passado={passado} />
              </div>

              {cancelavel && (
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ marginTop: 12, width: '100%' }}
                  onClick={() => cancelar(a.id)}
                  disabled={cancelando === a.id}
                >
                  <CalendarX2 size={16} /> {cancelando === a.id ? 'Cancelando…' : 'Cancelar horário'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusChip({ status, passado }) {
  if (status === 'cancelado') return <span className="chip chip-danger">Cancelado</span>;
  if (status === 'concluido' || passado) return <span className="chip" style={{ background: 'var(--panel-2)', color: 'var(--text-dim)' }}>Concluído</span>;
  return <span className="chip chip-gold">Confirmado</span>;
}
