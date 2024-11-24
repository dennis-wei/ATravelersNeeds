import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Session } from '../types/session';
import { format } from 'date-fns';
import '../styles/SessionsModal.css';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  onSelectSession: (session: Session) => void;
  currentSessionId: string | null;
}

export function SessionsModal({ isOpen, onClose, sessions, onSelectSession, currentSessionId }: SessionsModalProps) {
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Stop any playing audio
  const stopCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
  };

  // Stop audio when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCurrentAudio();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  const handlePlayAudio = (audioData: string | null) => {
    if (!audioData) return;
    stopCurrentAudio(); // Stop any currently playing audio
    const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
    setCurrentAudio(audio);
    audio.play();
  };

  const handleClose = () => {
    stopCurrentAudio();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Previous Sessions">
      <div className="sessions-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Prompt</th>
              <th>Recording</th>
            </tr>
          </thead>
          <tbody>
            {sessions?.map((session) => {
              return (
                <tr 
                  key={session.id} 
                  onClick={() => onSelectSession(session)}
                  className={`session-row ${session.id === currentSessionId ? 'session-row-active' : ''}`}
                >
                  <td>{format(new Date(session.created_at), 'MMM d, yyyy h:mm a')}</td>
                  <td>{session.prompt?.substring(0, 100) || ''}...</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {session.recording && (
                      <button 
                        className="session-audio-button"
                        onClick={() => handlePlayAudio(session.recording)}
                        aria-label="Play recording"
                      >
                        <VolumeUpIcon />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}