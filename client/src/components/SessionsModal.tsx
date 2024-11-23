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
  const playRecording = (recordingData: string | null) => {
    if (!recordingData) return;
    const audio = new Audio();
    audio.src = recordingData.startsWith('data:') 
      ? recordingData 
      : `data:audio/wav;base64,${recordingData}`;
    audio.play();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Previous Sessions">
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
                        onClick={() => playRecording(session.recording)}
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