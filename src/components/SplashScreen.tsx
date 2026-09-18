import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Swords, Shield, Zap, Target } from 'lucide-react';

const GAME_TIPS = [
  'السر في الفوز هو استخدام طاقة الجيت باك (Jetpack) بحكمة، لا تجعل خزان الوقود يفرغ في منتصف المعركة! 🚀',
  'استخدم قنبلة الغاز السام (Gas Grenade) لإجبار الأعداء على الخروج من المخابئ والأنفاق الضيقة! 💨',
  'سلاح الرشاش المزدوج (Dual SMG) مدمر في المسافات القريبة، ولكنه يفقد دقة التصويب في المسافات البعيدة! 🔫🔫',
  'عند تفعيل السكوب (Scope)، سيتم تعتيم أطراف الشاشة (Vignette) لزيادة التركيز وتخفيف حركة الكاميرا لتسهيل التصويب! 🎯',
  'الوقوف فوق برج المراقبة الأوسط يمنحك أفضلية تكتيكية لمراقبة الساحة بالكامل واصطياد الأعداء! 🏰',
  'تذكر دائماً أن إعادة تعبئة الذخيرة (Reload) في مكان آمن أفضل من مواجهة الأعداء بخزنة فارغة! 🔄',
  'يمكنك دعوة أصدقائك وتحديهم عبر السيرفرات والغرف الخاصة بمشاركة رابط اللعبة مباشرة! 👥',
  'تابع المهام اليومية باستمرار لتحصيل نقاط الخبرة (XP) الإضافية وترقية رتبتك التكتيكية بسرعة! 🏆',
  'استعن بسلاح القناص (Sniper) لإصابة الأهداف البعيدة بضربة واحدة قاتلة في الرأس! 💀',
  'استخدام الحواجز والغطاء في الممر السفلي للأنفاق يحميك من نيران الرشاشات الثقيلة! 🛡️'
];

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [randomTip, setRandomTip] = useState('');

  // Choose a random tip once on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * GAME_TIPS.length);
    setRandomTip(GAME_TIPS[randomIndex]);
  }, []);

  // Animate progress bar from 0 to 100
  useEffect(() => {
    const duration = 2800; // 2.8 seconds loading time
    const intervalTime = 40;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          // Wait a tiny bit after reaching 100% for smooth transition
          setTimeout(() => {
            onComplete();
          }, 200);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-neutral-950 text-white select-none overflow-hidden p-6 md:p-12">
      {/* Cartoon War Styled Background Patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(21,128,61,0.15)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
      <div className="absolute top-10 left-10 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* TOP HEADER */}
      <div className="w-full max-w-md flex justify-between items-center z-10 opacity-70">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">SYS_INITIALIZE_OK</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400">v2.1.0_PROD</span>
      </div>

      {/* CENTER LOGO & TITLE */}
      <div className="flex flex-col items-center text-center z-10 max-w-xl my-auto">
        {/* Animated Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-500 p-1 shadow-[0_0_40px_rgba(16,185,129,0.4)] flex items-center justify-center mb-8 relative"
        >
          <Flame className="w-14 h-14 text-neutral-950 fill-neutral-950 animate-pulse" />
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-400 border-2 border-neutral-950 animate-ping" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-100 to-emerald-300 bg-clip-text text-transparent font-ops"
          style={{ fontFamily: "'Black Ops One', sans-serif" }}
        >
          MINI BATTLE ARENA
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-xs md:text-sm text-neutral-300 mt-2 font-medium tracking-wide max-w-md"
        >
          معركة الساحة المصغرة الأسطورية 2D • جيت باك وحروب تكتيكية ملحمية
        </motion.p>
      </div>

      {/* BOTTOM LOADING BAR & TIP */}
      <div className="w-full max-w-md flex flex-col items-center z-10 gap-6">
        {/* TACTICAL TIP BLOCK */}
        <AnimatePresence mode="wait">
          {randomTip && (
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 backdrop-blur-md relative"
            >
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-amber-500 text-neutral-950 text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                <Target className="w-2.5 h-2.5" />
                <span>نصيحة تكتيكية ⚔️</span>
              </div>
              <p className="text-xs md:text-sm text-neutral-200 leading-relaxed text-center font-semibold pt-1">
                {randomTip}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROGRESS DISPLAY */}
        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-mono text-neutral-400 tracking-wider">جاري تهيئة ساحة المعركة...</span>
            <span className="text-xs font-mono font-bold text-amber-400">{Math.round(progress)}%</span>
          </div>

          {/* Progress bar outer */}
          <div className="w-full h-2.5 bg-neutral-900 border border-neutral-800 rounded-full p-0.5 overflow-hidden shadow-inner">
            {/* Progress bar inner */}
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              style={{ width: `${progress}%` }}
              transition={{ type: "tween", ease: "linear" }}
            />
          </div>
        </div>

        {/* SECURITY & AUTH INTEGRITY SECURE TEXT */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="text-xs font-black text-amber-400">تطوير المطور البطل: محمد أحمد السيد 🛡️</span>
          <span className="text-[8px] font-mono text-neutral-500 select-none tracking-tight uppercase">
            SECURE ENCRYPTED SESSION INITIALIZATION • FIRESTORE SYNC CONNECTED
          </span>
        </div>
      </div>
    </div>
  );
};
