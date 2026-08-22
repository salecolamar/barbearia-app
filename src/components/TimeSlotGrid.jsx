import { CalendarX2, Clock, Moon, Sun, Sunrise } from 'lucide-react';
import { timeToMinutes } from '../utils/slots';

const PERIODOS = [
  { chave: 'manha', label: 'Manhã', icone: Sunrise, ate: 12 * 60 },
  { chave: 'tarde', label: 'Tarde', icone: Sun, ate: 18 * 60 },
  { chave: 'noite', label: 'Noite', icone: Moon, ate: Infinity },
];

function agrupar(horarios) {
  const grupos = { manha: [], tarde: [], noite: [] };
  for (const item of horarios) {
    const min = timeToMinutes(item.hora);
    const periodo = PERIODOS.find((p) => min < p.ate);
    grupos[periodo.chave].push(item);
  }
  return grupos;
}

export default function TimeSlotGrid({ horarios, carregando, onSelect }) {
  if (carregando) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 46, borderRadius: 12, background: 'var(--panel-2)', opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  if (horarios.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-dim)' }}>
        <CalendarX2 size={28} style={{ marginBottom: 8, opacity: 0.6 }} />
        <p style={{ fontSize: 14 }}>Sem horários nesse dia.</p>
        <p style={{ fontSize: 13, marginTop: 2 }}>Toque em outra data acima para ver outras opções.</p>
      </div>
    );
  }

  const livres = horarios.filter((h) => h.status === 'livre').length;
  const grupos = agrupar(horarios);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={13} /> {livres} horário{livres !== 1 ? 's' : ''} livre{livres !== 1 ? 's' : ''}
      </p>

      {PERIODOS.map((p) => {
        const lista = grupos[p.chave];
        if (lista.length === 0) return null;
        const Icone = p.icone;
        return (
          <div key={p.chave}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--gold)', fontSize: 13, fontWeight: 700 }}>
              <Icone size={14} />
              {p.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {lista.map((item) => (
                <SlotBotao key={item.hora} item={item} onSelect={onSelect} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SlotBotao({ item, onSelect }) {
  const livre = item.status === 'livre';
  const ocupado = item.status === 'ocupado';

  return (
    <button
      type="button"
      disabled={!livre}
      onClick={() => livre && onSelect(item.hora)}
      title={ocupado && item.clienteNome ? `Ocupado: ${item.clienteNome}` : undefined}
      style={{
        padding: '8px 4px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--panel)',
        color: livre ? 'var(--text)' : 'var(--text-dim)',
        fontWeight: 700,
        fontSize: 14,
        cursor: livre ? 'pointer' : 'not-allowed',
        opacity: livre ? 1 : 0.5,
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        if (!livre) return;
        e.currentTarget.style.borderColor = 'var(--gold)';
        e.currentTarget.style.background = 'rgba(201,162,39,0.08)';
      }}
      onMouseLeave={(e) => {
        if (!livre) return;
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--panel)';
      }}
    >
      <span>{item.hora}</span>
      {ocupado && item.clienteNome && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--danger)',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.clienteNome}
        </span>
      )}
    </button>
  );
}
