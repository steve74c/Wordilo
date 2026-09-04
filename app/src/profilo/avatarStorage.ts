import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

// -----------------------------------------------------------------------------
// Caricamento avatar. Va salvato in:  app/src/profilo/avatarStorage.ts
//
// Flusso: apre il selettore foto → prende l'immagine in base64 → la converte in
// byte grezzi → la carica nel bucket "avatars" come "<user_id>.jpg" (sovrascrive
// la precedente) → ricava l'URL pubblico (con "?t=timestamp" anti-cache) → salva
// l'URL in profiles.avatar_url. Restituisce l'URL, oppure null se l'utente annulla.
//
// Nota: usiamo il base64 (non un Blob) perché è l'unico modo che funziona IDENTICO
// su web, iOS e Android per mandare i byte a Supabase Storage.
// -----------------------------------------------------------------------------

// Decodifica base64 → byte, senza dipendenze esterne (algoritmo base64 standard).
const CODE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const REV = new Uint8Array(256);
for (let i = 0; i < CODE.length; i++) REV[CODE.charCodeAt(i)] = i;

function base64ToBytes(input: string): Uint8Array {
  // Toglie un eventuale prefisso "data:...;base64," e caratteri non validi.
  const b64 = input.replace(/^data:.*;base64,/, '').replace(/[^A-Za-z0-9+/=]/g, '');
  const len = b64.length;

  let placeHolders = 0;
  if (len >= 1 && b64[len - 1] === '=') placeHolders++;
  if (len >= 2 && b64[len - 2] === '=') placeHolders++;

  const byteLen = Math.max(0, (len * 3) / 4 - placeHolders);
  const bytes = new Uint8Array(byteLen);

  const main = placeHolders > 0 ? Math.max(0, len - 4) : len;
  let p = 0;
  let i = 0;
  for (; i < main; i += 4) {
    const tmp =
      (REV[b64.charCodeAt(i)] << 18) |
      (REV[b64.charCodeAt(i + 1)] << 12) |
      (REV[b64.charCodeAt(i + 2)] << 6) |
      REV[b64.charCodeAt(i + 3)];
    bytes[p++] = (tmp >> 16) & 0xff;
    bytes[p++] = (tmp >> 8) & 0xff;
    bytes[p++] = tmp & 0xff;
  }
  if (placeHolders === 1) {
    const tmp =
      (REV[b64.charCodeAt(i)] << 10) |
      (REV[b64.charCodeAt(i + 1)] << 4) |
      (REV[b64.charCodeAt(i + 2)] >> 2);
    bytes[p++] = (tmp >> 8) & 0xff;
    bytes[p++] = tmp & 0xff;
  } else if (placeHolders === 2) {
    const tmp = (REV[b64.charCodeAt(i)] << 2) | (REV[b64.charCodeAt(i + 1)] >> 4);
    bytes[p++] = tmp & 0xff;
  }
  return bytes;
}

export async function scegliEcaricaAvatar(userId: string): Promise<string | null> {
  // 1) Permesso di accedere alla galleria (sul telefono compare la richiesta;
  //    su web è concesso in automatico).
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permesso galleria negato');

  // 2) Selettore immagine, con ritaglio quadrato e base64 attivo.
  //    NB: se la tua versione di expo-image-picker si lamenta di `['images']`,
  //    sostituiscilo con  ImagePicker.MediaTypeOptions.Images
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });
  if (res.canceled || !res.assets?.length) return null; // utente ha annullato

  const asset = res.assets[0];
  if (!asset.base64) throw new Error('Immagine senza dati (base64 mancante)');

  const bytes = base64ToBytes(asset.base64);
  const path = `${userId}.jpg`; // un file per utente, come da specifica §4

  // 3) Carica su Storage, sovrascrivendo il file precedente dello stesso utente.
  const { error: errUpload } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (errUpload) throw errUpload;

  // 4) URL pubblico + "?t=..." così il telefono/browser non mostra la vecchia
  //    foto dalla cache dopo un cambio.
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;

  // 5) Salva l'URL nel profilo, così la foto torna anche dopo il riavvio.
  const { error: errDb } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId);
  if (errDb) throw errDb;

  return url;
}
