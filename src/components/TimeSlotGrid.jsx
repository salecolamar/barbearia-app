import { CalendarX2, Clock, Moon, Sun, Sunrise } from 'lucide-react';
import { timeToMinutes } from '../utils/slots';

const PERIODOS = [
  { chave: 'manha', label: 'Manhã', icone: Sunrise, ate: 12 * 60 },
  { chave: 'tarde', label: 'Tarde', icone: Sun, ate: 18 * 60 },
  { chave: 'noite', label: 'Noite', icone: Moon, ate: Infinity },
];

function agrupar(horarios) {
  const grupos = { manha: [], tarde: [], noite: [] };
  for (const h of horarios) {
    const min = timeToMinutes(h);
    const periodo = PERIODOS.find((p) => min < p.ate);
    grupos[periodo.chave].push(h);
  }
  return grupos;
}

export default function TimeSlotGrid({ horarios, carregando, onSelect }) {
  if (carregando) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 46, borderRadius: 12, background: 'var(--panel-2)', opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  if (horarios.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-dim)' }}>
        <CalendarX2 size={28} style={{ marginBottom: 8, opacity: 0.6 }} />
        <p style={{ fontSize: 14 }}>Sem horários livres nesse dia.</p>
        <p style={{ fontSize: 13, marginTop: 2 }}>Toque em outra data acima para ver outras opções.</p>
      </div>
    );
  }

  const grupos = agrupar(horarios);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={13} /> {horarios.length} horário{horarios.length !== 1 ? 's' : ''} disponíve{horarios.length !== 1 ? 'is' : 'l'}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {lista.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onSelect(h)}
                  style={{
                    padding: '11px 0',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--panel)',
                    color: 'var(--text)',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gold)';
                    e.currentTarget.style.background = 'rgba(201,162,39,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--panel)';
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
