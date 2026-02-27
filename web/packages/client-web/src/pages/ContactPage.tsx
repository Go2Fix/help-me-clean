import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEOHead from '@/components/seo/SEOHead';
import { Mail, Phone, MapPin, Clock, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUpItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const ICON_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-amber-400 to-amber-500',
  'from-purple-500 to-purple-600',
];

const INPUT_CLASS =
  'w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm text-gray-900 placeholder-gray-400 bg-white';

export default function ContactPage() {
  const { t } = useTranslation('contact');
  const { lang } = useLanguage();

  const CONTACT_INFO = [
    { icon: Mail,   label: t('info.email'),    value: 'contact@go2fix.ro',  href: 'mailto:contact@go2fix.ro' },
    { icon: Phone,  label: t('info.phone'),    value: '+40 700 000 000',    href: 'tel:+40700000000' },
    { icon: MapPin, label: t('info.city'),     value: t('info.cityValue'),  href: undefined },
    { icon: Clock,  label: t('info.schedule'), value: t('info.scheduleValue'), href: undefined },
  ];

  const SUBJECTS = t('form.subjects', { returnObjects: true }) as string[];

  const FAQS = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
  ];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: SUBJECTS[0] ?? '',
    message: '',
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = encodeURIComponent(
      `Nume: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`,
    );
    const subject = encodeURIComponent(`[Go2Fix] ${formData.subject}`);
    window.location.href = `mailto:contact@go2fix.ro?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <SEOHead
        title={t('meta.title')}
        description={t('meta.description')}
        canonicalUrl={ROUTE_MAP.contact[lang]}
        lang={lang}
        alternateUrl={{ ro: ROUTE_MAP.contact.ro, en: ROUTE_MAP.contact.en }}
      />

      <div className="bg-white">

        {/* ── Hero ─────────────────────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white pt-16 pb-14 sm:pt-24 sm:pb-20 px-4 text-center"
        >
          {/* Dot grid overlay */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          {/* Blobs */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-50/60 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            className="relative max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
              Contact
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 leading-tight">
              {t('hero.title')}
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed">
              {t('hero.subtitle')}
            </p>
          </motion.div>
        </section>

        {/* ── Contact grid ─────────────────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">

            {/* Left: info cards */}
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="text-2xl font-black text-gray-900 mb-7"
              >
                {t('info.title')}
              </motion.h2>

              <div className="space-y-4">
                {CONTACT_INFO.map(({ icon: Icon, label, value, href }, idx) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.15 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div
                      className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${ICON_GRADIENTS[idx]} flex items-center justify-center`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
                        {label}
                      </p>
                      {href ? (
                        <a
                          href={href}
                          className="text-gray-900 font-semibold text-sm hover:text-blue-600 transition"
                        >
                          {value}
                        </a>
                      ) : (
                        <p className="text-gray-900 font-semibold text-sm">{value}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: contact form */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
            >
              <h2 className="text-2xl font-black text-gray-900 mb-7">{t('form.title')}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('form.name')}
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                    placeholder={t('form.placeholder_name')}
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('form.email')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                    placeholder={t('form.placeholder_email')}
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('form.subject')}
                  </label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData((f) => ({ ...f, subject: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('form.message')}
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))}
                    placeholder={t('form.placeholder_message')}
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition"
                >
                  {t('form.submit')}
                </button>
              </form>
            </motion.div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
        <section className="bg-gray-50 py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
                FAQ
              </span>
              <h2 className="text-3xl font-black text-gray-900">{t('faq.title')}</h2>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-4"
            >
              {FAQS.map(({ question, answer }, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeUpItem}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer focus:outline-none"
                  >
                    <span className="font-semibold text-gray-900 pr-4">{question}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-250 ${openFaq === idx ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {openFaq === idx && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-5 text-gray-600 text-sm leading-relaxed">
                          {answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

      </div>
    </>
  );
}
