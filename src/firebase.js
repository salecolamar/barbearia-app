import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Substitua pelos valores reais do seu projeto Firebase (veja o GUIA.md).
const firebaseConfig = {
  apiKey: 'AIzaSyC7Jvao7L3b1zpXnve9NPfbOB0zS2Ju08I',
  authDomain: 'barbearia-1778e.firebaseapp.com',
  projectId: 'barbearia-1778e',
  storageBucket: 'barbearia-1778e.firebasestorage.app',
  messagingSenderId: '992952424450',
  appId: '1:992952424450:web:6d2cf757b3c15cb595af1b',
};

// Chave pública (VAPID) do Cloud Messaging, usada para lembretes por notificação.
// Firebase Console → Configurações do projeto → Cloud Messaging → Certificados push da Web.
export const VAPID_KEY = 'BGfLpEgtHZKsYPkA2hjo-JOO2JeBkxV43pV4S7KCE-Y0X_ic3P9grZOQJR4RtPo9qg9d1x7U48uUIhcQe4rHjps';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const authReady = signInAnonymously(auth).catch((err) => {
  console.error('Falha no login anônimo do Firebase:', err);
});
