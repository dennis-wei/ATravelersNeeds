from server.db.session_db import db

def init_db():
    db.create_all()

if __name__ == '__main__':
    from app import app
    with app.app_context():
        init_db()
        print('Database initialized!')
