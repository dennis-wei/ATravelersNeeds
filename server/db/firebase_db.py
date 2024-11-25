from firebase_admin import firestore
import base64
import time
from server.db.session import Session
from dataclasses import dataclass, asdict
from typing import List, Optional
from google.cloud.firestore import FieldFilter, SERVER_TIMESTAMP

CHUNK_SIZE = 750000  # ~750KB to stay under 1MB after base64 encoding

@dataclass
class SessionFirebase():
    id: str
    user_id: str
    prompt: str
    language: str
    summary: str
    translation: str
    created_at: float
    updated_at: float
    tts_audio_chunks: Optional[int] = None
    recording_chunks: Optional[int] = None

    def to_session(self) -> Session:
        print("keys: ", asdict(self).keys())
        return Session(
            id=self.id,
            user_id=self.user_id,
            prompt=self.prompt,
            language=self.language,
            summary=self.summary,
            translation=self.translation,
            created_at=self.created_at,
        )
    
    def to_dict(self) -> dict:
        # Convert to dict and ensure timestamps are numbers
        data = asdict(self)
        data['created_at'] = int(self.created_at)  # Convert to integer timestamp
        data['updated_at'] = int(self.updated_at)  # Convert to integer timestamp
        return data

    @classmethod
    def from_dict(cls, data: dict) -> 'SessionFirebase':
        # Filter out unexpected fields
        valid_fields = cls.__annotations__.keys()
        filtered_data = {k: v for k, v in data.items() if k in valid_fields}
        
        # Ensure required fields have defaults if missing
        if 'updated_at' not in filtered_data:
            filtered_data['updated_at'] = filtered_data.get('created_at', time.time())
            
        return cls(**filtered_data)

class FirebaseManager:
    def __init__(self):
        self.db = firestore.client()

    def get_user_sessions(self, user_id: str) -> List[Session]:
        sessions_ref = self.db.collection('sessions').where(filter=FieldFilter('user_id', '==', user_id))
        sessions = []
        for doc in sessions_ref.stream():
            session_data = doc.to_dict()
            
            created_at = session_data.get('created_at')
            updated_at = session_data.get('updated_at')
            
            if hasattr(created_at, 'timestamp'):
                session_data['created_at'] = created_at.timestamp()
            if hasattr(updated_at, 'timestamp'):
                session_data['updated_at'] = updated_at.timestamp()
                
            session_firebase_data = SessionFirebase.from_dict(session_data)
            print("74 session_firebase_data", session_firebase_data)
            session = session_firebase_data.to_session()
            
            if session_firebase_data.tts_audio_chunks:
                session.tts_audio = self.get_audio_chunks(doc.id, 'tts_audio')
            
            if session_firebase_data.recording_chunks:
                session.recording = self.get_audio_chunks(doc.id, 'recording')

            sessions.append(session)
        return sessions
    def create_session(self, session: Session, speech_response) -> Session:
        # Convert audio bytes to base64 string
        tts_audio_base64 = base64.b64encode(speech_response.content).decode('utf-8')
        
        # Split audio into chunks
        chunks = [tts_audio_base64[i:i+CHUNK_SIZE] for i in range(0, len(tts_audio_base64), CHUNK_SIZE)]
        
        # Create SessionFirebase instance
        session_firebase_data = SessionFirebase(
            id=session.id,
            user_id=session.user_id,
            prompt=session.prompt,
            language=session.language,
            summary=session.summary,
            translation=session.translation,
            created_at=int(time.time()),  # Use integer timestamp
            updated_at=int(time.time()),  # Use integer timestamp
            tts_audio_chunks=len(chunks)
        )
        
        # Convert to dict using custom to_dict method
        session_dict = session_firebase_data.to_dict()
        
        # Store main session data
        self.db.collection('sessions').document(session.id).set(session_dict)
        
        # Store audio chunks
        for i, chunk in enumerate(chunks):
            self.db.collection('sessions').document(session.id) \
                .collection('tts_audio').document(str(i)).set({
                    'data': chunk,
                    'index': i
                })
            
        session.tts_audio = tts_audio_base64
        
        return session

    def save_recording(self, session_id: str, user_id: str, audio_data: str) -> None:
        # Handle both data URL and base64 formats
        if ',' in audio_data:
            audio_base64 = audio_data.split(',')[1]
        else:
            audio_base64 = audio_data
            
        # Split recording into chunks
        chunks = [audio_base64[i:i+CHUNK_SIZE] for i in range(0, len(audio_base64), CHUNK_SIZE)]
        
        # Update main session document with integer timestamp
        self.db.collection('sessions').document(session_id).update({
            'recording_chunks': len(chunks),
            'updated_at': int(time.time())  # Use integer timestamp
        })
        
        # Store recording chunks
        for i, chunk in enumerate(chunks):
            self.db.collection('sessions').document(session_id) \
                .collection('recording').document(str(i)).set({
                    'data': chunk,
                    'index': i
                })

    def get_audio_chunks(self, session_id: str, collection_name: str) -> str:
        chunks = self.db.collection('sessions').document(session_id) \
            .collection(collection_name).order_by('index').stream()
        return ''.join(chunk.to_dict()['data'] for chunk in chunks)