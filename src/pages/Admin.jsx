import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Banknote,
  BarChart3,
  Bell,
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Lock,
  Pencil,
  Phone,
  Plus,
  QrCode,
  Repeat,
  Scissors,
  Search,
  Settings,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
  UserX,
  Wallet,
} from 'lucide-react';
import { db } from '../firebase';
import { pedirTokenNotificacao } from '../notifications';
import { DIAS_SEMANA, DIAS_SEMANA_ABREV, dateToStr, fimMes, fimSemana, inicioMes, inicioSemana } from '../utils/slots';

const SESSION_KEY = 'barbearia:admin-ok';
const NOTIF_KEY = 'barbearia:admin-notif-ok';

const HORARIOS_PADRAO = Array.from({ length: 7 }, (_, dia) => ({
  aberto: dia !== 0,
  inicio: '09:00',
  fim: '19:00',
}));

export default function Admin() {
  const [config, setConfig] = useState(undefined); // undefined = carregando, null = não existe
  const [erro, setErro] = useState(false);
  const [liberado, setLiberado] = useState(sessionStorage.getItem(SESSION_KEY) === '1');

  useEffect(() => {
    getDoc(doc(db, 'config', 'geral'))
      .then((snap) => {
        setConfig(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      })
      .catch((err) => {
        console.error('Falha ao carregar configuração:', err);
        setErro(true);
      });
  }, []);

  if (erro) return <Centro>Não foi possível conectar ao servidor. Verifique sua internet.</Centro>;
  if (config === undefined) return <Centro>Carregando…</Centro>;

  if (config === null) {
    return <ConfiguracaoInicial onCriado={(c) => setConfig(c)} />;
  }

  if (!liberado) {
    return (
      <PinScreen
        pinCorreto={config.pin}
        onOk={() => {
          sessionStorage.setItem(SESSION_KEY, '1');
          setLiberado(true);
        }}
      />
    );
  }

  return <Dashboard config={config} setConfig={setConfig} />;
}

function Centro({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', color: 'var(--text-dim)' }}>
      {children}
    </div>
  );
}

function ConfiguracaoInicial({ onCriado }) {
  const [nome, setNome] = useState('Minha Barbearia');
  const [pin, setPin] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function criar(e) {
    e.preventDefault();
    if (pin.length < 4) return;
    setSalvando(true);
    const novo = { nomeBarbearia: nome.trim() || 'Minha Barbearia', pin, intervaloMin: 30, horarios: HORARIOS_PADRAO };
    await setDoc(doc(db, 'config', 'geral'), novo);
    sessionStorage.setItem(SESSION_KEY, '1');
    onCriado({ id: 'geral', ...novo });
    setSalvando(false);
  }

  return (
    <Centro>
      <form onSubmit={criar} className="card" style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>Configuração inicial</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Primeira vez aqui. Defina o nome da barbearia e um PIN para proteger o painel.</p>
        <input placeholder="Nome da barbearia" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input
          placeholder="PIN (mínimo 4 dígitos)"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          type="password"
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={salvando}>
          Criar painel
        </button>
      </form>
    </Centro>
  );
}

function PinScreen({ pinCorreto, onOk }) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState(false);

  function entrar(e) {
    e.preventDefault();
    if (pin === pinCorreto) onOk();
    else setErro(true);
  }

  return (
    <Centro>
      <form onSubmit={entrar} className="card" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
        <Lock size={24} color="var(--gold)" style={{ margin: '0 auto' }} />
        <h2 style={{ fontSize: 17 }}>Painel do barbeiro</h2>
        <input
          placeholder="PIN"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''));
            setErro(false);
          }}
          inputMode="numeric"
          type="password"
          autoFocus
        />
        {erro && <p style={{ color: 'var(--danger)', fontSize: 13 }}>PIN incorreto.</p>}
        <button type="submit" className="btn btn-primary btn-block">
          Entrar
        </button>
      </form>
    </Centro>
  );
}

