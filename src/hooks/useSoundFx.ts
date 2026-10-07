import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { Message } from '../types/chat';
import {
  getSoundSettings,
  setSoundSettings,
  subscribeSoundSettings,
  playDroidBlip,
  playHyperspaceWhoosh,
} from '../utils/sfx';

export { playSaberSwing } from '../utils/sfx';

/** Reactive access to the persisted sound settings. */
export function useSoundSettings() {
  const settings = useSyncExternalStore(subscribeSoundSettings, getSoundSettings);
  return { ...settings, update: setSoundSettings };
}

interface SoundFxInput {
  personaId: string;
  isLoading: boolean;
  messages: Message[];
}

/**
 * Plays chat sound effects by watching app state:
 * - streaming finishes with an assistant reply (or an /image result lands) → droid blip
 * - persona change → hyperspace whoosh
 * (The lightsaber swing on send is triggered directly from the send handler.)
 */
export function useSoundFx({ personaId, isLoading, messages }: SoundFxInput): void {
  const prevLoading = useRef(isLoading);
  const prevImageStatus = useRef<Message['imageStatus']>(undefined);
  const prevPersona = useRef(personaId);

  useEffect(() => {
    const last = messages[messages.length - 1];
    const wasLoading = prevLoading.current;
    const prevImg = prevImageStatus.current;
    prevLoading.current = isLoading;
    prevImageStatus.current = last?.imageStatus;

    const streamDone =
      wasLoading && !isLoading && last?.role === 'assistant' && last.content.trim() !== '';
    const imageDone = prevImg === 'loading' && last?.imageStatus === 'done';
    if (streamDone || imageDone) playDroidBlip();
  }, [isLoading, messages]);

  useEffect(() => {
    if (prevPersona.current !== personaId) {
      prevPersona.current = personaId;
      playHyperspaceWhoosh();
    }
  }, [personaId]);
}
