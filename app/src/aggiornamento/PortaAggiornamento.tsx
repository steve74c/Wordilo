// -----------------------------------------------------------------------------
// "Cancello" di aggiornamento. Va salvato in:  app/src/aggiornamento/PortaAggiornamento.tsx
//
// Stesso schema di PortaAuth: avvolge il gioco e decide cosa mostrare.
//   • versione sotto la minima  → schermata "Aggiorna per giocare" (non si esce)
//                                 + parte subito l'aggiornamento in-app di Play
//   • versione non l'ultima     → popup facoltativo "Nuova versione disponibile"
//   • tutto ok / offline        → il gioco
//
// Ricontrolla quando l'app torna in primo piano (l'utente potrebbe averla
// lasciata aperta per giorni) e quando il server rifiuta una richiesta.
// -----------------------------------------------------------------------------
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, GRAD } from '../theme';
import { useT } from '../i18n/LinguaUIContext';
import { avviaAggiornamento, controllaVersione, type EsitoVersione } from './controlloVersione';
import { suVersioneRifiutata } from './versioneApp';

export function PortaAggiornamento({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [esito, setEsito] = useState<EsitoVersione | null>(null);
  const [popupChiuso, setPopupChiuso] = useState(false);
  const avviatoImmediato = useRef(false);

  const verifica = useCallback(async () => {
    const nuovo = await controllaVersione();
    setEsito(nuovo);
    // Aggiornamento obbligatorio: lancia subito la schermata di Play (una volta;
    // se l'utente la chiude resta il pulsante "Aggiorna").
    if (nuovo.stato === 'obbligatorio' && !avviatoImmediato.current) {
      avviatoImmediato.current = true;
      avviaAggiornamento('immediato', nuovo.urlStore);
    }
  }, []);

  useEffect(() => {
    verifica();

    const sub = AppState.addEventListener('change', (stato) => {
      if (stato === 'active') verifica();
    });
    const stacca = suVersioneRifiutata(() => verifica());

    return () => {
      sub.remove();
      stacca();
    };
  }, [verifica]);

  // Primo controllo in corso (max 5 s, poi si gioca comunque)
  if (!esito) {
    return (
      <LinearGradient colors={GRAD.sfondo} style={stili.centro}>
        <ActivityIndicator color={C.accento} />
      </LinearGradient>
    );
  }

  if (esito.stato === 'obbligatorio') {
    return (
      <LinearGradient colors={GRAD.sfondo} style={[stili.centro, stili.pagina]}>
        <Text style={stili.icona}>⬆️</Text>
        <Text style={stili.titolo}>{t('aggObbligatorioTitolo')}</Text>
        <Text style={stili.testo}>{t('aggObbligatorioTesto')}</Text>
        <Pressable
          style={({ pressed }) => [stili.bottone, pressed && { opacity: 0.8 }]}
          onPress={() => avviaAggiornamento('immediato', esito.urlStore)}
        >
          <Text style={stili.bottoneTesto}>{t('aggAggiorna')}</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <>
      {children}
      <Modal
        transparent
        animationType="fade"
        visible={esito.stato === 'consigliato' && !popupChiuso}
        onRequestClose={() => setPopupChiuso(true)}
      >
        <View style={stili.velo}>
          <View style={stili.scheda}>
            <Text style={stili.titolo}>{t('aggDisponibileTitolo')}</Text>
            <Text style={stili.testo}>{t('aggDisponibileTesto')}</Text>
            <Pressable
              style={({ pressed }) => [stili.bottone, pressed && { opacity: 0.8 }]}
              onPress={() => {
                setPopupChiuso(true);
                avviaAggiornamento('flessibile', esito.stato === 'consigliato' ? esito.urlStore : null);
              }}
            >
              <Text style={stili.bottoneTesto}>{t('aggAggiorna')}</Text>
            </Pressable>
            <Pressable onPress={() => setPopupChiuso(true)} hitSlop={10}>
              <Text style={stili.link}>{t('aggPiuTardi')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const stili = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pagina: { paddingHorizontal: 32, gap: 16 },
  icona: { fontSize: 48 },
  titolo: { color: C.testo, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  testo: { color: C.testoTenue, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  bottone: {
    marginTop: 8,
    backgroundColor: C.accento,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  bottoneTesto: { color: C.sfondoBottom, fontSize: 16, fontWeight: '800' },
  link: { color: C.testoTenue, fontSize: 14, marginTop: 4, textDecorationLine: 'underline' },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  scheda: {
    backgroundColor: C.sfondoTop,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: C.superficieAlta,
  },
});
