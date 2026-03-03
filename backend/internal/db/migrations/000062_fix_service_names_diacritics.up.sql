-- Migration: 000062_fix_service_names_diacritics
-- Fix missing diacritics in service_definitions.name_ro (stored without ă/â/î/ș/ț).

UPDATE service_definitions SET name_ro = 'Curățenie Standard'   WHERE name_ro = 'Curatenie Standard';
UPDATE service_definitions SET name_ro = 'Curățenie Generală'   WHERE name_ro = 'Curatenie Generala';
UPDATE service_definitions SET name_ro = 'Curățenie Mutare'     WHERE name_ro = 'Curatenie Mutare';
UPDATE service_definitions SET name_ro = 'După Constructor'     WHERE name_ro = 'Dupa Constructor';
UPDATE service_definitions SET name_ro = 'Curățenie Birou'      WHERE name_ro = 'Curatenie Birou';
UPDATE service_definitions SET name_ro = 'Spălat Geamuri'       WHERE name_ro = 'Spalat Geamuri';
