-- Add form_fields JSONB to service_categories
-- Defines which fields the booking form renders for this category.
ALTER TABLE service_categories ADD COLUMN form_fields JSONB DEFAULT '[]'::jsonb;

-- Add custom_fields JSONB to bookings
-- Stores dynamic field values for non-cleaning categories.
ALTER TABLE bookings ADD COLUMN custom_fields JSONB;

-- Seed curatenie with its existing form field definitions
UPDATE service_categories SET form_fields = '[
  {"key":"propertyType","type":"select","labelRo":"Tip proprietate","labelEn":"Property type","required":true,"options":[
    {"value":"Apartament","labelRo":"Apartament","labelEn":"Apartment","icon":"Building2"},
    {"value":"Casa","labelRo":"Casă","labelEn":"House","icon":"Home","badge":"x1.3"},
    {"value":"Birou","labelRo":"Birou","labelEn":"Office","icon":"Briefcase"}
  ],"showWhen":{"pricingModel":"HOURLY"}},
  {"key":"numRooms","type":"stepper","labelRo":"Număr camere","labelEn":"Number of rooms","required":true,"min":1,"max":10,"defaultValue":2,"showWhen":{"pricingModel":"HOURLY"}},
  {"key":"numBathrooms","type":"stepper","labelRo":"Număr băi","labelEn":"Number of bathrooms","required":true,"min":1,"max":5,"defaultValue":1,"showWhen":{"pricingModel":"HOURLY"}},
  {"key":"areaSqm","type":"number","labelRo":"Suprafață (mp)","labelEn":"Area (sqm)","required":true,"min":1,"placeholder":"mp"},
  {"key":"hasPets","type":"toggle","labelRo":"Am animale de companie","labelEn":"I have pets","required":false,"surchargeLabel":"+15 lei","icon":"PawPrint","showWhen":{"pricingModel":"HOURLY"}}
]'::jsonb WHERE slug = 'curatenie';