function Dashboard({ config, setConfig }) {
  const [aba, setAba] = useState('agendados');

  return (
    <div style={{ paddingBottom: 90 }}>
      <header style={{ padding: '18px 20px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 19 }}>{config.nomeBarbearia}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Painel do barbeiro</p>
        </div>
        <NotificacoesBarbeiro />
      </header>

      <div style={{ padding: '0 16px 14px' }}>
        <a href="/?tab=agendar&novo=1" className="btn btn-secondary btn-block">
          <CalendarPlus size={16} /> Agendar para um cliente
        </a>
      </div>

      <div style={{ padding: '0 16px' }}>
        {aba === 'agendados' && <AgendaTab />}
        {aba === 'financeiro' && <FinanceiroTab />}
        {aba === 'clientes' && <ClientesTab />}
        {aba === 'barbeiros' && <BarbeirosTab />}
        {aba === 'servicos' && <ServicosTab />}
        {aba === 'horarios' && <HorariosTab config={config} setConfig={setConfig} />}
        {aba === 'perfil' && <PerfilTab config={config} setConfig={setConfig} />}
      </div>

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
        <TabBtn ativo={aba === 'agendados'} onClick={() => setAba('agendados')} icone={<Calendar size={19} />} label="Agendados" />
        <TabBtn ativo={aba === 'financeiro'} onClick={() => setAba('financeiro')} icone={<Wallet size={19} />} label="Financeiro" />
        <TabBtn ativo={aba === 'clientes'} onClick={() => setAba('clientes')} icone={<UserRound size={19} />} label="Clientes" />
        <TabBtn ativo={aba === 'barbeiros'} onClick={() => setAba('barbeiros')} icone={<Users size={19} />} label="Barbeiros" />
        <TabBtn ativo={aba === 'servicos'} onClick={() => setAba('servicos')} icone={<Scissors size={19} />} label="Serviços" />
        <TabBtn ativo={aba === 'horarios'} onClick={() => setAba('horarios')} icone={<Settings size={19} />} label="Horários" />
        <TabBtn ativo={aba === 'perfil'} onClick={() => setAba('perfil')} icone={<Store size={19} />} label="Perfil" />
      </nav>
    </div>
  );
}

function NotificacoesBarbeiro() {
  const [ativo, setAtivo] = useState(localStorage.getItem(NOTIF_KEY) === '1');
  const [carregando, setCarregando] = useState(false);

  async function ativar() {
    setCarregando(true);
    const token = await pedirTokenNotificacao();
    if (token) {
      await updateDoc(doc(db, 'config', 'geral'), { barberTokens: arrayUnion(token) });
      localStorage.setItem(NOTIF_KEY, '1');
      setAtivo(true);
    }
    setCarregando(false);
  }

  if (ativo) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--success)' }}>
        <Bell size={14} /> Notificações ativas
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={ativar}
      disabled={carregando}
      className="btn btn-secondary"
      style={{ padding: '8px 10px', fontSize: 12 }}
    >
      <Bell size={14} /> {carregando ? 'Ativando…' : 'Ativar notificações'}
    </button>
  );
}

function TabBtn({ ativo, onClick, icone, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
        background: 'transparent',
        border: 'none',
        color: ativo ? 'var(--gold)' : 'var(--text-dim)',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {icone}
      {label}
    </button>
  );
}

// ---------- Agendados ----------

