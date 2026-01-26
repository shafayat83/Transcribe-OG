
export interface TranscriptionResult {
  transcript: string;
  language: string;
  confidence: number;
  groundingSources?: { title: string; uri: string }[];
}

export const transcribeVideo = async (url: string, targetLanguage: string = "en"): Promise<TranscriptionResult> => {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, targetLanguage })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Server error during transcription');
  }

  return response.json();
};

export const generateVoiceOver = async (text: string, voiceName: string): Promise<string> => {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Server error during TTS');
  }

  const result = await response.json();
  return result.data;
};
