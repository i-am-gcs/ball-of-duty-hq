import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

import { get, onValue, ref, set } from "firebase/database";

import { auth, database } from "../firebase/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState(null);

  const [profileLoading, setProfileLoading] = useState(true);

  async function loadClaims(firebaseUser, forceRefresh = false) {
    if (!firebaseUser) {
      setIsAdmin(false);
      return false;
    }

    const token = await firebaseUser.getIdTokenResult(forceRefresh);

    const admin = token.claims.admin === true;

    setIsAdmin(admin);

    return admin;
  }

  useEffect(
    () =>
      onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          setUser(firebaseUser);

          await loadClaims(firebaseUser);
        } catch (error) {
          console.error(
            "Nem sikerült betölteni a felhasználói jogosultságokat:",
            error,
          );

          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      }),
    [],
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);

      return undefined;
    }

    setProfileLoading(true);

    return onValue(
      ref(database, `users/${user.uid}`),

      (snapshot) => {
        setProfile(snapshot.exists() ? snapshot.val() : null);

        setProfileLoading(false);
      },

      (error) => {
        console.error("Nem sikerült betölteni a felhasználói profilt:", error);

        setProfile(null);
        setProfileLoading(false);
      },
    );
  }, [user]);

  async function register({ email, password, displayName }) {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    const cleanName = displayName.trim();

    await updateProfile(credential.user, {
      displayName: cleanName,
    });

    await set(ref(database, `users/${credential.user.uid}`), {
      displayName: cleanName,
      email: credential.user.email,
      createdAt: new Date().toISOString(),
      status: "pending",
    });

    return credential.user;
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: "select_account",
    });

    const credential = await signInWithPopup(auth, provider);

    const userRef = ref(database, `users/${credential.user.uid}`);

    const profile = await get(userRef);

    if (!profile.exists()) {
      await set(userRef, {
        displayName: credential.user.displayName || credential.user.email,

        email: credential.user.email,

        photoURL: credential.user.photoURL || null,

        createdAt: new Date().toISOString(),

        status: "pending",
      });
    }

    return credential.user;
  }

  const value = useMemo(
    () => ({
      user,

      isAdmin,

      loading,

      profile,

      profileLoading,

      isApproved: isAdmin || profile?.status === "approved",

      login: (email, password) =>
        signInWithEmailAndPassword(auth, email, password),

      loginWithGoogle,

      register,

      logout: () => signOut(auth),

      refreshClaims: () => loadClaims(auth.currentUser, true),
    }),
    [user, isAdmin, loading, profile, profileLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("A useAuth csak AuthProvideren belül használható.");
  }

  return context;
}
