import { useState, useEffect } from 'react'
import { AudioRecorder } from 'react-audio-voice-recorder'
import './App.css'
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { Login } from './components/Login';
import { auth } from '../firebase';
import { InfoModal } from './components/InfoModal';
import CheckIcon from '@mui/icons-material/Check';
import InfoIcon from '@mui/icons-material/Info';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SaveIcon from '@mui/icons-material/Save';
import { SessionsModal } from './components/SessionsModal';
import HistoryIcon from '@mui/icons-material/History';
import { Session } from './types/session';

type Language = 'french' | 'italian'

export default function App() {
  const { user, loading } = useFirebaseAuth();
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true)
  const [userInput, setUserInput] = useState<string>('')
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('french')
  const [translation, setTranslation] = useState<string>('')
  const [summary, setSummary] = useState<string>('')
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [translatedAudioData, setTranslatedAudioData] = useState<string>('');
  const [userRecordedAudioData, setUserRecordedAudioData] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState(false);

  const INITIAL_TEXT = `I was happy as I played the guitar. I think I was really happy I enjoyed making good music and sharing it with my friends. But at the same time, I was annoyed. I know I'm not the best guitarist, and despite my practice, I feel like I'm in a rut and not getting any better. I'm annoyed because I feel like I'm not good enough.`

  const INITIAL_SUMMARY = `I was happy to play the guitar, but I am mostly annoyed. I know I can do better, and it's entirely on me to change that. I am annoyed with the mistakes I made, I am annoyed that I keep making those same mistakes, and I am annoyed that I'm not good enough.`

  const INITIAL_TRANSLATION = `Je suis heureux de jouer de la guitare, mais je suis surtout enervé. Je sais que je peux faire mieux, et c'est entièrement à moi de le changer. Je suis enervé des erreurs que j'ai faites, je suis enervé que je continue à faire les mêmes erreurs, et je suis enervé que je ne suis pas assez bon.`

  useEffect(() => {
    if (isFirstLoad) {
      setUserInput(INITIAL_TEXT)
      setSummary(INITIAL_SUMMARY)
      setTranslation(INITIAL_TRANSLATION)
    }
  }, [])

  useEffect(() => {
    const fetchSessionsOnLoad = async () => {
      setIsLoading(true);
      if (!user) return;
      
      try {
        const idToken = await user?.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/sessions`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          },
          credentials: 'include',
        });
        const fetchedSessions = await response.json();
        setSessions(fetchedSessions);
        
        if (fetchedSessions.length > 0 && isFirstLoad) {
          const mostRecent = fetchedSessions[0];
          setSessionId(mostRecent.id);
          setUserInput(mostRecent.prompt);
          setSummary(mostRecent.summary);
          setTranslation(mostRecent.translation);
          setSelectedLanguage(mostRecent.language as Language);
          setUserRecordedAudioData(mostRecent.recording || '');
          setTranslatedAudioData(mostRecent.tts_audio || '');
          setIsFirstLoad(false);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionsOnLoad();
  }, [user]);

  useEffect(() => {
    if (!userRecordedAudioData) return;

    const audioContainer = document.getElementById('audio-container');
    if (!audioContainer) return;

    // Clear existing audio elements
    audioContainer.innerHTML = '';

    // Create and append new audio element
    const audio = document.createElement('audio');
    // Ensure the base64 data is properly formatted as a data URL
    audio.src = userRecordedAudioData.startsWith('data:') 
      ? userRecordedAudioData
      : `data:audio/wav;base64,${userRecordedAudioData}`;
    audio.controls = true;
    audioContainer.appendChild(audio);
  }, [userRecordedAudioData]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(e.target.value as Language)
  }

  const addAudioElement = (blob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      setUserRecordedAudioData(base64Audio);
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(blob);
      audio.controls = true;
      document.getElementById('audio-container')?.appendChild(audio);
    };
  }

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          text: userInput,
          language: selectedLanguage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      const data = await response.json();
      setSummary(data.summary);
      setTranslation(data.translation);
      setTranslatedAudioData(data.audio);
      setSessionId(data.sessionId);
      await fetchSessions();
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setUserInput(newValue)
    setSessionId(null);
    
    if (newValue !== INITIAL_TEXT) {
      setSummary('')
      setTranslation('')
    }
  }

  const handleFocus = () => {
    if (isFirstLoad) {
      setUserInput('');
      setSummary('');
      setTranslation('');
      setIsFirstLoad(false);
    }
  };

  const handleSaveRecording = async () => {
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/saveRecording/session/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          audioData: userRecordedAudioData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save recording');
      }

      await fetchSessions();
      
      // Show checkmark for 1.5 seconds
      setSaveConfirmation(true);
      setTimeout(() => setSaveConfirmation(false), 1500);
    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };


  const handleSelectSession = (session: Session) => {
    setSessionId(session.id);
    setUserInput(session.prompt);
    setSummary(session.summary);
    setTranslation(session.translation);
    setSelectedLanguage(session.language as Language);
    setUserRecordedAudioData(session.recording || '');
    setTranslatedAudioData(session.tts_audio);
    setIsSessionsModalOpen(false);
    setIsFirstLoad(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <div className="title-banner">
        <div className="title-banner-content">
          <div className="left-section">
            <h1>Duolingo by Diary</h1>
          </div>
          <div className="right-section">
            <button 
              onClick={() => setIsSessionsModalOpen(true)}
              className="icon-button"
              aria-label="Session History"
            >
              <HistoryIcon fontSize="small" sx={{ color: 'white' }} />
            </button>
            <button 
              onClick={() => setIsInfoModalOpen(true)}
              className="icon-button"
              aria-label="Information"
            >
              <InfoIcon fontSize="small" sx={{ color: 'white' }} />
            </button>
            <button 
              onClick={() => auth.signOut()} 
              className="logout-button"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <InfoModal 
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />

      <SessionsModal 
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        sessions={sessions}
        onSelectSession={handleSelectSession}
        currentSessionId={sessionId}
      />

      <div className="app-container">
        {/* Left Section */}
        <div className="input-section">
          <div className="input-container">
            <label htmlFor="feeling-input"><h4>How are you feeling?</h4></label>
            <textarea
              id="feeling-input"
              value={userInput}
              onChange={handleInputChange}
              onFocus={handleFocus}
              className={`feeling-textarea ${isFirstLoad ? 'faded' : ''}`}
            />
            <button 
              onClick={handleSubmit}
              className="submit-button"
              disabled={!userInput.trim()}
            >
              Submit
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className="output-section">
          {isLoading ? (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <>
              {/* Summary Section */}
              <div className="summary-container">
                <h3>Summary</h3>
                <div className="summary-content">
                  {summary}
                </div>
              </div>

              {/* Translation Section */}
              <div className="translation-container">
                <div className="language-selector">
                  <select 
                    value={selectedLanguage}
                    onChange={handleLanguageChange}
                    onFocus={handleFocus}
                  >
                    <option value="french">French</option>
                    <option value="italian">Italian</option>
                  </select>
                </div>

                <div className="translation-content">
                  {translation}
                </div>

                {translation && !isFirstLoad && (
                  <div className="audio-section">
                    <div className="audio-controls">
                      {translatedAudioData && (
                        <button 
                          onClick={() => {
                            const audio = new Audio(`data:audio/mp3;base64,${translatedAudioData}`);
                            audio.play();
                          }}
                          className="audio-button"
                          aria-label="Play Translation"
                        >
                          <VolumeUpIcon />
                        </button>
                      )}
                      <AudioRecorder 
                        onRecordingComplete={addAudioElement}
                        audioTrackConstraints={{
                          noiseSuppression: true,
                          echoCancellation: true,
                        }}
                      />
                      {userRecordedAudioData && (
                        <button 
                          onClick={handleSaveRecording}
                          className="audio-button"
                          aria-label="Save Recording"
                        >
                          {saveConfirmation ? <CheckIcon /> : <SaveIcon />}
                        </button>
                      )}
                      <div id="audio-container" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
