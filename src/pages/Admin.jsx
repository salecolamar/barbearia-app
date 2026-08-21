import { useEffect, useState } from 'react';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Plus,
  Scissors,
  Settings,
  Store,
  Trash2,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { db } from '../firebase';
import { pedirTokenNotificacao } from '../notifications';
import { DIAS_SEMANA, dateToStr } from '../utils/slots';

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

      <div style={{ padding: '0 16px' }}>
        {aba === 'agendados' && <AgendaTab />}
        {aba === 'financeiro' && <FinanceiroTab />}
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
          overflowX: 'auto',
          borderTop: '1px solid var(--border)',
          background: 'var(--panel)',
        }}
      >
        <TabBtn ativo={aba === 'agendados'} onClick={() => setAba('agendados')} icone={<Calendar size={19} />} label="Agendados" />
        <TabBtn ativo={aba === 'financeiro'} onClick={() => setAba('financeiro')} icone={<Wallet size={19} />} label="Financeiro" />
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
        flex: '0 0 auto',
        minWidth: 74,
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

      {carregando ? (
        <p style={{ color: 'var(--text-dim)' }}>Carregando…</p>
      ) : agendamentos.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 30 }}>Nenhum agendamento nesse dia.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {agendamentos.map((a) => (
            <div key={a.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {a.hora} · {a.clienteNome}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
                    {a.barbeiroNome} · {a.clienteTelefone}
                  </div>
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
                </div>
              </div>

              {a.status === 'confirmado' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => mudarStatus(a.id, 'concluido')}>
                    <UserCheck size={14} /> Confirmar presença
                  </button>
                  <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => mudarStatus(a.id, 'cancelado')}>
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
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'cancelado') return <span className="chip chip-danger">Cancelado</span>;
  if (status === 'concluido') return <span className="chip chip-success">Compareceu</span>;
  return <span className="chip chip-gold">Confirmado</span>;
}

// ---------- Financeiro ----------

function FinanceiroTab() {
  const [data, setData] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const dataStr = dateToStr(data);

  useEffect(() => {
    setCarregando(true);
    const q = query(collection(db, 'agendamentos'), where('data', '==', dataStr), where('status', '==', 'concluido'));
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.hora.localeCompare(b.hora));
      setAgendamentos(lista);
      setCarregando(false);
    });
    return unsub;
  }, [dataStr]);

  function mudarDia(delta) {
    const nova = new Date(data);
    nova.setDate(nova.getDate() + delta);
    setData(nova);
  }

  const total = agendamentos.reduce((soma, a) => soma + (a.valorTotal || 0), 0);

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

      <div className="card" style={{ textAlign: 'center', marginBottom: 14, padding: '18px 16px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Total recebido no dia</p>
        <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--gold)' }}>R$ {total.toFixed(2).replace('.', ',')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
          {agendamentos.length} atendimento{agendamentos.length !== 1 ? 's' : ''} com presença confirmada
        </p>
      </div>

      {carregando ? (
        <p style={{ color: 'var(--text-dim)' }}>Carregando…</p>
      ) : agendamentos.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: 20 }}>
          Nenhum atendimento com presença confirmada nesse dia ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {agendamentos.map((a) => (
            <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {a.hora} · {a.clienteNome}
                </div>
                {a.servicos?.length > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{a.servicos.map((s) => s.nome).join(', ')}</div>
                )}
              </div>
              <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14, whiteSpace: 'nowrap' }}>
                R$ {(a.valorTotal || 0).toFixed(2).replace('.', ',')}
              </div>
            </div>
          ))}
        </div>
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

  return (
    <ListaCadastro
      titulo="Serviços"
      lista={lista}
      renderItem={(s) => `${s.nome} · ${s.duracaoMin} min${s.preco ? ` · R$ ${Number(s.preco).toFixed(2)}` : ''}`}
      onToggleAtivo={(s) => updateDoc(doc(db, 'servicos', s.id), { ativo: !s.ativo })}
      onExcluir={(s) => deleteDoc(doc(db, 'servicos', s.id))}
    >
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
    </ListaCadastro>
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
  const [descricao, setDescricao] = useState(config.descricao || '');
  const [endereco, setEndereco] = useState(config.endereco || '');
  const [whatsapp, setWhatsapp] = useState(config.whatsapp || '');
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    const dados = { nomeBarbearia: nome.trim() || 'Minha Barbearia', descricao: descricao.trim(), endereco: endereco.trim(), whatsapp: whatsapp.trim() };
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

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 6 }} disabled={salvando}>
          {salvando ? 'Salvando…' : salvo ? 'Salvo ✓' : 'Salvar perfil'}
        </button>
      </form>
    </div>
  );
}

const labelStyle = { fontSize: 12, color: 'var(--text-dim)', marginBottom: -4 };
