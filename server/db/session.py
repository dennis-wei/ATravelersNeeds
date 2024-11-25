from datetime import datetime
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
import base64

@dataclass
class Session():
    id: str
    user_id: str
    prompt: str
    language: str
    summary: str
    translation: str
    created_at: datetime
    tts_audio: Optional[str] = None
    recording: Optional[str] = None

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'prompt': self.prompt,
            'language': self.language,
            'summary': self.summary,
            'translation': self.translation,
            'created_at': self.created_at.isoformat(),
            'tts_audio': base64.b64encode(self.tts_audio).decode('utf-8'),
            'recording': base64.b64encode(self.recording).decode('utf-8') if self.recording else None
        }

