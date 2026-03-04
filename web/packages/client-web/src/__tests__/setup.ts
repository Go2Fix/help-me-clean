import '@testing-library/jest-dom/vitest';
import i18n from 'i18next';

// Mock IntersectionObserver (used by framer-motion's whileInView / useInView)
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // Fire immediately with isIntersecting: true so animations complete synchronously
    this.callback(
      [{ isIntersecting: true, target, intersectionRatio: 1, boundingClientRect: target.getBoundingClientRect(), intersectionRect: target.getBoundingClientRect(), rootBounds: null, time: 0 }],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});
import { initReactI18next } from 'react-i18next';

// Import all RO translation namespaces so tests get real Romanian strings
import roCommon from '../../public/locales/ro/common.json';
import roHome from '../../public/locales/ro/home.json';
import roWaitlist from '../../public/locales/ro/waitlist.json';
import roAbout from '../../public/locales/ro/about.json';
import roContact from '../../public/locales/ro/contact.json';
import roCompanies from '../../public/locales/ro/companies.json';
import roBlog from '../../public/locales/ro/blog.json';
import roLegal from '../../public/locales/ro/legal.json';
import roAuth from '../../public/locales/ro/auth.json';
// Dashboard namespaces
import roDashboard from '../../public/locales/ro/dashboard.json';
import roClient from '../../public/locales/ro/client.json';
import roCompany from '../../public/locales/ro/company.json';
import roWorker from '../../public/locales/ro/worker.json';
import roAdmin from '../../public/locales/ro/admin.json';

// Initialise i18next synchronously so all tests get real Romanian translations
// without needing to mock useTranslation in every test file.
i18n.use(initReactI18next).init({
  lng: 'ro',
  fallbackLng: 'ro',
  initImmediate: false,
  resources: {
    ro: {
      common: roCommon,
      home: roHome,
      waitlist: roWaitlist,
      about: roAbout,
      contact: roContact,
      companies: roCompanies,
      blog: roBlog,
      legal: roLegal,
      auth: roAuth,
      dashboard: roDashboard,
      client: roClient,
      company: roCompany,
      worker: roWorker,
      admin: roAdmin,
    },
  },
  interpolation: { escapeValue: false },
});
