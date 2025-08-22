
import pool from "../db/pool";

const createTables = async () => {
  try {
    await pool.query(`
      -- Función para actualizar updated_at (se usa en múltiples tablas)
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Tabla users
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          email VARCHAR(150) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role VARCHAR(20) DEFAULT 'viewer',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla categories (autorreferencial)
      CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          parent_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
          CHECK (parent_id IS NULL OR parent_id <> id)
      );

      -- Tabla products
      CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(150) NOT NULL UNIQUE,
          description TEXT,
          status VARCHAR(20) DEFAULT 'active',
          category_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      );

      -- Tabla product_variants
      CREATE TABLE IF NOT EXISTS product_variants (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL,
          sku_code VARCHAR(100) NOT NULL UNIQUE,
          price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
          stock INTEGER NOT NULL CHECK (stock >= 0),
          is_default BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

      -- Índices para product_variants
      CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS idx_default_variants ON product_variants(product_id) WHERE is_default = true;

      -- Trigger para product_variants
      DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
      CREATE TRIGGER update_product_variants_updated_at
      BEFORE UPDATE ON product_variants
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      -- Tabla variant_images
      CREATE TABLE IF NOT EXISTS variant_images (
          id SERIAL PRIMARY KEY,
          url TEXT NOT NULL,
          is_primary BOOLEAN DEFAULT false,
          public_id VARCHAR(255) NOT NULL UNIQUE,
          variant_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
      );

      -- Índice para variant_images
      CREATE INDEX IF NOT EXISTS idx_variant_images_variant_id ON variant_images(variant_id);

      -- Trigger para variant_images
      DROP TRIGGER IF EXISTS update_variant_images_updated_at ON variant_images;
      CREATE TRIGGER update_variant_images_updated_at
      BEFORE UPDATE ON variant_images
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      -- Tabla variant_attributes
      CREATE TABLE IF NOT EXISTS variant_attributes (
          id SERIAL PRIMARY KEY,
          variant_id INTEGER NOT NULL,
          attribute_name VARCHAR(100) NOT NULL,
          attribute_value VARCHAR(255) NOT NULL,
          display_value VARCHAR(255),
          display_type VARCHAR(50) NOT NULL CHECK (
            display_type IN ('color_swatch', 'select', 'image_swatch', 'text_swatch')
          ),
          is_filterable BOOLEAN NOT NULL DEFAULT false,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
      );

      -- Índices para variant_attributes
      CREATE INDEX IF NOT EXISTS idx_variant_attrs_name_value ON variant_attributes(attribute_name, attribute_value);
      CREATE INDEX IF NOT EXISTS idx_variant_attrs_variant ON variant_attributes(variant_id);

      -- Trigger para variant_attributes
      DROP TRIGGER IF EXISTS update_variant_attributes_updated_at ON variant_attributes;
      CREATE TRIGGER update_variant_attributes_updated_at
      BEFORE UPDATE ON variant_attributes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      -- Tabla sales
      CREATE TABLE IF NOT EXISTS sales (
          id SERIAL PRIMARY KEY,
          product_id INTEGER,
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          price_at_sale NUMERIC(10,2) NOT NULL CHECK (price_at_sale >= 0),
          sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      );

      -- Tabla views
      CREATE TABLE IF NOT EXISTS views (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL,
          view_count INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

    `);
    console.log("Tablas creadas con éxito");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error; // Importante para que Render detecte el error
  } finally {
    await pool.end();
  }
};
createTables().catch(error => {
  console.error("Error in createTables:", error);
  process.exit(1);
});
