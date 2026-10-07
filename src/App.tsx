import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { DEFAULT_SERVER_URL, DEFAULT_IMAGE_SERVER_URL, DEFAULT_PERSONA, PERSONAS, FACTION_THEMES } from './constants/config';
import type { Persona, FactionTheme, ArchivedSession } from './types/chat';
import { useChatApi } from './hooks/useChatApi';
import { useHolocronArchive } from './hooks/useHolocronArchive';
import { useMessageReactions } from './hooks/useMessageReactions';
import { useCustomPersonas } from './hooks/useCustomPersonas';
import { usePersonaPreferences } from './hooks/usePersonaPreferences';
import { formatPreferencesSection } from './utils/preferenceNotes';
import LearnedPreferences from './components/LearnedPreferences';
import StarField from './components/StarField';
import HyperspaceTransition from './components/HyperspaceTransition';
import { useSoundFx, playSaberSwing } from './hooks/useSoundFx';
import ChatHeader from './components/ChatHeader';
import PersonaSelector from './components/PersonaSelector';
import FactionSelector from './components/FactionSelector';
import HolocronArchive from './components/HolocronArchive';
import SettingsPanel from './components/SettingsPanel';
import PersonaEditor from './components/PersonaEditor';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import ErrorBanner from './components/ErrorBanner';
import DebateArena from './components/DebateArena';
import MissionConsole from './components/MissionConsole';
import ModelStatusBar from './components/ModelStatusBar';
import { usePersonaSettings, cleanSettings } from './hooks/usePersonaSettings';
import type { ModelSettings } from './types/modelSettings';

