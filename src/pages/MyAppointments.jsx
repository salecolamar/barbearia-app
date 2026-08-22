import { useEffect, useState } from 'react';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { CalendarX2, Pencil, Search, X } from 'lucide-react';
import { db } from '../firebase';
import { getClienteSalvo, salvarCliente } from '../utils/storage';
import { dateToStr, strToDate } from '../utils/slots';
import { calcularMelhorPreco } from '../utils/combos';
import ServiceSelect from '../components/ServiceSelect';

export default function MyAppointments() {
  const clienteSalvo = getClienteSalvo();
  const [telefone, setTelefone] = useState(clienteSalvo?.telefone || '');
  const [buscou, setBuscou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [agendamentos, setAgendamentos] = useState([]);
  const [cancelando, setCancelando] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [selecionadosIds, setSelecionadosIds] = useState([]);
  const [salvandoServicos, setSalvandoServicos] = useState(false);

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
    getDocs(collection(db, 'servicos')).then((snap) => {
      setServicos(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.ativo !== false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelar(id) {
    setCancelando(id);
    await updateDoc(doc(db, 'agendamentos', id), { status: 'cancelado' });
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelado' } : a)));
    setCancelando(null);
  }

  function abrirEdicao(a) {
    setEditandoId(a.id);
    setSelecionadosIds((a.servicos || []).map((s) => s.id));
  }

  function fecharEdicao() {
    setEditandoId(null);
    setSelecionadosIds([]);
  }

  function alternarServico(servico) {
    setSelecionadosIds((prev) => (prev.includes(servico.id) ? prev.filter((id) => id !== servico.id) : [...prev, servico.id]));
  }

  async function salvarServicos(a) {
    setSalvandoServicos(true);
    const escolhidos = servicos.filter((s) => selecionadosIds.includes(s.id));
    const resumo = escolhidos.length
      ? calcularMelhorPreco(escolhidos.map((s) => ({ chave: s.chave || s.id, nome: s.nome, preco: s.preco })), strToDate(a.data).getDay())
      : { total: 0, itens: [] };
    const dados = {
      servicos: escolhidos.map((s) => ({ id: s.id, nome: s.nome })),
      valorItens: resumo.itens,
      valorTotal: resumo.total,
    };
    await updateDoc(doc(db, 'agendamentos', a.id), dados);
    setAgendamentos((prev) => prev.map((item) => (item.id === a.id ? { ...item, ...dados } : item)));
    setSalvandoServicos(false);
    fecharEdicao();
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
          const editando = editandoId === a.id;
          return (
            <div key={a.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {new Date(`${a.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {a.hora}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>Com {a.barbeiroNome}</div>
                  {a.servicos?.length > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>{a.servicos.map((s) => s.nome).join(', ')}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusChip status={a.status} passado={passado} />
                  {a.valorTotal > 0 && (
                    <div style={{ marginTop: 6, fontWeight: 700, color: 'var(--gold)', fontSize: 14 }}>
                      R$ {a.valorTotal.toFixed(2).replace('.', ',')}
                    </div>
                  )}
                </div>
              </div>

              {cancelavel && !editando && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => abrirEdicao(a)}>
                    <Pencil size={14} /> Serviços
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => cancelar(a.id)}
                    disabled={cancelando === a.id}
                  >
                    <CalendarX2 size={14} /> {cancelando === a.id ? 'Cancelando…' : 'Cancelar'}
                  </button>
                </div>
              )}

              {editando && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>Editar serviços</span>
                    <button type="button" onClick={fecharEdicao} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>
                  <ServiceSelect
                    servicos={servicos}
                    selecionados={selecionadosIds}
                    onToggle={alternarServico}
                    diaSemana={strToDate(a.data).getDay()}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    style={{ marginTop: 12 }}
                    disabled={selecionadosIds.length === 0 || salvandoServicos}
                    onClick={() => salvarServicos(a)}
                  >
                    {salvandoServicos ? 'Salvando…' : 'Salvar serviços'}
                  </button>
                </div>
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
  if (status === 'faltou') return <span className="chip chip-danger">Não compareceu</span>;
  if (status === 'concluido' || passado) return <span className="chip" style={{ background: 'var(--panel-2)', color: 'var(--text-dim)' }}>Concluído</span>;
  return <span className="chip chip-gold">Confirmado</span>;
}
