export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function pad(n) {
  return String(n).padStart(2, '0');
}

export function dateToStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function strToDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Segunda-feira da semana que contém a data (semana começa na segunda).
export function inicioSemana(date) {
  const d = new Date(date);
  const dia = d.getDay();
  const offset = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fimSemana(date) {
  const d = inicioSemana(date);
  d.setDate(d.getDate() + 6);
  return d;
}

export function inicioMes(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function fimMes(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

// Gera os 14 próximos dias (incluindo hoje) para o seletor de data do cliente.
export function proximosDias(quantidade = 14) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dias = [];
  for (let i = 0; i < quantidade; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    dias.push(d);
  }
  return dias;
}

// Todos os horários possíveis de um dia, de acordo com a configuração de funcionamento.
export function gerarSlotsDoDia(horariosConfig, dateStr, intervaloMin) {
  const dia = strToDate(dateStr).getDay();
  const config = horariosConfig[dia];
  if (!config || !config.aberto) return [];

  const inicio = timeToMinutes(config.inicio);
  const fim = timeToMinutes(config.fim);
  const slots = [];
  for (let t = inicio; t < fim; t += intervaloMin) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

function barbeiroLivre(barbeiroId, inicioSlot, fimSlot, agendamentosDoDia) {
  const ocupados = agendamentosDoDia.filter((a) => a.barbeiroId === barbeiroId && a.status !== 'cancelado');
  return !ocupados.some((a) => {
    const inicioA = timeToMinutes(a.hora);
    const fimA = inicioA + (a.servicoDuracao || 30);
    return inicioSlot < fimA && inicioA < fimSlot;
  });
}

// Todos os horários do dia (dentro do funcionamento), cada um com um status:
// 'livre' (pode marcar), 'ocupado' (já tem cliente, mostra o nome) ou
// 'passado' (já era hoje). Um horário só fica "ocupado" se TODOS os
// barbeiros ativos já tiverem algo marcado nele.
export function getHorariosComStatus({
  dateStr,
  duracaoMin,
  horariosConfig,
  intervaloMin,
  barbeiros,
  agendamentosDoDia,
  bufferMin = 20,
}) {
  const config = horariosConfig[strToDate(dateStr).getDay()];
  if (!config || !config.aberto || barbeiros.length === 0) return [];

  const fechamento = timeToMinutes(config.fim);
  const todos = gerarSlotsDoDia(horariosConfig, dateStr, intervaloMin);

  const agora = new Date();
  const isHoje = dateStr === dateToStr(agora);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes() + bufferMin;

  const ocupadosValidos = agendamentosDoDia.filter((a) => a.status !== 'cancelado');

  return todos
    .filter((slot) => timeToMinutes(slot) + duracaoMin <= fechamento)
    .map((slot) => {
      const inicioSlot = timeToMinutes(slot);
      const fimSlot = inicioSlot + duracaoMin;

      if (isHoje && inicioSlot < minutosAgora) {
        return { hora: slot, status: 'passado' };
      }

      if (barbeiros.some((b) => barbeiroLivre(b.id, inicioSlot, fimSlot, agendamentosDoDia))) {
        return { hora: slot, status: 'livre' };
      }

      const ocupante = ocupadosValidos.find((a) => {
        const inicioA = timeToMinutes(a.hora);
        const fimA = inicioA + (a.servicoDuracao || 30);
        return inicioSlot < fimA && inicioA < fimSlot;
      });
      const nomeExibido = ocupante?.tipo === 'bloqueio' ? 'Indisponível' : ocupante?.clienteNome;
      return { hora: slot, status: 'ocupado', clienteNome: nomeExibido };
    });
}

// Escolhe o primeiro barbeiro ativo livre em um horário específico.
export function escolherBarbeiroDisponivel({ hora, duracaoMin, barbeiros, agendamentosDoDia }) {
  const inicioSlot = timeToMinutes(hora);
  const fimSlot = inicioSlot + duracaoMin;
  return barbeiros.find((b) => barbeiroLivre(b.id, inicioSlot, fimSlot, agendamentosDoDia)) || null;
}

// Resume o horário de funcionamento da semana em linhas curtas, agrupando
// dias seguidos com o mesmo horário (ex: "Seg a Sex: 09:00–19:00").
export function formatarHorarios(horariosConfig) {
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  const grupos = [];

  for (const dia of ordem) {
    const h = horariosConfig[dia];
    if (!h) continue;
    const chave = h.aberto ? `${h.inicio}-${h.fim}` : 'fechado';
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.chave === chave) {
      ultimo.dias.push(dia);
    } else {
      grupos.push({ chave, dias: [dia], aberto: h.aberto, inicio: h.inicio, fim: h.fim });
    }
  }

  return grupos.map((g) => {
    const label =
      g.dias.length > 1
        ? `${DIAS_SEMANA_ABREV[g.dias[0]]} a ${DIAS_SEMANA_ABREV[g.dias[g.dias.length - 1]]}`
        : DIAS_SEMANA_ABREV[g.dias[0]];
    return g.aberto ? `${label}: ${g.inicio}–${g.fim}` : `${label}: Fechado`;
  });
}
