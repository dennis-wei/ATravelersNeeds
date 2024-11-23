export interface Session {
  id: string;
  prompt: string;
  summary: string;
  translation: string;
  language: string;
  created_at: string;
  tts_audio: string;
  recording: string | null;
}
