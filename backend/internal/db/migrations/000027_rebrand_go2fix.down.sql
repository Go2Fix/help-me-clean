-- Revert Go2Fix -> HelpMeClean

UPDATE platform_settings SET value = 'support@helpmeclean.ro' WHERE key = 'support_email';
UPDATE platform_settings SET value = 'https://helpmeclean.ro/termeni' WHERE key = 'terms_url';
UPDATE platform_settings SET value = 'https://helpmeclean.ro/confidentialitate' WHERE key = 'privacy_url';

UPDATE platform_legal_entity SET company_name = 'HelpMeClean SRL' WHERE singleton_guard = true;

UPDATE users SET email = REPLACE(email, '@pending.go2fix.ro', '@pending.helpmeclean.ro')
WHERE email LIKE '%@pending.go2fix.ro';
