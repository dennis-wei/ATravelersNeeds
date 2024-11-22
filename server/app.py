from flask import Flask, request, jsonify
from functools import wraps
from firebase_admin import auth, credentials
import json
from openai import OpenAI
import base64
import os
from flask_cors import CORS
import uuid

# Initialize Firebase with credentials from .env
# firebase = initialize_app(cred)
# auth = firebase.auth()

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "http://localhost:5174"
        ]
    }
})

def require_firebase_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Invalid authorization header'}), 401
        
        # token = auth_header.split('Bearer ')[1]
        return f(*args, **kwargs)
            
    return decorated_function

@app.route('/api/submit', methods=['POST'])
@require_firebase_token
def submit():
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

        print(completion.choices[0].message.content)

        # Parse and validate completion response
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

            # Generate session ID before returning response
            session_id = str(uuid.uuid4())

            return jsonify({
                'summary': completion_json['summary'],
                'translation': completion_json['translation'],
                'audio': base64.b64encode(speech_response.content).decode('utf-8'),
                'sessionId': session_id
            })

        except json.JSONDecodeError:
            raise ValueError("Invalid JSON response from completion")

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/saveRecording/session/<session_id>', methods=['POST'])
@require_firebase_token
def save_recording(session_id):
    data = request.get_json()
    audio_data = data.get('audioData')
    
    if not session_id or not audio_data:
        return jsonify({'error': 'Missing sessionId or audioData'}), 400
        
    # TODO: Implement storage logic here
    print(f"Received recording for session {session_id}")
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)