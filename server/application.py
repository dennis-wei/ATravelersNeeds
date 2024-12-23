from flask import Flask, request, jsonify
from functools import wraps
from firebase_admin import auth, credentials, initialize_app
import json
from openai import OpenAI
import os
from flask_cors import CORS
import uuid
from server.db.firebase_db import FirebaseManager
from server.db.session import Session
from dotenv import load_dotenv
import datetime
import time

load_dotenv()

cred = credentials.Certificate('firebase_credentials.json')
firebase = initialize_app(cred, {
    'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET')
})

# Initialize the Firebase manager
firebase_manager = FirebaseManager()

def create_app():
    app = Flask(__name__)
    
    CORS(
        app,
        origins=[
            "http://localhost:5173",
            "http://localhost:5174",
            "https://travelers-needs.denniswei.dev",
            "https://a-travelers-needs.netlify.app"
        ],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )
    
    return app

application = create_app()

def require_firebase_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Invalid authorization header'}), 401
        
        token = auth_header.split('Bearer ')[1]
        try:
            decoded_token = auth.verify_id_token(token)
            user = auth.get_user(decoded_token['uid'])
            if not user:
                return jsonify({'error': 'Invalid user'}), 401
            kwargs['user'] = user
        except Exception as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
        return f(*args, **kwargs)
            
    return decorated_function

@application.route('/api/sessions', methods=['GET'])
@require_firebase_token
def get_sessions(user):
    sessions = firebase_manager.get_user_sessions(user.uid)
    return jsonify(sessions)

@application.route('/api/submit', methods=['POST'])
@require_firebase_token
def submit(user):
    data = request.get_json()
    prompt = data.get('text')
    language = data.get('language')
    
    match language:
        case 'french':
            language_code = 'French'
        case 'italian':
            language_code = 'Italian'
        case _:
            return jsonify({'error': 'Invalid language. Must be french or italian'}), 400
    
    if not prompt:
        return jsonify({'error': 'No prompt provided'}), 400

    try:
        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        raw_system_prompt = open('prompts/system.txt', 'r').read()
        system_prompt = raw_system_prompt.replace('{{language}}', language_code)

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}]
        )

        try:
            completion_json = json.loads(completion.choices[0].message.content.replace("```json", "").replace("```", ""))
            if not all(key in completion_json for key in ['summary', 'translation']):
                raise ValueError("Response missing required fields")
            
            # Get text-to-speech for the translation
            speech_response = client.audio.speech.create(
                model="tts-1",
                voice="alloy",
                input=completion_json['translation'],
                response_format="mp3"
            )

            session = Session(
                id=str(uuid.uuid4()),
                user_id=user.uid,
                prompt=prompt,
                language=language,
                summary=completion_json['summary'],
                translation=completion_json['translation'],
                created_at=time.time()
            )
            
            # Create session with audio data
            session = firebase_manager.create_session(session, speech_response)
            
            return jsonify({
                'summary': session.summary,
                'translation': session.translation,
                'audio': session.tts_audio,  # Now sending base64 string directly
                'sessionId': session.id
            })

        except json.JSONDecodeError:
            raise ValueError("Invalid JSON response from completion")

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@application.route('/api/saveRecording/session/<session_id>', methods=['POST'])
@require_firebase_token
def save_recording(session_id, user):
    data = request.get_json()
    audio_data = data.get('audioData')
    
    if not session_id or not audio_data:
        return jsonify({'error': 'Missing sessionId or audioData'}), 400
    
    try:
        firebase_manager.save_recording(session_id, user.uid, audio_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@application.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.utcnow().isoformat()
    }), 200

if __name__ == '__main__':
    application.run(debug=True, host='0.0.0.0', port=5000)