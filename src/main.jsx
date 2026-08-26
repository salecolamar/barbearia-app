import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Checa por uma versão nova sempre que o app volta a ficar visível
      // (ex: reaberto pelo ícone na tela inicial) — não espera o navegador
      // decidir sozinho quando checar.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {})
      })
    }).catch(() => {})
  })

  // Quando uma versão nova assume o controle da página, recarrega uma vez
  // pra já servir o conteúdo novo, em vez de deixar o usuário preso na
  // versão antiga até fechar e abrir o app de novo.
  let recarregando = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregando) return
    recarregando = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
