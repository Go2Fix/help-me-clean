-- Revert: restore original placeholder icon names.

UPDATE service_categories SET icon = 'Sparkles' WHERE slug = 'curatenie';
