ALTER TABLE products DROP CONSTRAINT products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check CHECK (category = ANY (ARRAY['apparel','tools','accessories','digital','gear']));

INSERT INTO products (name, description, category, price_bb, price_usd_cents, image_url, is_active)
VALUES
  ('Barber-Hub Cape', 'Official Barber-Hub competition cape', 'gear', 200, 3999, 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&h=300&fit=crop', true),
  ('Barber-Hub Snapback', 'Official Barber-Hub snapback hat', 'gear', 150, 2999, 'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=300&h=300&fit=crop', true),
  ('Precision Razor', 'Professional precision straight razor', 'gear', 250, 4999, 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=300&h=300&fit=crop', true)
ON CONFLICT DO NOTHING;