const KEY = 'barbearia:cliente';

export function getClienteSalvo() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function salvarCliente({ nome, telefone }) {
  localStorage.setItem(KEY, JSON.stringify({ nome, telefone }));
}
