import { useState, useEffect } from 'react'
import { AudioRecorder } from 'react-audio-voice-recorder'
import './App.css'
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { Login } from './components/Login';
import { auth } from '../firebase';
import { Modal } from './components/InfoModal';
import InfoIcon from '@mui/icons-material/Info';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SaveIcon from '@mui/icons-material/Save';

type Language = 'french' | 'italian'

export default function App() {
  const { user, loading } = useFirebaseAuth();
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true)
  const [userInput, setUserInput] = useState<string>('')
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('french')
  const [translation, setTranslation] = useState<string>('')
  const [summary, setSummary] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [translatedAudioData, setTranslatedAudioData] = useState<string>('');
  const [userRecordedAudioData, setUserRecordedAudioData] = useState<string>('');

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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(e.target.value as Language)
  }

  const addAudioElement = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    setUserRecordedAudioData(url)
    const audio = document.createElement('audio')
    audio.src = url
    audio.controls = true
    document.getElementById('audio-container')?.appendChild(audio)
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
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setUserInput(newValue)
    
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
        body: JSON.stringify({
          audioData: userRecordedAudioData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save recording');
      }
    } catch (error) {
      console.error('Error saving recording:', error);
    }
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
              onClick={() => setIsModalOpen(true)}
              className="info-button"
              aria-label="Information"
            >
              <InfoIcon fontSize="small" />
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

      <Modal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Information"
      >
        {/* Add your modal content here */}
        <p>Your information text will go here.</p>
      </Modal>

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
                          <SaveIcon />
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
