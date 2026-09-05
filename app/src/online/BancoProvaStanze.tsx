// -----------------------------------------------------------------------------
// BANCO DI PROVA TEMPORANEO per C2 + C3 + D3 — da rimuovere dopo i test.
// Va salvato in:  app/src/online/BancoProvaStanze.tsx
//
// Novità: l'HOST parte da solo quando il guest entra (avviso via broadcast).
//   • host: apre il canale già da 'waiting'; riceve 'guest-entrato' → passa a
//     'playing' e mostra "▶ Entra in partita" SENZA rileggere il DB a mano.
//   • guest: dopo "Entra", annuncia l'ingresso sul canale (annunciaIngresso).
// -----------------------------------------------------------------------------
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { creaStanza, entraInStanza, type RisultatoStanza, type Sfida } from './stanze';
import { apriCanaleStanza, type ConnessioneStanza, type RiepilogoRiga } from './canaleStanza';

type Props = {
  onEntraInPartita?: (sfida: Sfida) => void;
};

export function BancoProvaStanze({ onEntraInPartita }: Props) {
  const [codice, setCodice] = useState('');
  const [log, setLog] = useState('(nessuna azione)');
  const [occupato, setOccupato] = useState(false);

  const [sfida, setSfida] = useState<Sfida | null>(null);
  const [mioId, setMioId] = useState<string | null>(null);
  const [sonoHost, setSonoHost] = useState(false); // per sapere chi deve annunciare
  const [ricevuti, setRicevuti] = useState<RiepilogoRiga[]>([]);
  const [rigaCorrente, setRigaCorrente] = useState(0);
  const connessione = useRef<ConnessioneStanza | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMioId(data?.user?.id ?? null));
  }, []);

  // Apro il canale UNA volta per codice-stanza (non a ogni cambio di 'sfida', così
  // il passaggio waiting→playing NON chiude/riapre il canale). Dipende solo dal
  // CODICE e dal mio id.
  const codiceStanza = sfida?.codice ?? null;
  useEffect(() => {
    if (!codiceStanza || !mioId) return;

    const conn = apriCanaleStanza(
      codiceStanza,
      mioId,
      // riepiloghi-riga dall'avversario
      (r) => setRicevuti((prec) => [r, ...prec].slice(0, 8)),
      // avviso: il guest è entrato → l'host aggiorna la sua sfida a 'playing'
      (guestId) => {
        setSfida((prec) =>
          prec ? { ...prec, stato: 'playing', guestId } : prec,
        );
        setLog((l) => l + `\n[host] guest entrato: ${guestId.slice(0, 8)}… → playing`);
      },
    );
    connessione.current = conn;

    return () => {
      conn.chiudi();
      connessione.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codiceStanza, mioId]);

  function mostra(r: RisultatoStanza, ioSonoHost: boolean) {
    console.log('[C2] risultato:', r);
    if (r.ok) {
      const s = r.sfida;
      setSonoHost(ioSonoHost);
      setSfida(s);
      setRicevuti([]);
      setRigaCorrente(0);
      setLog(
        `OK ✓  (${ioSonoHost ? 'HOST' : 'GUEST'})\n` +
          `codice:  ${s.codice}\n` +
          `stato:   ${s.stato}\n` +
          `parola:  ${s.parola}\n` +
          `host:    ${s.hostId.slice(0, 8)}…\n` +
          `guest:   ${s.guestId ? s.guestId.slice(0, 8) + '…' : '(vuoto)'}`,
      );
    } else {
      setLog(`ERRORE ✗\n${r.errore}`);
    }
  }

  async function onCrea() {
    setOccupato(true);
    setLog('creo la stanza…');
    try {
      mostra(await creaStanza('principiante', 5), true); // io sono HOST
    } finally {
      setOccupato(false);
    }
  }

  async function onEntra() {
    setOccupato(true);
    setLog('entro nella stanza…');
    try {
      const r = await entraInStanza(codice);
      mostra(r, false); // io sono GUEST
      // Appena entrato, annuncio all'host che ci sono (con piccola attesa perché
      // il canale del punto sopra si stia sottoscrivendo).
      if (r.ok && mioId) {
        setTimeout(() => connessione.current?.annunciaIngresso(mioId), 400);
      }
    } finally {
      setOccupato(false);
    }
  }

  function onInviaRigaFinta() {
    if (!connessione.current) return;
    const verdi = Math.floor(Math.random() * 6);
    const arancioni = Math.floor(Math.random() * (6 - verdi));
    connessione.current.inviaRiga(rigaCorrente, verdi, arancioni);
    setLog(`inviata riga ${rigaCorrente}: ${verdi} verdi, ${arancioni} arancioni`);
    setRigaCorrente((n) => n + 1);
  }

  const inStanza = !!sfida;

  return (
    <View
      style={{
        marginTop: 8,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245,158,11,0.08)',
        gap: 10,
      }}
    >
      <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>
        BANCO DI PROVA C2 + C3 + D3 (temporaneo)
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onCrea}
          disabled={occupato}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#0EA5A0', opacity: occupato ? 0.5 : 1 }}
        >
          <Text style={{ color: '#04231F', fontWeight: '800' }}>Crea stanza</Text>
        </Pressable>

        <Pressable
          onPress={onEntra}
          disabled={occupato}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#6366F1', opacity: occupato ? 0.5 : 1 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Entra</Text>
        </Pressable>
      </View>

      <TextInput
        value={codice}
        onChangeText={setCodice}
        placeholder="codice stanza (es. K7P2Q)"
        placeholderTextColor="#94A3B8"
        autoCapitalize="characters"
        autoCorrect={false}
        style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#E2E8F0', backgroundColor: 'rgba(0,0,0,0.2)' }}
      />

      <Text style={{ color: '#CBD5E1', fontSize: 13, fontFamily: 'monospace', lineHeight: 19 }}>{log}</Text>

      {inStanza && (
        <View style={{ gap: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: '#F59E0B', paddingTop: 10 }}>
          <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
            REALTIME — canale stanza {sfida?.codice} {sonoHost ? '(sei HOST)' : '(sei GUEST)'}
          </Text>

          {sfida?.stato === 'playing' && onEntraInPartita ? (
            <Pressable
              onPress={() => onEntraInPartita(sfida)}
              style={{ paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#F59E0B' }}
            >
              <Text style={{ color: '#3A2A05', fontWeight: '900' }}>▶  Entra in partita</Text>
            </Pressable>
          ) : (
            <Text style={{ color: '#94A3B8', fontSize: 12, fontStyle: 'italic' }}>
              {sonoHost ? 'In attesa che l’avversario entri…' : 'Pronto.'}
            </Text>
          )}

          <Pressable
            onPress={onInviaRigaFinta}
            style={{ paddingVertical: 11, borderRadius: 10, alignItems: 'center', backgroundColor: '#22C55E' }}
          >
            <Text style={{ color: '#04231F', fontWeight: '800' }}>Invia riga finta →</Text>
          </Pressable>

          <Text style={{ color: '#94A3B8', fontSize: 12 }}>Ricevuti dall'avversario:</Text>
          {ricevuti.length === 0 ? (
            <Text style={{ color: '#64748B', fontSize: 13, fontStyle: 'italic' }}>
              (ancora nulla — invia una riga dall'altro browser)
            </Text>
          ) : (
            ricevuti.map((r, i) => (
              <Text key={i} style={{ color: '#E2E8F0', fontSize: 13, fontFamily: 'monospace' }}>
                riga {r.riga}: 🟢 {r.verdi}  🟠 {r.arancioni}
              </Text>
            ))
          )}
        </View>
      )}
    </View>
  );
}