-- Migration: 000061_fix_service_category_icons
-- Replace component-name placeholders with proper emoji icons in service_categories.

UPDATE service_categories SET icon = '🧹' WHERE slug = 'curatenie';
