import { Check } from 'lucide-react';
import { calcularMelhorPreco } from '../utils/combos';

function formatarPreco(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

export default function ServiceSelect({ servicos, selecionados, onToggle, diaSemana }) {
  const escolhidos = servicos.filter((s) => selecionados.includes(s.id));
  const somaAvulsa = escolhidos.reduce((acc, s) => acc + s.preco, 0);
  const resultado = escolhidos.length
    ? calcularMelhorPreco(
        escolhidos.map((s) => ({ chave: s.chave || s.id, nome: s.nome, preco: s.preco })),
        diaSemana
      )
    : { total: 0, itens: [] };
  const economia = somaAvulsa - resultado.total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {servicos.map((s) => {
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
              <span style={{ flex: 1, fontWeight: 600 }}>{s.nome}</span>
              <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{formatarPreco(s.preco)}</span>
            </button>
          );
        })}
      </div>

      {escolhidos.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, marginBottom: economia > 0 ? 8 : 0 }}>
            {resultado.itens.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>{item.nome}{item.tipo === 'combo' ? ' (combo)' : ''}</span>
                <span style={{ fontWeight: 600 }}>{formatarPreco(item.preco)}</span>
              </div>
            ))}
          </div>
          {economia > 0 && (
            <p style={{ fontSize: 12, color: 'var(--success)', marginBottom: 8 }}>
              Você economiza {formatarPreco(economia)} com desconto de combo.
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 16 }}>{formatarPreco(resultado.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
