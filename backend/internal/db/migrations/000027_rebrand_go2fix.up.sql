-- Rebrand HelpMeClean -> Go2Fix

-- Update platform settings
UPDATE platform_settings SET value = 'support@go2fix.ro' WHERE key = 'support_email';
UPDATE platform_settings SET value = 'https://go2fix.ro/termeni' WHERE key = 'terms_url';
UPDATE platform_settings SET value = 'https://go2fix.ro/confidentialitate' WHERE key = 'privacy_url';

-- Update platform legal entity
UPDATE platform_legal_entity SET company_name = 'Go2Fix SRL' WHERE singleton_guard = true;

-- Update any placeholder emails from migration 000024
UPDATE users SET email = REPLACE(email, '@pending.helpmeclean.ro', '@pending.go2fix.ro')
WHERE email LIKE '%@pending.helpmeclean.ro';
