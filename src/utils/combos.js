// Combos com preço fixo (mais barato que a soma dos serviços avulsos).
// "dias" é a lista de dias da semana (0=Dom ... 6=Sáb) em que o combo vale;
// null significa "vale todo dia". Baseado na tabela de preços da Sandro Barber.
export const COMBOS = [
  { nome: 'Tesoura + Barba + Sobrancelha', chaves: ['tesoura', 'barba', 'sobrancelha'], preco: 75, dias: [1, 2, 3] },
  { nome: 'Máquina + Sobrancelha', chaves: ['maquina', 'sobrancelha'], preco: 40, dias: null },
  { nome: 'Barba + Sobrancelha', chaves: ['barba', 'sobrancelha'], preco: 40, dias: null },
  { nome: 'Navalhado + Sobrancelha', chaves: ['navalhado', 'sobrancelha'], preco: 50, dias: null },
  { nome: 'Corte Máquina + Barba', chaves: ['maquina', 'barba'], preco: 60, dias: null },
  { nome: 'Corte Máquina + Barba + Sobrancelha', chaves: ['maquina', 'barba', 'sobrancelha'], preco: 65, dias: [1, 2, 3] },
  { nome: 'Corte Tesoura + Barba', chaves: ['tesoura', 'barba'], preco: 70, dias: null },
  { nome: 'Corte Tesoura + Sobrancelha', chaves: ['tesoura', 'sobrancelha'], preco: 50, dias: null },
];

function subset(chaves, restantes) {
  return chaves.every((c) => restantes.has(c));
}

// Encontra a combinação de combos + serviços avulsos que resulta no menor
// preço total para o conjunto de serviços escolhido, num determinado dia da
// semana. Retorna { total, itens: [{ tipo: 'combo'|'servico', nome, preco }] }.
export function calcularMelhorPreco(servicosSelecionados, diaSemana) {
  // servicosSelecionados: [{ chave, nome, preco }]
  const precoPorChave = new Map(servicosSelecionados.map((s) => [s.chave, s]));
  const combosValidos = COMBOS.filter((c) => !c.dias || c.dias.includes(diaSemana));

  const cache = new Map();

  function resolver(restantes) {
    if (restantes.size === 0) return { total: 0, itens: [] };

    const chave = [...restantes].sort().join(',');
    if (cache.has(chave)) return cache.get(chave);

    // Opção base: tirar um item qualquer e cobrar avulso.
    const [primeiro] = restantes;
    const semItem = new Set(restantes);
    semItem.delete(primeiro);
    const servico = precoPorChave.get(primeiro);
    let melhor = resolver(semItem);
    melhor = { total: melhor.total + servico.preco, itens: [...melhor.itens, { tipo: 'servico', nome: servico.nome, preco: servico.preco }] };

    // Tenta aplicar cada combo cujas peças estejam todas nos restantes.
    for (const combo of combosValidos) {
      if (!combo.chaves.every((c) => precoPorChave.has(c))) continue; // combo exige um serviço não cadastrado
      if (!subset(combo.chaves, restantes)) continue;
      const resto = new Set(restantes);
      combo.chaves.forEach((c) => resto.delete(c));
      const sub = resolver(resto);
      const candidato = { total: sub.total + combo.preco, itens: [...sub.itens, { tipo: 'combo', nome: combo.nome, preco: combo.preco }] };
      // Em empate, prefere o combo (mais claro para o cliente do que dois avulsos com a mesma soma).
      if (candidato.total <= melhor.total) melhor = candidato;
    }

    cache.set(chave, melhor);
    return melhor;
  }

  return resolver(new Set(servicosSelecionados.map((s) => s.chave)));
}
