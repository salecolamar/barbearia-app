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

// Filtra os horários livres para um barbeiro/serviço em um dia, considerando
// os agendamentos já existentes e (se for hoje) o horário atual.
export function getHorariosDisponiveis({
  dateStr,
  duracaoMin,
  horariosConfig,
  intervaloMin,
  barbeiroId,
  agendamentosDoDia,
  bufferMin = 20,
}) {
  const config = horariosConfig[strToDate(dateStr).getDay()];
  if (!config || !config.aberto) return [];

  const fechamento = timeToMinutes(config.fim);
  const todos = gerarSlotsDoDia(horariosConfig, dateStr, intervaloMin);

  const ocupados = agendamentosDoDia.filter(
    (a) => a.barbeiroId === barbeiroId && a.status !== 'cancelado'
  );

  const agora = new Date();
  const isHoje = dateStr === dateToStr(agora);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes() + bufferMin;

  return todos.filter((slot) => {
    const inicioSlot = timeToMinutes(slot);
    const fimSlot = inicioSlot + duracaoMin;

    if (fimSlot > fechamento) return false;
    if (isHoje && inicioSlot < minutosAgora) return false;

    const conflita = ocupados.some((a) => {
      const inicioA = timeToMinutes(a.hora);
      const fimA = inicioA + (a.servicoDuracao || 30);
      return inicioSlot < fimA && inicioA < fimSlot;
    });

    return !conflita;
  });
}
