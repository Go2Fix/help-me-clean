-- Revert: restore original (no-diacritics) service names.

UPDATE service_definitions SET name_ro = 'Curatenie Standard'  WHERE name_ro = 'Curățenie Standard';
UPDATE service_definitions SET name_ro = 'Curatenie Generala'  WHERE name_ro = 'Curățenie Generală';
UPDATE service_definitions SET name_ro = 'Curatenie Mutare'    WHERE name_ro = 'Curățenie Mutare';
UPDATE service_definitions SET name_ro = 'Dupa Constructor'    WHERE name_ro = 'După Constructor';
UPDATE service_definitions SET name_ro = 'Curatenie Birou'     WHERE name_ro = 'Curățenie Birou';
UPDATE service_definitions SET name_ro = 'Spalat Geamuri'      WHERE name_ro = 'Spălat Geamuri';
