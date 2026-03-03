import { Navigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTE_MAP } from '@/i18n/routes';

export default function GdprPage() {
  const { lang } = useLanguage();
  return <Navigate to={ROUTE_MAP.privacy[lang]} replace />;
}