function AgendaTab() {
  const [data, setData] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [historico, setHistorico] = useState(null);
  const [barbeiros, setBarbeiros] = useState([]);
  const [bloqueando, setBloqueando] = useState(false);
  const [horaBloqueio, setHoraBloqueio] = useState('12:00');
  const [motivoBloqueio, setMotivoBloqueio] = useState('');
  const [barbeiroBloqueioId, setBarbeiroBloqueioId] = useState('');
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false);
  const dataStr = dateToStr(data);

  useEffect(() => {
    setCarregando(true);
    const q = query(collection(db, 'agendamentos'), where('data', '==', dataStr));
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.hora.localeCompare(b.hora));
      setAgendamentos(lista);
      setCarregando(false);
    });
    return unsub;
  }, [dataStr]);

  useEffect(() => {
    getDocs(collection(db, 'agendamentos')).then((snap) => {
      const mapa = new Map();
      snap.docs.forEach((d) => {
        const a = d.data();
        if (a.status === 'cancelado' || a.tipo === 'bloqueio' || !a.clienteTelefone) return;
        const atual = mapa.get(a.clienteTelefone) || { total: 0, primeira: a.data };
        atual.total += 1;
        if (a.data < atual.primeira) atual.primeira = a.data;
        mapa.set(a.clienteTelefone, atual);
      });
      setHistorico(mapa);
    });
  }, []);

  useEffect(() => {
    getDocs(collection(db, 'barbeiros')).then((snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => b.ativo !== false);
      setBarbeiros(lista);
      if (lista.length > 0) setBarbeiroBloqueioId(lista[0].id);
    });
  }, []);

  function mudarDia(delta) {
    const nova = new Date(data);
    nova.setDate(nova.getDate() + delta);
    setData(nova);
  }

  async function mudarStatus(id, status) {
    await updateDoc(doc(db, 'agendamentos', id), { status });
  }

  async function excluir(id) {
    await deleteDoc(doc(db, 'agendamentos', id));
  }

  async function criarBloqueio(e) {
    e.preventDefault();
    const barbeiro = barbeiros.find((b) => b.id === barbeiroBloqueioId);
    if (!barbeiro || !horaBloqueio) return;
    setSalvandoBloqueio(true);
    await addDoc(collection(db, 'agendamentos'), {
      tipo: 'bloqueio',
      barbeiroId: barbeiro.id,
      barbeiroNome: barbeiro.nome,
      servicoDuracao: 30,
      servicos: [],
      valorTotal: 0,
      data: dataStr,
      hora: horaBloqueio,
      clienteNome: motivoBloqueio.trim() || 'Bloqueado',
      clienteTelefone: '',
      status: 'confirmado',
      fcmToken: null,
      lembreteEnviado: true,
    });
    setSalvandoBloqueio(false);
    setMotivoBloqueio('');
    setBloqueando(false);
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button type="button" onClick={() => mudarDia(-1)} className="btn btn-secondary" style={{ padding: 8 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}</div>
        </div>
        <button type="button" onClick={() => mudarDia(1)} className="btn btn-secondary" style={{ padding: 8 }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {!bloqueando ? (
        <button type="button" className="btn btn-secondary btn-block" style={{ marginBottom: 14 }} onClick={() => setBloqueando(true)}>
          <Lock size={14} /> Bloquear horário
        </button>
      ) : (
        <form onSubmit={criarBloqueio} className="card" style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {barbeiros.length > 1 && (
            <select value={barbeiroBloqueioId} onChange={(e) => setBarbeiroBloqueioId(e.target.value)}>
              {barbeiros.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          )}
          <input type="time" step="1800" value={horaBloqueio} onChange={(e) => setHoraBloqueio(e.target.value)} required />
          <input
            placeholder="Motivo (opcional, ex: Almoço)"
            value={motivoBloqueio}
            onChange={(e) => setMotivoBloqueio(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setBloqueando(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={salvandoBloqueio || barbeiros.length === 0}>
              {salvandoBloqueio ? 'Bloqueando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p style={{ color: 'var(--text-dim)' }}>Carregando…</p>
      ) : agendamentos.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 30 }}>Nenhum agendamento nesse dia.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {agendamentos.map((a) =>
            a.tipo === 'bloqueio' ? (
              <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-2)' }}>
                <div>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={13} color="var(--text-dim)" />
                    {a.hora} · {a.clienteNome}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{a.barbeiroNome}</div>
                </div>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => excluir(a.id)}>
                  Desbloquear
                </button>
              </div>
            ) : (
              <div key={a.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {a.hora} · {a.clienteNome}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
                      {a.barbeiroNome} · {a.clienteTelefone}
                    </div>
                    <HistoricoCliente historico={historico} telefone={a.clienteTelefone} />
                    {a.servicos?.length > 0 && (
                      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                        {a.servicos.map((s) => s.nome).join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={a.status} />
                    {a.valorTotal > 0 && (
                      <div style={{ marginTop: 6, fontWeight: 700, color: 'var(--gold)', fontSize: 14 }}>
                        R$ {a.valorTotal.toFixed(2).replace('.', ',')}
                      </div>
                    )}
                    {a.formaPagamento && (
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{a.formaPagamento}</div>
                    )}
                  </div>
                </div>

                {a.status === 'confirmado' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '10px 4px', fontSize: 12 }}
                      onClick={() => mudarStatus(a.id, 'concluido')}
                    >
                      <UserCheck size={13} /> Presença
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '10px 4px', fontSize: 12, color: 'var(--danger)' }}
                      onClick={() => mudarStatus(a.id, 'faltou')}
                    >
                      <UserX size={13} /> Faltou
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ flex: 1, padding: '10px 4px', fontSize: 12 }}
                      onClick={() => mudarStatus(a.id, 'cancelado')}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                {a.status !== 'confirmado' && (
                  <button type="button" className="btn btn-secondary" style={{ marginTop: 12, width: '100%' }} onClick={() => excluir(a.id)}>
                    <Trash2 size={14} /> Excluir
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function HistoricoCliente({ historico, telefone }) {
  if (!historico) return null;
  const info = historico.get(telefone);
  if (!info || info.total <= 1) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
        <Sparkles size={12} /> Cliente novo
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
      <Repeat size={12} /> {info.total}ª visita · cliente desde{' '}
      {new Date(`${info.primeira}T00:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'cancelado') return <span className="chip chip-danger">Cancelado</span>;
  if (status === 'faltou') return <span className="chip chip-danger">Faltou</span>;
  if (status === 'concluido') return <span className="chip chip-success">Compareceu</span>;
  return <span className="chip chip-gold">Confirmado</span>;
}

// ---------- Financeiro ----------

function FinanceiroTab() {
  const [periodo, setPeriodo] = useState('dia');
  const [data, setData] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const intervalo = useMemo(() => {
    if (periodo === 'semana') return { inicio: inicioSemana(data), fim: fimSemana(data) };
    if (periodo === 'mes') return { inicio: inicioMes(data), fim: fimMes(data) };
    return { inicio: data, fim: data };
  }, [periodo, data]);

  const inicioStr = dateToStr(intervalo.inicio);
  const fimStr = dateToStr(intervalo.fim);

  useEffect(() => {
    setCarregando(true);
    const q =
      periodo === 'dia'
        ? query(collection(db, 'agendamentos'), where('data', '==', inicioStr))
        : query(collection(db, 'agendamentos'), where('data', '>=', inicioStr), where('data', '<=', fimStr));
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => a.status === 'concluido')
        .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
      setAgendamentos(lista);
      setCarregando(false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, inicioStr, fimStr]);

  function mudarPeriodo(delta) {
    const nova = new Date(data);
    if (periodo === 'dia') nova.setDate(nova.getDate() + delta);
    else if (periodo === 'semana') nova.setDate(nova.getDate() + delta * 7);
    else nova.setMonth(nova.getMonth() + delta);
    setData(nova);
  }

  const total = agendamentos.reduce((soma, a) => soma + (a.valorTotal || 0), 0);

  const porFormaPagamento = useMemo(() => {
    const ordem = ['Dinheiro', 'Crédito', 'Débito', 'PIX', 'Não informado'];
    const mapa = new Map();
    agendamentos.forEach((a) => {
      const forma = a.formaPagamento || 'Não informado';
      const atual = mapa.get(forma) || { valor: 0, qtd: 0 };
      atual.valor += a.valorTotal || 0;
      atual.qtd += 1;
      mapa.set(forma, atual);
    });
    return [...mapa.entries()].sort((a, b) => ordem.indexOf(a[0]) - ordem.indexOf(b[0]));
  }, [agendamentos]);

  const porData = useMemo(() => {
    const mapa = new Map();
    agendamentos.forEach((a) => mapa.set(a.data, (mapa.get(a.data) || 0) + (a.valorTotal || 0)));
    return mapa;
  }, [agendamentos]);

  const barras = useMemo(() => {
    if (periodo === 'dia') return null;
    if (periodo === 'semana') {
      const lista = [];
      for (let d = new Date(intervalo.inicio); d <= intervalo.fim; d.setDate(d.getDate() + 1)) {
        lista.push({ label: DIAS_SEMANA_ABREV[d.getDay()], valor: porData.get(dateToStr(d)) || 0 });
      }
      return lista;
    }
    // mês: agrupa em blocos de 7 dias
    const lista = [];
    let cursor = new Date(intervalo.inicio);
    while (cursor <= intervalo.fim) {
      const inicioBloco = new Date(cursor);
      const fimBloco = new Date(Math.min(new Date(cursor).setDate(cursor.getDate() + 6), intervalo.fim.getTime()));
      let soma = 0;
      for (let d = new Date(inicioBloco); d <= fimBloco; d.setDate(d.getDate() + 1)) {
        soma += porData.get(dateToStr(d)) || 0;
      }
      lista.push({ label: `${inicioBloco.getDate()}-${fimBloco.getDate()}`, valor: soma });
      cursor = new Date(fimBloco);
      cursor.setDate(cursor.getDate() + 1);
    }
    return lista;
  }, [periodo, intervalo, porData]);

  const maxBarra = barras ? Math.max(1, ...barras.map((b) => b.valor)) : 1;

  const servicosRanking = useMemo(() => {
    const contagem = new Map();
    agendamentos.forEach((a) => {
      (a.servicos || []).forEach((s) => contagem.set(s.nome, (contagem.get(s.nome) || 0) + 1));
    });
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [agendamentos]);

  const rotuloDataBruto =
    periodo === 'dia'
      ? data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })
      : periodo === 'semana'
        ? `${intervalo.inicio.getDate()} a ${intervalo.fim.getDate()} de ${intervalo.fim.toLocaleDateString('pt-BR', { month: 'long' })}`
        : data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const rotuloData = rotuloDataBruto.charAt(0).toUpperCase() + rotuloDataBruto.slice(1);

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          ['dia', 'Dia'],
          ['semana', 'Semana'],
          ['mes', 'Mês'],
        ].map(([valor, label]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setPeriodo(valor)}
            className={periodo === valor ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button type="button" onClick={() => mudarPeriodo(-1)} className="btn btn-secondary" style={{ padding: 8 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{rotuloData}</div>
        </div>
        <button type="button" onClick={() => mudarPeriodo(1)} className="btn btn-secondary" style={{ padding: 8 }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="card" style={{ textAlign: 'center', marginBottom: 14, padding: '18px 16px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Total recebido</p>
        <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--gold)' }}>R$ {total.toFixed(2).replace('.', ',')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
          {agendamentos.length} atendimento{agendamentos.length !== 1 ? 's' : ''} com presença confirmada
        </p>
      </div>

      {porFormaPagamento.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--gold)', fontSize: 13, fontWeight: 700 }}>
            <Wallet size={15} /> Por forma de pagamento
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {porFormaPagamento.map(([forma, { valor, qtd }]) => (
              <div key={forma} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FormaPagamentoIcone forma={forma} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{forma}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {qtd} atendimento{qtd !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14, whiteSpace: 'nowrap' }}>
                  R$ {valor.toFixed(2).replace('.', ',')}
                </div>
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 2,
                paddingTop: 10,
                borderTop: '1px solid var(--border)',
              }}
            >
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontWeight: 700, color: 'var(--gold)' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      )}

      {barras && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'var(--gold)', fontSize: 13, fontWeight: 700 }}>
            <BarChart3 size={15} /> Faturamento por {periodo === 'semana' ? 'dia' : 'período'}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
            {barras.map((b) => (
              <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(3, (b.valor / maxBarra) * 100)}%`,
                      background: b.valor > 0 ? 'var(--gold)' : 'var(--border)',
                      borderRadius: '4px 4px 0 0',
                    }}
                    title={`R$ ${b.valor.toFixed(2).replace('.', ',')}`}
                  />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {servicosRanking.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--gold)', fontSize: 13, fontWeight: 700 }}>
            <TrendingUp size={15} /> Serviços mais pedidos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {servicosRanking.map(([nome, qtd], i) => (
              <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>
                  {i + 1}º {nome}
                </span>
                <span style={{ color: 'var(--text-dim)' }}>{qtd}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {carregando ? (
        <p style={{ color: 'var(--text-dim)' }}>Carregando…</p>
      ) : agendamentos.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 20 }}>
          Nenhum atendimento com presença confirmada nesse período ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {agendamentos.map((a) => (
            <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {periodo !== 'dia' && `${a.data.slice(8, 10)}/${a.data.slice(5, 7)} · `}
                  {a.hora} · {a.clienteNome}
                </div>
                {a.servicos?.length > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{a.servicos.map((s) => s.nome).join(', ')}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14, whiteSpace: 'nowrap' }}>
                  R$ {(a.valorTotal || 0).toFixed(2).replace('.', ',')}
                </div>
                {a.formaPagamento && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{a.formaPagamento}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormaPagamentoIcone({ forma }) {
  const Icone = { Dinheiro: Banknote, Crédito: CreditCard, Débito: Wallet, PIX: QrCode }[forma] || Wallet;
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'var(--panel-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'var(--gold)',
      }}
    >
      <Icone size={16} />
    </div>
  );
}

// ---------- Clientes ----------

function ClientesTab() {
  const [clientes, setClientes] = useState(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    getDocs(collection(db, 'agendamentos')).then((snap) => {
      const mapa = new Map();
      snap.docs
        .map((d) => d.data())
        .filter((a) => a.tipo !== 'bloqueio' && a.clienteTelefone)
        .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
        .forEach((a) => {
          const atual = mapa.get(a.clienteTelefone) || {
            nome: a.clienteNome,
            telefone: a.clienteTelefone,
            visitas: 0,
            gasto: 0,
            primeira: a.data,
            ultima: a.data,
          };
          atual.nome = a.clienteNome || atual.nome;
          if (a.status !== 'cancelado') atual.visitas += 1;
          if (a.status === 'concluido') atual.gasto += a.valorTotal || 0;
          if (a.data < atual.primeira) atual.primeira = a.data;
          if (a.data > atual.ultima) atual.ultima = a.data;
          mapa.set(a.clienteTelefone, atual);
        });
      const lista = [...mapa.values()].sort((a, b) => b.ultima.localeCompare(a.ultima));
      setClientes(lista);
    });
  }, []);

  const filtrados = useMemo(() => {
    if (!clientes) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter(
      (c) => c.nome?.toLowerCase().includes(termo) || c.telefone.includes(termo)
    );
  }, [clientes, busca]);

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input
          placeholder="Buscar por nome ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      {clientes === null ? (
        <p style={{ color: 'var(--text-dim)' }}>Carregando…</p>
      ) : filtrados.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 30 }}>
          {clientes.length === 0 ? 'Nenhum cliente cadastrado ainda.' : 'Nenhum cliente encontrado.'}
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtrados.map((c) => (
              <div key={c.telefone} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'var(--panel-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--gold)',
                    fontWeight: 700,
                  }}
                >
                  {(c.nome || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{c.nome || 'Sem nome'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{c.telefone}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
                    {c.visitas <= 1 ? <Sparkles size={12} /> : <Repeat size={12} />}
                    {c.visitas <= 1
                      ? 'Cliente novo'
                      : `${c.visitas} visitas · cliente desde ${new Date(`${c.primeira}T00:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`}
                  </div>
                </div>
                <a
                  href={`https://wa.me/${c.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ padding: 10, flexShrink: 0 }}
                  title="Abrir WhatsApp"
                >
                  <Phone size={16} />
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Barbeiros ----------

function BarbeirosTab() {
  const [lista, setLista] = useState(null);
  const [nome, setNome] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'barbeiros'), (snap) => {
      setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  async function adicionar(e) {
    e.preventDefault();
    if (!nome.trim()) return;
    await addDoc(collection(db, 'barbeiros'), { nome: nome.trim(), ativo: true });
    setNome('');
  }

  return (
    <ListaCadastro
      titulo="Barbeiros"
      lista={lista}
      renderItem={(b) => b.nome}
      onToggleAtivo={(b) => updateDoc(doc(db, 'barbeiros', b.id), { ativo: !b.ativo })}
      onExcluir={(b) => deleteDoc(doc(db, 'barbeiros', b.id))}
    >
      <form onSubmit={adicionar} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input placeholder="Nome do barbeiro" value={nome} onChange={(e) => setNome(e.target.value)} />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }}>
          <Plus size={18} />
        </button>
      </form>
    </ListaCadastro>
  );
}

// ---------- Serviços ----------

function ServicosTab() {
  const [lista, setLista] = useState(null);
  const [nome, setNome] = useState('');
  const [duracao, setDuracao] = useState('30');
  const [preco, setPreco] = useState('');

  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editDuracao, setEditDuracao] = useState('');
  const [editPreco, setEditPreco] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'servicos'), (snap) => {
      setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  async function adicionar(e) {
    e.preventDefault();
    if (!nome.trim() || !duracao) return;
    await addDoc(collection(db, 'servicos'), {
      nome: nome.trim(),
      duracaoMin: Number(duracao),
      preco: preco ? Number(preco) : null,
      ativo: true,
    });
    setNome('');
    setDuracao('30');
    setPreco('');
  }

  function iniciarEdicao(s) {
    setEditandoId(s.id);
    setEditNome(s.nome);
    setEditDuracao(String(s.duracaoMin || ''));
    setEditPreco(s.preco != null ? String(s.preco) : '');
  }

  async function salvarEdicao(id) {
    if (!editNome.trim() || !editDuracao) return;
    await updateDoc(doc(db, 'servicos', id), {
      nome: editNome.trim(),
      duracaoMin: Number(editDuracao),
      preco: editPreco ? Number(editPreco) : null,
    });
    setEditandoId(null);
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <h2 style={{ fontSize: 17, marginBottom: 14 }}>Serviços</h2>

      <form onSubmit={adicionar} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <input placeholder="Nome do serviço (ex: Corte)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Duração (min)" value={duracao} onChange={(e) => setDuracao(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
          <input placeholder="Preço R$ (opcional)" value={preco} onChange={(e) => setPreco(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" />
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          <Plus size={18} /> Adicionar serviço
        </button>
      </form>

      {lista === null ? (
        <p style={{ color: 'var(--text-dim)' }}>Carregando…</p>
      ) : lista.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>Nenhum cadastro ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map((s) =>
            editandoId === s.id ? (
              <div key={s.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input placeholder="Nome do serviço" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="Duração (min)"
                    value={editDuracao}
                    onChange={(e) => setEditDuracao(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                  />
                  <input
                    placeholder="Preço R$"
                    value={editPreco}
                    onChange={(e) => setEditPreco(e.target.value.replace(/[^\d.]/g, ''))}
                    inputMode="decimal"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditandoId(null)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => salvarEdicao(s.id)}>
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ opacity: s.ativo === false ? 0.5 : 1 }}>
                  {s.nome} · {s.duracaoMin} min{s.preco ? ` · R$ ${Number(s.preco).toFixed(2)}` : ''}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => iniciarEdicao(s)}>
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => updateDoc(doc(db, 'servicos', s.id), { ativo: !s.ativo })}
                  >
                    {s.ativo === false ? 'Ativar' : 'Pausar'}
                  </button>
                  <button type="button" className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => deleteDoc(doc(db, 'servicos', s.id))}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ListaCadastro({ titulo, lista, renderItem, onToggleAtivo, onExcluir, children }) {
  return (
    <div style={{ paddingTop: 8 }}>
      <h2 style={{ fontSize: 17, marginBottom: 14 }}>{titulo}</h2>
      {children}
      {lista === null ? (
        <p style={{ color: 'var(--text-dim)' }}>Carregando…</p>
      ) : lista.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>Nenhum cadastro ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ opacity: item.ativo === false ? 0.5 : 1 }}>{renderItem(item)}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => onToggleAtivo(item)}>
                  {item.ativo === false ? 'Ativar' : 'Pausar'}
                </button>
                <button type="button" className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => onExcluir(item)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Horários ----------

function HorariosTab({ config, setConfig }) {
  const [horarios, setHorarios] = useState(config.horarios || HORARIOS_PADRAO);
  const [intervaloMin, setIntervaloMin] = useState(config.intervaloMin || 30);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function atualizarDia(dia, campo, valor) {
    setHorarios((prev) => prev.map((h, i) => (i === dia ? { ...h, [campo]: valor } : h)));
    setSalvo(false);
  }

  async function salvar() {
    setSalvando(true);
    await updateDoc(doc(db, 'config', 'geral'), { horarios, intervaloMin: Number(intervaloMin) });
    setConfig((prev) => ({ ...prev, horarios, intervaloMin: Number(intervaloMin) }));
    setSalvando(false);
    setSalvo(true);
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <h2 style={{ fontSize: 17, marginBottom: 14 }}>Horários de funcionamento</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {horarios.map((h, dia) => (
          <div key={dia} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, width: 90, fontSize: 13 }}>
              <input type="checkbox" checked={h.aberto} onChange={(e) => atualizarDia(dia, 'aberto', e.target.checked)} style={{ width: 'auto' }} />
              {DIAS_SEMANA[dia]}
            </label>
            {h.aberto ? (
              <>
                <input type="time" value={h.inicio} onChange={(e) => atualizarDia(dia, 'inicio', e.target.value)} style={{ flex: 1 }} />
                <span style={{ color: 'var(--text-dim)' }}>–</span>
                <input type="time" value={h.fim} onChange={(e) => atualizarDia(dia, 'fim', e.target.value)} style={{ flex: 1 }} />
              </>
            ) : (
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Fechado</span>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Clock size={16} color="var(--gold)" />
        <span style={{ flex: 1, fontSize: 14 }}>Intervalo entre horários</span>
        <select value={intervaloMin} onChange={(e) => setIntervaloMin(e.target.value)} style={{ width: 100 }}>
          <option value={15}>15 min</option>
          <option value={20}>20 min</option>
          <option value={30}>30 min</option>
          <option value={60}>60 min</option>
        </select>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando…' : salvo ? 'Salvo ✓' : 'Salvar horários'}
      </button>
    </div>
  );
}

// ---------- Perfil ----------

function PerfilTab({ config, setConfig }) {
  const [nome, setNome] = useState(config.nomeBarbearia || '');
  const [recado, setRecado] = useState(config.recado || '');
  const [descricao, setDescricao] = useState(config.descricao || '');
  const [endereco, setEndereco] = useState(config.endereco || '');
  const [whatsapp, setWhatsapp] = useState(config.whatsapp || '');
  const [instagram, setInstagram] = useState(config.instagram || '');
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    const dados = {
      nomeBarbearia: nome.trim() || 'Minha Barbearia',
      recado: recado.trim(),
      descricao: descricao.trim(),
      endereco: endereco.trim(),
      whatsapp: whatsapp.trim(),
      instagram: instagram.trim(),
    };
    await updateDoc(doc(db, 'config', 'geral'), dados);
    setConfig((prev) => ({ ...prev, ...dados }));
    setSalvando(false);
    setSalvo(true);
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <h2 style={{ fontSize: 17, marginBottom: 14 }}>Perfil da barbearia</h2>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
        Essas informações aparecem na tela inicial do app do cliente.
      </p>

      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={labelStyle}>Nome da barbearia</label>
        <input value={nome} onChange={(e) => { setNome(e.target.value); setSalvo(false); }} placeholder="Nome da barbearia" />

        <label style={labelStyle}>Recado (opcional)</label>
        <textarea
          value={recado}
          onChange={(e) => { setRecado(e.target.value); setSalvo(false); }}
          placeholder="Ex: Fechado no feriado de 25/12. Deixe em branco pra não mostrar nada."
          rows={2}
          style={{ resize: 'vertical' }}
        />
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: -6 }}>
          Só aparece na tela inicial do cliente enquanto tiver algo escrito aqui.
        </p>

        <label style={labelStyle}>Apresentação (opcional)</label>
        <textarea
          value={descricao}
          onChange={(e) => { setDescricao(e.target.value); setSalvo(false); }}
          placeholder="Ex: Cortes modernos e barba em ambiente climatizado."
          rows={3}
          style={{ resize: 'vertical' }}
        />

        <label style={labelStyle}>Endereço (opcional)</label>
        <input
          value={endereco}
          onChange={(e) => { setEndereco(e.target.value); setSalvo(false); }}
          placeholder="Rua, número, bairro, cidade"
        />

        <label style={labelStyle}>WhatsApp de contato (opcional)</label>
        <input
          value={whatsapp}
          onChange={(e) => { setWhatsapp(e.target.value); setSalvo(false); }}
          placeholder="Ex: 5511999999999 (com DDI e DDD)"
          inputMode="tel"
        />

        <label style={labelStyle}>Instagram (opcional)</label>
        <input
          value={instagram}
          onChange={(e) => { setInstagram(e.target.value); setSalvo(false); }}
          placeholder="Ex: https://www.instagram.com/seuusuario"
        />

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 6 }} disabled={salvando}>
          {salvando ? 'Salvando…' : salvo ? 'Salvo ✓' : 'Salvar perfil'}
        </button>
      </form>
    </div>
  );
}

const labelStyle = { fontSize: 12, color: 'var(--text-dim)', marginBottom: -4 };
