import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { Banknote, Bell, Check, ChevronLeft, Clock, CreditCard, QrCode, Scissors, User, Wallet } from 'lucide-react';
import { db } from '../firebase';
import { pedirTokenNotificacao } from '../notifications';
import { getClienteSalvo, salvarCliente } from '../utils/storage';
import { dateToStr, escolherBarbeiroDisponivel, getHorariosComStatus, proximosDias, strToDate } from '../utils/slots';
import DayStrip from '../components/DayStrip';
import TimeSlotGrid from '../components/TimeSlotGrid';
import ServiceSelect from '../components/ServiceSelect';

export default function Booking({ forcarCadastro = false }) {
  const clienteSalvo = forcarCadastro ? null : getClienteSalvo();
  const [passo, setPasso] = useState(clienteSalvo ? 'horario' : 'cadastro');
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [barbeiros, setBarbeiros] = useState([]);
  const [config, setConfig] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [servicosSelecionadosIds, setServicosSelecionadosIds] = useState([]);

  const [nome, setNome] = useState(clienteSalvo?.nome || '');
  const [telefone, setTelefone] = useState(clienteSalvo?.telefone || '');
  const [aniversario, setAniversario] = useState('');

  const dias = useMemo(() => proximosDias(21), []);
  const [dataStr, setDataStr] = useState(dateToStr(new Date()));
  const [hora, setHora] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ativandoLembrete, setAtivandoLembrete] = useState(false);
  const [lembreteAtivo, setLembreteAtivo] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState(null);
  const [barbeiroEscolhido, setBarbeiroEscolhido] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        const [barbeirosSnap, servicosSnap, configSnap] = await Promise.all([
          getDocs(collection(db, 'barbeiros')),
          getDocs(collection(db, 'servicos')),
          getDoc(doc(db, 'config', 'geral')),
        ]);
        setBarbeiros(barbeirosSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => b.ativo !== false));
        setServicos(servicosSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.ativo !== false));
        setConfig(configSnap.exists() ? configSnap.data() : null);
      } catch (err) {
        console.error('Falha ao carregar dados da barbearia:', err);
        setErroCarregamento(true);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  useEffect(() => {
    if (!config || barbeiros.length === 0) return;
    buscarHorarios(dataStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, barbeiros, dataStr]);

  async function buscarHorarios(str) {
    setHora(null);
    setCarregandoHorarios(true);
    const snap = await getDocs(query(collection(db, 'agendamentos'), where('data', '==', str)));
    const agendamentosDoDia = snap.docs.map((d) => d.data());
    const lista = getHorariosComStatus({
      dateStr: str,
      duracaoMin: config.intervaloMin || 30,
      horariosConfig: config.horarios,
      intervaloMin: config.intervaloMin || 30,
      barbeiros,
      agendamentosDoDia,
    });
    setHorarios(lista);
    setCarregandoHorarios(false);
  }

  async function confirmarCadastro(e) {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) return;
    salvarCliente({ nome: nome.trim(), telefone: telefone.trim() });
    setDoc(
      doc(db, 'clientes', telefone.trim()),
      {
        nome: nome.trim(),
        telefone: telefone.trim(),
        ...(aniversario ? { aniversario } : {}),
        atualizadoEm: serverTimestamp(),
      },
      { merge: true }
    ).catch((err) => console.error('Falha ao salvar dados do cliente:', err));
    setPasso('horario');
  }

  async function escolherHorario(h) {
    setCarregandoHorarios(true);
    const snap = await getDocs(query(collection(db, 'agendamentos'), where('data', '==', dataStr)));
    const agendamentosDoDia = snap.docs.map((d) => d.data());
    const barbeiro = escolherBarbeiroDisponivel({
      hora: h,
      duracaoMin: config.intervaloMin || 30,
      barbeiros,
      agendamentosDoDia,
    });
    setCarregandoHorarios(false);
    if (!barbeiro) {
      await buscarHorarios(dataStr);
      setErro('Esse horário acabou de ser ocupado. Escolha outro.');
      return;
    }
    setErro('');
    setBarbeiroEscolhido(barbeiro);
    setHora(h);
    setPasso('servicos');
  }

  function alternarServico(servico) {
    setServicosSelecionadosIds((prev) =>
      prev.includes(servico.id) ? prev.filter((id) => id !== servico.id) : [...prev, servico.id]
    );
  }

  function calcularResumoServicos() {
    const escolhidos = servicos.filter((s) => servicosSelecionadosIds.includes(s.id));
    if (escolhidos.length === 0) return { total: 0, duracaoTotal: 0, itens: [] };
    return {
      total: escolhidos.reduce((acc, s) => acc + (s.preco || 0), 0),
      duracaoTotal: escolhidos.reduce((acc, s) => acc + (s.duracaoMin || 0), 0),
      itens: escolhidos.map((s) => ({ nome: s.nome, preco: s.preco })),
    };
  }

  async function confirmarServicos() {
    const resumoServicos = calcularResumoServicos();
    const duracaoTotal = resumoServicos.duracaoTotal || config.intervaloMin || 30;
    setCarregandoHorarios(true);
    setErro('');
    const snap = await getDocs(query(collection(db, 'agendamentos'), where('data', '==', dataStr)));
    const agendamentosDoDia = snap.docs.map((d) => d.data());
    const barbeiro = escolherBarbeiroDisponivel({
      hora,
      duracaoMin: duracaoTotal,
      barbeiros,
      agendamentosDoDia,
    });
    setCarregandoHorarios(false);
    if (!barbeiro) {
      setErro('Esse serviço não cabe mais nesse horário. Escolha outro horário.');
      await buscarHorarios(dataStr);
      setPasso('horario');
      return;
    }
    setBarbeiroEscolhido(barbeiro);
    setPasso('revisao');
  }

  async function confirmarAgendamento() {
    if (!formaPagamento) {
      setErro('Escolha a forma de pagamento.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      const resumoServicos = calcularResumoServicos();
      const docRef = await addDoc(collection(db, 'agendamentos'), {
        barbeiroId: barbeiroEscolhido.id,
        barbeiroNome: barbeiroEscolhido.nome,
        servicoDuracao: resumoServicos.duracaoTotal || config.intervaloMin || 30,
        servicos: servicos.filter((s) => servicosSelecionadosIds.includes(s.id)).map((s) => ({ id: s.id, nome: s.nome })),
        valorItens: resumoServicos.itens,
        valorTotal: resumoServicos.total,
        formaPagamento,
        data: dataStr,
        hora,
        clienteNome: nome.trim(),
        clienteTelefone: telefone.trim(),
        status: 'confirmado',
        fcmToken: null,
        lembreteEnviado: false,
        criadoEm: serverTimestamp(),
      });
      setAgendamentoId(docRef.id);
      setPasso('confirmado');
      fetch('/api/notify-new-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendamentoId: docRef.id }),
      }).catch(() => {});
    } catch (err) {
      console.error(err);
      setErro('Não foi possível confirmar o agendamento. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function ativarLembrete() {
    setAtivandoLembrete(true);
    const token = await pedirTokenNotificacao();
    if (token && agendamentoId) {
      await updateDoc(doc(db, 'agendamentos', agendamentoId), { fcmToken: token });
      setLembreteAtivo(true);
    }
    setAtivandoLembrete(false);
  }

  function novoAgendamento() {
    setDataStr(dateToStr(new Date()));
    setHora(null);
    setBarbeiroEscolhido(null);
    setServicosSelecionadosIds([]);
    setAgendamentoId(null);
    setLembreteAtivo(false);
    setFormaPagamento('');
    setPasso('horario');
  }

  if (carregando) {
    return <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 40 }}>Carregando…</p>;
  }

  if (erroCarregamento) {
    return (
      <div className="card" style={{ marginTop: 20, textAlign: 'center', color: 'var(--danger)' }}>
        Não foi possível conectar ao servidor da barbearia. Verifique sua internet ou tente novamente
        em instantes.
      </div>
    );
  }

  if (!barbeiros.length || !config) {
    return (
      <div className="card" style={{ marginTop: 20, textAlign: 'center', color: 'var(--text-dim)' }}>
        A barbearia ainda não configurou os barbeiros ou horários. Peça para o administrador acessar
        o painel em <strong>/admin</strong>.
      </div>
    );
  }

  return (
    <div>
      {passo === 'servicos' && (
        <button type="button" onClick={() => setPasso('horario')} style={backBtnStyle}>
          <ChevronLeft size={18} /> Voltar
        </button>
      )}
      {passo === 'revisao' && (
        <button type="button" onClick={() => setPasso('servicos')} style={backBtnStyle}>
          <ChevronLeft size={18} /> Voltar
        </button>
      )}

      {passo === 'cadastro' && (
        <Etapa titulo="Seus dados" icone={<User size={18} />}>
          <form onSubmit={confirmarCadastro} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            <input
              placeholder="Seu WhatsApp (com DDD)"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              inputMode="tel"
              required
            />
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
                Aniversário (opcional)
              </label>
              <input type="date" value={aniversario} onChange={(e) => setAniversario(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Continuar
            </button>
          </form>
        </Etapa>
      )}

      {passo === 'horario' && (
        <Etapa titulo="Escolha o horário" icone={<Clock size={18} />}>
          <DayStrip dias={dias} dataStr={dataStr} onSelect={setDataStr} />

          {erro && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -4 }}>{erro}</p>}

          <div style={{ marginTop: 4 }}>
            <TimeSlotGrid horarios={horarios} carregando={carregandoHorarios} onSelect={escolherHorario} />
          </div>
        </Etapa>
      )}

      {passo === 'servicos' && (
        <Etapa titulo="Escolha o serviço" icone={<Scissors size={18} />}>
          {servicos.length === 0 ? (
            <p style={{ color: 'var(--text-dim)' }}>
              A barbearia ainda não cadastrou os serviços. Peça para o administrador acessar o painel em{' '}
              <strong>/admin</strong>.
            </p>
          ) : (
            <>
              <ServiceSelect
                servicos={servicos}
                selecionados={servicosSelecionadosIds}
                onToggle={alternarServico}
                diaSemana={strToDate(dataStr).getDay()}
              />
              {erro && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{erro}</p>}
              <button
                type="button"
                className="btn btn-primary btn-block"
                style={{ marginTop: 4 }}
                disabled={servicosSelecionadosIds.length === 0 || carregandoHorarios}
                onClick={confirmarServicos}
              >
                {carregandoHorarios ? 'Verificando…' : 'Continuar'}
              </button>
            </>
          )}
        </Etapa>
      )}

      {passo === 'revisao' && (
        <Etapa titulo="Confirmar agendamento" icone={<Check size={18} />}>
          <div className="card">
            <Resumo nome={nome} dataStr={dataStr} hora={hora} resumoServicos={calcularResumoServicos()} formaPagamento={formaPagamento} />
          </div>

          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', display: 'block', marginBottom: 8 }}>
              Forma de pagamento
            </span>
            <FormaPagamentoSelect selecionado={formaPagamento} onSelect={setFormaPagamento} />
          </div>

          {erro && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{erro}</p>}
          <button type="button" className="btn btn-primary btn-block" onClick={confirmarAgendamento} disabled={salvando}>
            {salvando ? 'Confirmando…' : 'Confirmar agendamento'}
          </button>
        </Etapa>
      )}

      {passo === 'confirmado' && (
        <div style={{ textAlign: 'center', paddingTop: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(76,175,125,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Check size={32} color="var(--success)" />
          </div>
          <h2>Horário marcado!</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: 6 }}>Te esperamos na barbearia.</p>

          <div className="card" style={{ marginTop: 20, textAlign: 'left' }}>
            <Resumo nome={nome} dataStr={dataStr} hora={hora} resumoServicos={calcularResumoServicos()} formaPagamento={formaPagamento} />
          </div>

          {!lembreteAtivo ? (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 16 }}
              onClick={ativarLembrete}
              disabled={ativandoLembrete}
            >
              <Bell size={16} /> {ativandoLembrete ? 'Ativando…' : 'Avisar quando estiver perto do horário'}
            </button>
          ) : (
            <p style={{ marginTop: 16, color: 'var(--success)', fontSize: 14 }}>
              <Bell size={14} style={{ verticalAlign: -2 }} /> Lembrete ativado.
            </p>
          )}

          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={novoAgendamento}>
            Agendar outro horário
          </button>
        </div>
      )}
    </div>
  );
}

