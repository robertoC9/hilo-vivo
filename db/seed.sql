INSERT INTO products (sku, slug, name, description, category, origin, material, price_clp, image_url, stock)
VALUES
  ('HV-ARP-001', 'cordillera-en-fibra', 'Cordillera en fibra', 'Pieza de la colección de arpilleras de Alhué, elaborada a mano por artesanos de la comuna.', 'arpilleras', 'Alhué, Chile', 'Textil artesanal', 34900, '/dynamic-assets/arpillera-1-zoom.jpg', 3),
  ('HV-TEX-001', 'textil-de-alhue', 'Textil de Alhué', 'Pieza textil creada a mano con color y formas que reflejan el trabajo de la comuna.', 'textiles', 'Alhué, Chile', 'Lana artesanal', 28500, '/dynamic-assets/product-textil.svg', 5),
  ('HV-CER-001', 'vasija-del-alba', 'Vasija del alba', 'Vasija de líneas orgánicas realizada en barro esmaltado.', 'ceramica', 'Pomaire, Chile', 'Barro esmaltado', 19800, '/dynamic-assets/product-ceramica.svg', 4),
  ('HV-CES-001', 'trama-del-sur', 'Trama del sur', 'Canasto de trama abierta construido con fibras vegetales.', 'cesteria', 'Artesanía chilena', 'Fibra vegetal', 24900, '/dynamic-assets/product-cesteria.svg', 6),
  ('HV-MAD-001', 'cumbre-de-ulmo', 'Cumbre de ulmo', 'Portavelas tallado a mano en madera de ulmo.', 'madera', 'Aysén, Chile', 'Madera nativa', 16500, '/dynamic-assets/product-madera.svg', 4),
  ('HV-PIE-001', 'luz-de-costa', 'Luz de costa', 'Pieza esculpida en piedra volcánica inspirada en el desierto de Atacama.', 'piedra', 'Toconao, Chile', 'Piedra volcánica', 42000, '/dynamic-assets/product-piedra.svg', 2)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  origin = EXCLUDED.origin,
  material = EXCLUDED.material,
  price_clp = EXCLUDED.price_clp,
  image_url = EXCLUDED.image_url,
  stock = products.stock,
  is_active = TRUE,
  updated_at = now();