export default function App() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [imageServerUrl, setImageServerUrl] = useState(DEFAULT_IMAGE_SERVER_URL);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [debateOpen, setDebateOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [activePersona, setActivePersona] = useState<Persona>(DEFAULT_PERSONA);
  const [activeFaction, setActiveFaction] = useState<FactionTheme | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPersona, setEditorPersona] = useState<Persona | null>(null);

  const personaSettings = usePersonaSettings();
  const { getEffective } = personaSettings;
  const activeModelSettings = useMemo(() => getEffective(activePersona), [getEffective, activePersona]);

  const { messages, isLoading, error, sendMessage, sendImageMessage, clearError, clearChat, restoreMessages, setPreferencesSection, lastStats } =
    useChatApi(activePersona.systemPrompt, activeModelSettings);
  const { sessions, saveSession, deleteSession } = useHolocronArchive();
  const { reactions, react } = useMessageReactions();
  const { customPersonas, savePersona, deletePersona } = useCustomPersonas();
  const prefs = usePersonaPreferences();
  const activePrefNotes = useMemo(
    () => prefs.notesByPersona[activePersona.id] ?? [],
    [prefs.notesByPersona, activePersona.id],
  );

  // Feed learned style notes into the system prompt at send time (does not reset the chat)
  useEffect(() => {
    setPreferencesSection(prefs.enabled ? formatPreferencesSection(activePrefNotes) : '');
  }, [setPreferencesSection, prefs.enabled, activePrefNotes]);

  const handleReact = (key: string, reactionId: string, content: string) => {
    const isToggleOff = reactions.get(key) === reactionId;
    react(key, reactionId, content);
    prefs.recordReaction(activePersona.id, key, isToggleOff ? null : reactionId, content);
  };

  useSoundFx({ personaId: activePersona.id, isLoading, messages });

  const allPersonas = useMemo(() => [...PERSONAS, ...customPersonas], [customPersonas]);
  const builtInIds = useMemo(() => new Set(PERSONAS.map((p) => p.id)), []);

  useEffect(() => {
    const root = document.documentElement;
    if (activeFaction) {
      root.dataset.faction = activeFaction.id;
    } else {
      delete root.dataset.faction;
    }
  }, [activeFaction]);

  const handleSend = (content: string) => {
    playSaberSwing();
    const imageMatch = content.match(/^\/image\s+(.+)/i);
    if (imageMatch) {
      sendImageMessage(imageMatch[1].trim(), imageServerUrl);
    } else {
      sendMessage(content, serverUrl);
    }
  };

  const handlePersonaSelect = (persona: Persona) => {
    if (persona.id !== activePersona.id) {
      setActivePersona(persona);
    }
  };

  const handleFactionSelect = (faction: FactionTheme) => {
    setActiveFaction((prev) => (prev?.id === faction.id ? null : faction));
  };

  const handleSaveRecording = () => {
    saveSession(messages, activePersona.id);
  };

  const handleRestoreSession = (session: ArchivedSession) => {
    const persona = allPersonas.find((p) => p.id === session.personaId) ?? DEFAULT_PERSONA;
    restoreMessages(session.messages);
    setActivePersona(persona);
    setArchiveOpen(false);
  };

  const handleOpenEditor = (persona: Persona | null) => {
    setEditorPersona(persona);
    setEditorOpen(true);
  };

  const handleDeletePersona = (id: string) => {
    deletePersona(id);
    if (activePersona.id === id) {
      setActivePersona(DEFAULT_PERSONA);
    }
  };

  // Custom personas store model settings on the Persona; built-ins use localStorage overrides
  const handleSaveModelSettings = (settings: ModelSettings) => {
    const cleaned = cleanSettings(settings);
    const modelFields = { model: cleaned.model, temperature: cleaned.temperature, maxTokens: cleaned.maxTokens };
    const custom = customPersonas.find((p) => p.id === activePersona.id);
    if (custom) {
      savePersona({ ...custom, ...modelFields });
      personaSettings.setOverride(activePersona.id, {});
      setActivePersona((prev) => ({ ...prev, ...modelFields }));
    } else {
      personaSettings.setOverride(activePersona.id, cleaned);
    }
  };

  // Keep the active persona's model settings in sync when it's edited in the PersonaEditor
  const handleSavePersona = (persona: Persona) => {
    savePersona(persona);
    if (persona.id === activePersona.id) {
      setActivePersona((prev) => ({ ...prev, model: persona.model, temperature: persona.temperature, maxTokens: persona.maxTokens }));
    }
  };

  const canSave = messages.some((m) => m.role === 'user');

  return (
    <>
      <StarField accent={activeFaction?.accent} />
      <HyperspaceTransition triggerKey={activePersona.id} />
      <div className="app">
        <ChatHeader
          onToggleSettings={() => setSettingsOpen((prev) => !prev)}
          settingsOpen={settingsOpen}
          onClearChat={clearChat}
          onToggleArchive={() => setArchiveOpen((prev) => !prev)}
          archiveOpen={archiveOpen}
          onToggleDebate={() => setDebateOpen((prev) => !prev)}
          debateOpen={debateOpen}
          onToggleMission={() => setMissionOpen((prev) => !prev)}
          missionOpen={missionOpen}
        />
        <PersonaSelector
          personas={allPersonas}
          builtInIds={builtInIds}
          activePersonaId={activePersona.id}
          onSelect={handlePersonaSelect}
          onEdit={handleOpenEditor}
          onAdd={() => handleOpenEditor(null)}
        />
        <FactionSelector
          factions={FACTION_THEMES}
          activeFactionId={activeFaction?.id ?? null}
          onSelect={handleFactionSelect}
        />
        {settingsOpen && (
          <SettingsPanel
            serverUrl={serverUrl}
            onSave={(url) => {
              setServerUrl(url);
              setSettingsOpen(false);
            }}
            imageServerUrl={imageServerUrl}
            onSaveImageUrl={(url) => {
              setImageServerUrl(url);
              setSettingsOpen(false);
            }}
          />
        )}
        {settingsOpen && (
          <LearnedPreferences
            personaName={activePersona.name}
            notes={activePrefNotes}
            enabled={prefs.enabled}
            onToggleEnabled={prefs.setEnabled}
            onRemoveNote={(key) => prefs.removeNote(activePersona.id, key)}
            onClear={() => prefs.clearPersona(activePersona.id)}
          />
        )}
        {error && <ErrorBanner message={error.message} onDismiss={clearError} />}
        <ChatWindow messages={messages} isLoading={isLoading} reactions={reactions} onReact={handleReact} />
        <ModelStatusBar
          personaName={activePersona.name}
          settings={activeModelSettings}
          onSave={handleSaveModelSettings}
          serverUrl={serverUrl}
          stats={lastStats}
        />
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>

      {archiveOpen && (
        <HolocronArchive
          sessions={sessions}
          onSave={handleSaveRecording}
          canSave={canSave}
          onRestore={handleRestoreSession}
          onDelete={deleteSession}
          onClose={() => setArchiveOpen(false)}
        />
      )}

      {debateOpen && (
        <DebateArena personas={allPersonas} serverUrl={serverUrl} getSettings={getEffective} onClose={() => setDebateOpen(false)} />
      )}

      {missionOpen && (
        <MissionConsole serverUrl={serverUrl} imageServerUrl={imageServerUrl} onClose={() => setMissionOpen(false)} />
      )}

      {editorOpen && (
        <PersonaEditor
          persona={editorPersona}
          serverUrl={serverUrl}
          onSave={handleSavePersona}
          onDelete={handleDeletePersona}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
}
