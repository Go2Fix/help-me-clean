import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Star, CheckCircle2, Smartphone } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';

const fadeUpItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Inline SVG logos ────────────────────────────────────────────────────────

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function GooglePlayLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.18 23.76c.37.21.8.22 1.19.04l12.5-7.16-2.89-2.9-10.8 10zm16.51-9.59L17.03 12l2.66-2.17L5.54.41C5.12.17 4.67.18 4.3.41L15.2 11.3l4.49 2.87zM1.01 1.56C.71 1.9.5 2.4.5 3.04v17.92c0 .64.21 1.14.51 1.48l.08.08L11.65 12.1v-.2L1.09 1.47l-.08.09zM19.69 10.47l-2.16 1.52 2.16 2.16 2.56-1.46c.73-.42.73-1.1 0-1.52l-2.56-1.46 2.56 1.46-2.56-1.7z" />
    </svg>
  );
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div className="relative flex justify-center">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-75" />

      {/* Floating notification */}
      <motion.div
        className="absolute -top-4 -right-4 sm:-right-8 bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 z-10 min-w-[180px]"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900 leading-tight">Curățenie finalizată</p>
          <p className="text-xs text-gray-400">Acum 2 minute</p>
        </div>
      </motion.div>

      {/* Floating rating bubble */}
      <motion.div
        className="absolute -bottom-2 -left-4 sm:-left-10 bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      >
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-xs font-bold text-gray-900">4.9 / 5.0</p>
      </motion.div>

      {/* Phone frame */}
      <div className="relative w-[200px] sm:w-[220px]">
        {/* Phone outer shell */}
        <div className="bg-slate-800 rounded-[40px] p-2 shadow-2xl ring-1 ring-white/10">
          {/* Screen */}
          <div className="bg-gray-50 rounded-[32px] overflow-hidden">
            {/* Status bar */}
            <div className="bg-white px-5 pt-3 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-800">9:41</span>
              {/* Notch */}
              <div className="w-16 h-4 bg-slate-800 rounded-full absolute left-1/2 -translate-x-1/2 top-2" />
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 border border-gray-400 rounded-[2px]">
                  <div className="w-2 h-full bg-gray-400 rounded-[1px]" />
                </div>
              </div>
            </div>

            {/* App UI */}
            <div className="px-3 pb-4 space-y-2 bg-gray-50">
              {/* Header */}
              <div className="pt-2 pb-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-900 leading-tight">Go2Fix</p>
                    <p className="text-[7px] text-gray-400 leading-tight">Bună, Maria!</p>
                  </div>
                </div>

                {/* Search bar mockup */}
                <div className="bg-white rounded-lg px-2 py-1.5 flex items-center gap-1.5 border border-gray-200">
                  <div className="w-2 h-2 rounded-full border border-gray-300" />
                  <p className="text-[8px] text-gray-400">Caută servicii...</p>
                </div>
              </div>

              {/* Upcoming booking card */}
              <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <p className="text-[8px] font-bold text-gray-700 uppercase tracking-wide">Programare</p>
                </div>
                <p className="text-[9px] font-black text-gray-900 leading-snug">Curățenie apartament</p>
                <p className="text-[7px] text-gray-400 mt-0.5">Mâine · 10:00 – 13:00</p>
                <div className="mt-2 flex gap-1">
                  <div className="flex-1 bg-blue-600 rounded-lg py-1 text-center">
                    <p className="text-[7px] font-bold text-white">Chat</p>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-lg py-1 text-center">
                    <p className="text-[7px] font-semibold text-gray-600">Detalii</p>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { emoji: '🧹', label: 'Curățenie' },
                  { emoji: '🔧', label: 'Reparații' },
                  { emoji: '⚡', label: 'Electric' },
                  { emoji: '🌿', label: 'Grădină' },
                ].map(({ emoji, label }) => (
                  <div key={label} className="bg-white rounded-xl p-2 border border-gray-100 text-center shadow-sm">
                    <p className="text-sm leading-none">{emoji}</p>
                    <p className="text-[7px] font-semibold text-gray-600 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Bottom nav bar */}
              <div className="bg-white rounded-2xl p-2 border border-gray-100 flex justify-around mt-1">
                {['🏠', '📅', '💬', '👤'].map((icon) => (
                  <div key={icon} className="text-sm">{icon}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Side buttons */}
        <div className="absolute right-[-4px] top-20 w-1 h-8 bg-slate-700 rounded-r-sm" />
        <div className="absolute left-[-4px] top-14 w-1 h-6 bg-slate-700 rounded-l-sm" />
        <div className="absolute left-[-4px] top-22 w-1 h-6 bg-slate-700 rounded-l-sm" />
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function AppComingSoonSection() {
  const { lang } = useLanguage();

  return (
    <section className="py-20 sm:py-24 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      {/* Decorative blobs */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-800/10 rounded-full blur-3xl pointer-events-none" />

      {/* Dot grid */}
      <div className="absolute inset-0 bg-[image:radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Text & CTAs */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {/* Badge */}
            <motion.div variants={fadeUpItem} className="mb-6">
              <span className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full">
                <Bell className="h-3.5 w-3.5" />
                Curând disponibil
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              variants={fadeUpItem}
              className="text-4xl sm:text-5xl font-black text-white leading-tight mb-5"
            >
              Aplicația Go2Fix{' '}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                pe telefonul tău
              </span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p variants={fadeUpItem} className="text-lg text-blue-200/70 mb-8 leading-relaxed max-w-lg">
              Rezervă, urmărește și plătește servicii direct din aplicație.
              Notificări în timp real, chat cu prestatorul și istoricul complet al comenzilor.
            </motion.p>

            {/* Feature pills */}
            <motion.div variants={fadeUpItem} className="flex flex-wrap gap-2 mb-8">
              {[
                '📍 Urmărire în timp real',
                '💬 Chat direct',
                '🔔 Notificări push',
                '💳 Plată rapidă',
              ].map((feat) => (
                <span
                  key={feat}
                  className="text-xs font-medium text-blue-200/80 bg-white/8 border border-white/10 px-3 py-1.5 rounded-full"
                >
                  {feat}
                </span>
              ))}
            </motion.div>

            {/* App store buttons */}
            <motion.div variants={fadeUpItem} className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* App Store */}
              <div className="relative group">
                <button
                  disabled
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white px-5 py-3 rounded-2xl transition-all duration-200 cursor-not-allowed w-full sm:w-auto"
                  aria-label="App Store — curând disponibil"
                >
                  <AppleLogo className="h-6 w-6 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] text-white/60 leading-none mb-0.5">Descarcă din</p>
                    <p className="text-sm font-bold leading-tight">App Store</p>
                  </div>
                  <span className="ml-auto sm:ml-3 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full flex-shrink-0">
                    În curând
                  </span>
                </button>
              </div>

              {/* Google Play */}
              <div className="relative group">
                <button
                  disabled
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white px-5 py-3 rounded-2xl transition-all duration-200 cursor-not-allowed w-full sm:w-auto"
                  aria-label="Google Play — curând disponibil"
                >
                  <GooglePlayLogo className="h-6 w-6 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] text-white/60 leading-none mb-0.5">Disponibil pe</p>
                    <p className="text-sm font-bold leading-tight">Google Play</p>
                  </div>
                  <span className="ml-auto sm:ml-3 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full flex-shrink-0">
                    În curând
                  </span>
                </button>
              </div>
            </motion.div>

            {/* Waitlist nudge */}
            <motion.p variants={fadeUpItem} className="text-sm text-blue-300/60">
              Vrei să fii primul care știe?{' '}
              <Link
                to={ROUTE_MAP.waitlist[lang]}
                className="text-blue-300 hover:text-white font-semibold underline underline-offset-2 decoration-blue-400/50 hover:decoration-white transition-colors"
              >
                Înscrie-te pe lista de așteptare →
              </Link>
            </motion.p>
          </motion.div>

          {/* Right: Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="flex justify-center lg:justify-end"
          >
            <PhoneMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
