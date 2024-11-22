import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase';

export function Login() {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to Duolingo by Diary</h2>
        <button
          onClick={handleLogin}
          className="google-login-button"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}