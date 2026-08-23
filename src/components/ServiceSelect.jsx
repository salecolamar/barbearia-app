import { Check } from 'lucide-react';

function formatarPreco(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

function formatarDuracao(min) {
  if (min < 60) return `${min} min`;
  const horas = Math.floor(min / 60);
  const resto = min % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${resto}min`;
}

export default function ServiceSelect({ servicos, selecionados, onToggle, diaSemana }) {
  const disponiveis = servicos.filter((s) => !s.diasPermitidos || s.diasPermitidos.includes(diaSemana));
  const escolhidos = disponiveis.filter((s) => selecionados.includes(s.id));
  const total = escolhidos.reduce((acc, s) => acc + (s.preco || 0), 0);
  const duracaoTotal = escolhidos.reduce((acc, s) => acc + (s.duracaoMin || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {disponiveis.map((s) => {
          const ativo = selecionados.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s)}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                cursor: 'pointer',
                border: ativo ? '1px solid var(--gold)' : '1px solid var(--border)',
                background: ativo ? 'rgba(201,162,39,0.08)' : 'var(--panel)',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  flexShrink: 0,
                  border: ativo ? 'none' : '1px solid var(--border)',
                  background: ativo ? 'var(--gold)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {ativo && <Check size={14} color="#1a1400" strokeWidth={3} />}
              </div>
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, display: 'block' }}>{s.nome}</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatarDuracao(s.duracaoMin)}</span>
              </span>
              <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{formatarPreco(s.preco)}</span>
            </button>
          );
        })}
      </div>

      {escolhidos.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, marginBottom: 8 }}>
            {escolhidos.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>{s.nome}</span>
                <span style={{ fontWeight: 600 }}>{formatarPreco(s.preco)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-dim)', marginBottom: 6 }}>
            <span>Tempo total</span>
            <span>{formatarDuracao(duracaoTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 16 }}>{formatarPreco(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
