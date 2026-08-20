import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Substitua pelos valores reais do seu projeto Firebase (veja o GUIA.md).
const firebaseConfig = {
  apiKey: 'sua-api-key-aqui',
  authDomain: 'seu-projeto.firebaseapp.com',
  projectId: 'seu-projeto',
  storageBucket: 'seu-projeto.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx',
};

// Chave pública (VAPID) do Cloud Messaging, usada para lembretes por notificação.
// Firebase Console → Configurações do projeto → Cloud Messaging → Certificados push da Web.
export const VAPID_KEY = 'sua-vapid-key-aqui';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const authReady = signInAnonymously(auth).catch((err) => {
  console.error('Falha no login anônimo do Firebase:', err);
});
