import React, { useState } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  FirebaseUser,
} from '../lib/firebase';
import { cloudSyncManager } from '../utils/cloudSyncManager';
import { X, Cloud, Shield, LogIn, LogOut, UserPlus, Mail, Lock, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg('تم إنشاء الحساب وحفظ التقدم سحابياً بنجاح! 🎉');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg('تم تسجيل الدخول واسترجاع تقدمك من السحابة! ☁️');
      }
      await cloudSyncManager.syncToCloud();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg('هذا البريد الإلكتروني مستخدم بالفعل.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMsg('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      } else {
        setErrorMsg('حدث خطأ أثناء الاتصال بالسحابة. حاول مجدداً.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      await cloudSyncManager.syncToCloud();
      setSuccessMsg('تم تسجيل الدخول بحساب Google بنجاح! 🚀');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg('تعذر تسجيل الدخول بـ Google. يمكنك تجربة البريد الإلكتروني.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setSuccessMsg('تم تسجيل الخروج بنجاح.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch {
      setErrorMsg('تعذر تسجيل الخروج.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative text-right">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 p-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-800/60 hover:bg-neutral-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-neutral-800 pb-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Cloud className="w-6 h-6 fill-amber-400/20" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">حفظ التقدم السحابي (Cloud Save)</h3>
            <p className="text-xs text-neutral-400">احفظ مستواك وإحصائياتك والمهام اليومية سحابياً!</p>
          </div>
        </div>

        {/* LOGGED IN VIEW */}
        {currentUser ? (
          <div className="flex flex-col gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">حسابك متصل ومحفوظ سحابياً ✓</span>
                  <span className="text-xs font-mono text-neutral-300">{currentUser.email || currentUser.uid}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              يتم مزامنة مستواك وإحصائيات قتلك والمهام اليومية تلقائياً على خوادم Firebase لحفظ تقدمك عبر جميع الأجهزة.
            </p>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="mt-2 w-full py-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج من الحساب</span>
            </button>
          </div>
        ) : (
          /* NOT LOGGED IN FORM */
          <div className="flex flex-col gap-4">
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl p-3">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl p-3">
                {successMsg}
              </div>
            )}

            {/* Google Sign In Option */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-neutral-100 text-neutral-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>تسجيل الدخول باستخدام Google</span>
            </button>

            <div className="flex items-center gap-2 text-neutral-600 my-1">
              <div className="flex-1 h-[1px] bg-neutral-800" />
              <span className="text-[10px] font-bold uppercase">أو بالبريد الإلكتروني</span>
              <div className="flex-1 h-[1px] bg-neutral-800" />
            </div>

            <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute right-3 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute right-3 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="كلمة المرور (6 أحرف على الأقل)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>{isRegister ? 'إنشاء حساب حفظ جديد' : 'تسجيل الدخول للحساب'}</span>
              </button>
            </form>

            <div className="text-center mt-2">
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                {isRegister ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساباً جديداً'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