function Etapa({ titulo, icone, children }) {
  return (
    <section style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--gold)' }}>
        {icone}
        <h2 style={{ fontSize: 17 }}>{titulo}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  );
}

const FORMAS_PAGAMENTO = [
  { valor: 'Dinheiro', icone: Banknote },
  { valor: 'Crédito', icone: CreditCard },
  { valor: 'Débito', icone: Wallet },
  { valor: 'PIX', icone: QrCode },
];

function FormaPagamentoSelect({ selecionado, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {FORMAS_PAGAMENTO.map(({ valor, icone: Icone }) => {
        const ativo = selecionado === valor;
        return (
          <button
            key={valor}
            type="button"
            onClick={() => onSelect(valor)}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '12px 10px',
              fontWeight: 600,
              border: ativo ? '1px solid var(--gold)' : '1px solid var(--border)',
              background: ativo ? 'rgba(201,162,39,0.08)' : 'var(--panel)',
              color: ativo ? 'var(--gold)' : 'var(--text)',
            }}
          >
            <Icone size={16} />
            {valor}
          </button>
        );
      })}
    </div>
  );
}

function Resumo({ nome, dataStr, hora, resumoServicos, formaPagamento }) {
  const d = dataStr ? new Date(`${dataStr}T00:00:00`) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
      <Linha label="Nome" valor={nome} />
      <Linha label="Data" valor={d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : ''} />
      <Linha label="Horário" valor={hora} />
      {formaPagamento && <Linha label="Pagamento" valor={formaPagamento} />}
      {resumoServicos && resumoServicos.itens.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          {resumoServicos.itens.map((item, i) => (
            <Linha key={i} label={item.nome} valor={`R$ ${item.preco.toFixed(2).replace('.', ',')}`} />
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 700, color: 'var(--gold)' }}>
              R$ {resumoServicos.total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Linha({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{valor}</span>
    </div>
  );
}

const backBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'transparent',
  border: 'none',
  color: 'var(--text-dim)',
  padding: '10px 0',
  cursor: 'pointer',
  fontSize: 14,
};
