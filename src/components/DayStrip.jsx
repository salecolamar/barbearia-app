import { useMemo, useRef } from 'react';
import { DIAS_SEMANA_ABREV, dateToStr } from '../utils/slots';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function DayStrip({ dias, dataStr, onSelect }) {
  const scrollRef = useRef(null);
  const hoje = useMemo(() => dateToStr(new Date()), []);
  const selecionado = dias.find((d) => dateToStr(d) === dataStr) || dias[0];

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
        {capitalizar(MESES[selecionado.getMonth()])} de {selecionado.getFullYear()}
      </p>
      <div
        ref={scrollRef}
        style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x proximity' }}
      >
        {dias.map((d) => {
          const str = dateToStr(d);
          const ativo = str === dataStr;
          const ehHoje = str === hoje;
          return (
            <button
              key={str}
              type="button"
              onClick={() => onSelect(str)}
              style={{
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                textAlign: 'center',
                width: 52,
                padding: '9px 0',
                borderRadius: 14,
                border: ativo ? '1px solid var(--gold)' : '1px solid var(--border)',
                background: ativo ? 'var(--gold)' : 'var(--panel)',
                color: ativo ? '#1a1400' : 'var(--text)',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, opacity: ativo ? 0.75 : 0.6, textTransform: 'uppercase' }}>
                {ehHoje && !ativo ? 'Hoje' : DIAS_SEMANA_ABREV[d.getDay()]}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{d.getDate()}</div>
              {ehHoje && (
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: ativo ? '#1a1400' : 'var(--gold)',
                    margin: '4px auto 0',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
