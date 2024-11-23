from server.db.session_db import db

def init_db():
    db.create_all()

if __name__ == '__main__':
    from server.application import application
    with application.app_context():
        init_db()
        print('Database initialized!')
