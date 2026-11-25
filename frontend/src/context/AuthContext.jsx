import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(null); // Mongo profile
  const [loading, setLoading] = useState(true);
  const [authInProgress, setAuthInProgress] = useState(false);

  const isAuthenticated = !!firebaseUser;

  // Throws, so login/register can show the error instead of landing on a
  // dashboard whose every request fails.
  const syncMongoProfile = useCallback(async (name) => {
    const { data } = await api.post('/auth/sync', name ? { name } : {});
    setUser(data.data.user);
    return data.data.user;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await syncMongoProfile().catch((err) => console.error('Failed to sync profile:', err));
      } else {
        setUser(null);
        setAuthInProgress(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [syncMongoProfile]);

  // Runs a Firebase sign-in, then creates/loads the Mongo profile. If the
  // backend rejects the account, sign back out so the app never sits in a
  // half-signed-in state. `authInProgress` stops RedirectIfAuth from leaving
  // the form before this finishes, so its error can still be shown; on
  // success it stays set and the form navigates (e.g. to onboarding) itself.
  const signInAndSync = useCallback(async (signIn, getName) => {
    setAuthInProgress(true);
    try {
      const credential = await signIn();
      try {
        await syncMongoProfile(getName?.(credential));
      } catch (err) {
        await signOut(auth).catch(() => {});
        throw err;
      }
      return credential;
    } catch (err) {
      setAuthInProgress(false);
      throw err;
    }
  }, [syncMongoProfile]);

  const login = useCallback(
    (email, password) => signInAndSync(() => signInWithEmailAndPassword(auth, email, password)),
    [signInAndSync]
  );

  const register = useCallback(
    (name, email, password) => signInAndSync(async () => {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateFirebaseProfile(credential.user, { displayName: name });
      }
      return credential;
    }, () => name),
    [signInAndSync]
  );

  const loginWithGoogle = useCallback(
    () => signInAndSync(() => signInWithPopup(auth, googleProvider), (credential) => credential.user.displayName),
    [signInAndSync]
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  const value = {
    firebaseUser,
    user,
    loading,
    isAuthenticated,
    authInProgress,
    login,
    register,
    loginWithGoogle,
    logout,
    refreshProfile: syncMongoProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
