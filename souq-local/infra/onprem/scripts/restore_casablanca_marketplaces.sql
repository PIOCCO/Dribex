-- Idempotent restore of built-in Casablanca marketplaces (migrations 019 + 035).
-- Safe to run multiple times.

BEGIN;

INSERT INTO marketplaces (
  id, slug, name, description, known_for, address, district, city,
  latitude, longitude, display_order, is_active
) VALUES
  (gen_random_uuid(), 'derb-ghallef', 'Derb Ghallef',
   'Casablanca''s major electronics and mobile phone market — hundreds of shops and galleries.',
   'Electronics, phones, computers, gaming, repairs, cameras and resale.',
   'Derb Ghallef', 'Derb Ghallef', 'Casablanca', 33.5789, -7.6100, 1, true),
  (gen_random_uuid(), 'derb-omar', 'Derb Omar',
   'Major wholesale and hardware commercial district in Casablanca.',
   'Wholesale textiles, clothing, household goods, hardware and packaging.',
   'Derb Omar', 'Derb Omar', 'Casablanca', 33.5920, -7.6180, 2, true),
  (gen_random_uuid(), '9ri3a', 'Al Qurayaa',
   'Souk Al Qurayaa (القريعة) — auto parts, mechanics and car services.',
   'Auto parts, tires, mechanics and vehicle services.',
   'Souk Al Qurayaa', 'القريعة', 'Casablanca', 33.5650, -7.5890, 3, true),
  (gen_random_uuid(), 'habous', 'Habous',
   'Historic Habous quarter — traditional crafts, leather, clothing and Moroccan goods.',
   'Traditional clothing, leather, handicrafts, spices and Moroccan gifts.',
   'Quartier Habous', 'Habous', 'Casablanca', 33.5775, -7.6128, 4, true),
  (gen_random_uuid(), 'medina', 'Medina',
   'Casablanca''s old medina — dense commercial streets near the port and historic center.',
   'Everyday goods, textiles, food, household items and local commerce.',
   'Medina', 'Medina', 'Casablanca', 33.6031, -7.6167, 5, true),
  (gen_random_uuid(), 'bab-marrakech', 'Bab Marrakech',
   'Commercial district around Bab Marrakech — busy shopping streets in central Casablanca.',
   'Mixed retail, clothing, electronics and everyday shopping.',
   'Bab Marrakech', 'Bab Marrakech', 'Casablanca', 33.5958, -7.6169, 6, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  known_for = EXCLUDED.known_for,
  address = EXCLUDED.address,
  district = EXCLUDED.district,
  city = EXCLUDED.city,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  display_order = EXCLUDED.display_order,
  is_active = true,
  updated_at = now();

-- Categories (per marketplace slug)
INSERT INTO marketplace_categories (id, marketplace_id, name, slug, description, icon, display_order, is_active)
SELECT gen_random_uuid(), m.id, v.name, v.slug, v.description, v.icon, v.display_order, true
FROM marketplaces m
CROSS JOIN (VALUES
  ('phones', 'Phones', 'Smartphones and accessories', 'smartphone', 0),
  ('gaming', 'Gaming', 'Consoles and games', 'sports_esports', 1),
  ('computers', 'Computers', 'Laptops and desktops', 'computer', 2),
  ('networking', 'Networking', 'Routers and network gear', 'router', 3),
  ('electronics', 'Electronics', 'General electronics', 'devices', 4),
  ('repairs', 'Repairs', 'Phone and device repair', 'build', 5),
  ('accessories', 'Accessories', 'Phone and device accessories', 'headphones', 7),
  ('cameras', 'Cameras', 'Cameras and photography', 'photo_camera', 8),
  ('tv-audio', 'TV / Audio', 'Televisions and audio equipment', 'tv', 9),
  ('furniture', 'Furniture', 'Furniture and home items', 'chair', 10),
  ('clothing', 'Clothing', 'Clothing and apparel', 'checkroom', 11),
  ('other', 'Other', 'Other relevant categories', 'category', 99)
) AS v(slug, name, description, icon, display_order)
WHERE m.slug = 'derb-ghallef'
ON CONFLICT (marketplace_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order, is_active = true, updated_at = now();

INSERT INTO marketplace_categories (id, marketplace_id, name, slug, description, icon, display_order, is_active)
SELECT gen_random_uuid(), m.id, v.name, v.slug, v.description, v.icon, v.display_order, true
FROM marketplaces m
CROSS JOIN (VALUES
  ('construction', 'Construction', 'Building materials', 'construction', 0),
  ('hardware', 'Hardware', 'Tools and hardware', 'hardware', 1),
  ('plumbing', 'Plumbing', 'Pipes and fittings', 'plumbing', 2),
  ('electrical', 'Electrical', 'Electrical supplies', 'electrical_services', 3),
  ('wholesale', 'Wholesale', 'Wholesale goods', 'inventory_2', 5),
  ('textiles', 'Textiles', 'Fabrics and textiles', 'texture', 6),
  ('clothing', 'Clothing', 'Clothing wholesale', 'checkroom', 7),
  ('household', 'Household goods', 'Household products', 'home', 8),
  ('packaging', 'Packaging', 'Packaging supplies', 'inventory', 9),
  ('cosmetics', 'Cosmetics', 'Cosmetics and beauty', 'spa', 10),
  ('toys', 'Toys', 'Toys and games', 'toys', 11),
  ('electronics', 'Electronics', 'Electronics wholesale', 'devices', 12),
  ('other', 'Other', 'Other relevant categories', 'category', 99)
) AS v(slug, name, description, icon, display_order)
WHERE m.slug = 'derb-omar'
ON CONFLICT (marketplace_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order, is_active = true, updated_at = now();

INSERT INTO marketplace_categories (id, marketplace_id, name, slug, description, icon, display_order, is_active)
SELECT gen_random_uuid(), m.id, v.name, v.slug, v.description, v.icon, v.display_order, true
FROM marketplaces m
CROSS JOIN (VALUES
  ('toyota-parts', 'Toyota Parts', 'Toyota spare parts', 'directions_car', 0),
  ('bmw-parts', 'BMW Parts', 'BMW spare parts', 'directions_car', 1),
  ('mercedes-parts', 'Mercedes Parts', 'Mercedes spare parts', 'directions_car', 2),
  ('tires', 'Tires', 'Tires and wheels', 'tire_repair', 3),
  ('mechanics', 'Mechanics', 'Mechanics and garages', 'car_repair', 4)
) AS v(slug, name, description, icon, display_order)
WHERE m.slug = '9ri3a'
ON CONFLICT (marketplace_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order, is_active = true, updated_at = now();

INSERT INTO marketplace_categories (id, marketplace_id, name, slug, description, icon, display_order, is_active)
SELECT gen_random_uuid(), m.id, v.name, v.slug, v.description, v.icon, v.display_order, true
FROM marketplaces m
CROSS JOIN (VALUES
  ('traditional-clothing', 'Traditional clothing', 'Djellabas, caftans and traditional wear', 'checkroom', 1),
  ('leather', 'Leather', 'Leather goods and bags', 'shopping_bag', 2),
  ('handicrafts', 'Handicrafts', 'Artisan crafts and decor', 'palette', 3),
  ('spices', 'Spices', 'Spices and food products', 'restaurant', 4),
  ('gifts', 'Gifts', 'Souvenirs and gifts', 'card_giftcard', 5),
  ('jewelry', 'Jewelry', 'Jewelry and accessories', 'diamond', 6),
  ('home-decor', 'Home decoration', 'Moroccan home decor', 'home', 7)
) AS v(slug, name, description, icon, display_order)
WHERE m.slug = 'habous'
ON CONFLICT (marketplace_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order, is_active = true, updated_at = now();

INSERT INTO marketplace_categories (id, marketplace_id, name, slug, description, icon, display_order, is_active)
SELECT gen_random_uuid(), m.id, v.name, v.slug, v.description, v.icon, v.display_order, true
FROM marketplaces m
CROSS JOIN (VALUES
  ('textiles', 'Textiles', 'Fabrics and textiles', 'texture', 1),
  ('household', 'Household goods', 'Home and kitchen goods', 'kitchen', 2),
  ('food', 'Food products', 'Local food and pantry items', 'local_grocery_store', 3),
  ('clothing', 'Clothing', 'Everyday clothing', 'checkroom', 4),
  ('hardware', 'Hardware', 'Tools and hardware', 'hardware', 5),
  ('services', 'Services', 'Local services', 'handyman', 6)
) AS v(slug, name, description, icon, display_order)
WHERE m.slug = 'medina'
ON CONFLICT (marketplace_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order, is_active = true, updated_at = now();

INSERT INTO marketplace_categories (id, marketplace_id, name, slug, description, icon, display_order, is_active)
SELECT gen_random_uuid(), m.id, v.name, v.slug, v.description, v.icon, v.display_order, true
FROM marketplaces m
CROSS JOIN (VALUES
  ('clothing', 'Clothing', 'Fashion and apparel', 'checkroom', 1),
  ('electronics', 'Electronics', 'Electronics and accessories', 'devices', 2),
  ('phones', 'Phones', 'Mobile phones', 'smartphone', 3),
  ('shoes', 'Shoes', 'Footwear', 'steps', 4),
  ('accessories', 'Accessories', 'Bags and accessories', 'shopping_bag', 5),
  ('services', 'Services', 'Repairs and services', 'build', 6)
) AS v(slug, name, description, icon, display_order)
WHERE m.slug = 'bab-marrakech'
ON CONFLICT (marketplace_id, slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order, is_active = true, updated_at = now();

COMMIT;

SELECT slug, name, is_active FROM marketplaces
WHERE slug IN ('derb-ghallef','derb-omar','9ri3a','habous','medina','bab-marrakech')
ORDER BY display_order;
