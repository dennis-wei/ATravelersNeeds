from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
import base64

db = SQLAlchemy()

@dataclass
class Session(db.Model):
    id: str = db.Column(db.String(36), primary_key=True)
    user_id: str = db.Column(db.String(128), nullable=False)
    prompt: str = db.Column(db.Text, nullable=False)
    language: str = db.Column(db.String(128), nullable=False)
    summary: str = db.Column(db.Text, nullable=False)
    translation: str = db.Column(db.Text, nullable=False)
    tts_audio: bytes = db.Column(db.LargeBinary, nullable=False)
    created_at: datetime = db.Column(db.DateTime, default=datetime.utcnow)
    recording: Optional[bytes] = db.Column(db.LargeBinary, nullable=True)

    # Add btree index on user_id
    __table_args__ = (db.Index('idx_user_id', 'user_id', postgresql_using='btree'),)

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

class DatabaseManager:
    @staticmethod
    def create_session(session: Session) -> Session:
        db_session = Session(
            id=session.id,
            user_id=session.user_id,
            prompt=session.prompt,
            language=session.language,
            summary=session.summary,
            translation=session.translation,
            tts_audio=session.tts_audio
        )
        db.session.add(db_session)
        db.session.commit()
        return db_session

    @staticmethod
    def get_user_sessions(user_id: str) -> list[Session]:
        try:
            one_week_ago = datetime.utcnow() - timedelta(days=7)
            return Session.query.filter_by(user_id=user_id)\
                .filter(Session.created_at >= one_week_ago)\
                .order_by(Session.created_at.desc())\
                .all()
        except Exception as e:
            print(f"Error fetching user sessions: {e}")
            return []