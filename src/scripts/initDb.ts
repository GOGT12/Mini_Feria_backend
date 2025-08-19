
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
          id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
          username character varying(100) NOT NULL,
          email character varying(150) NOT NULL,
          password_hash text NOT NULL,
          role character varying(20) DEFAULT 'viewer'::character varying,
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT users_pkey PRIMARY KEY (id),
          CONSTRAINT users_email_key UNIQUE (email),
          CONSTRAINT users_username_key UNIQUE (username)
      );

      -- Tabla categories (autorreferencial)
      CREATE TABLE IF NOT EXISTS categories (
          id integer NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
          name character varying(100) NOT NULL,
          description text,
          parent_id integer,
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT categories_pkey PRIMARY KEY (id),
          CONSTRAINT categories_name_key UNIQUE (name),
          CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id)
              REFERENCES categories(id) ON DELETE CASCADE,
          CONSTRAINT categories_check CHECK (parent_id IS NULL OR parent_id <> id)
      );

      -- Tabla products
      CREATE TABLE IF NOT EXISTS products (
          id integer NOT NULL DEFAULT nextval('products_id_seq'::regclass),
          name character varying(150) NOT NULL,
          description text,
          status character varying(20) DEFAULT 'active'::character varying,
          category_id integer,
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT products_pkey PRIMARY KEY (id),
          CONSTRAINT products_name_unique UNIQUE (name),
          CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id)
              REFERENCES categories(id) ON DELETE SET NULL
      );

      -- Tabla product_variants
      CREATE TABLE IF NOT EXISTS product_variants (
          id integer NOT NULL DEFAULT nextval('product_variants_id_seq'::regclass),
          product_id integer NOT NULL,
          sku_code character varying(100) NOT NULL,
          price numeric(10,2) NOT NULL,
          stock integer NOT NULL,
          is_default boolean DEFAULT false,
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT product_variants_pkey PRIMARY KEY (id),
          CONSTRAINT product_variants_sku_code_key UNIQUE (sku_code),
          CONSTRAINT fk_product_id FOREIGN KEY (product_id)
              REFERENCES products(id) ON DELETE CASCADE,
          CONSTRAINT product_variants_price_check CHECK (price >= 0::numeric),
          CONSTRAINT product_variants_stock_check CHECK (stock >= 0)
      );

      -- Índices para product_variants
      CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
      CREATE INDEX idx_default_variants ON product_variants(product_id) WHERE is_default = true;

      -- Trigger para product_variants
      CREATE TRIGGER update_product_variants_updated_at
      BEFORE UPDATE ON product_variants
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      -- Tabla variant_images
      CREATE TABLE IF NOT EXISTS variant_images (
          id integer NOT NULL DEFAULT nextval('variant_images_id_seq'::regclass),
          url text NOT NULL,
          is_primary boolean DEFAULT false,
          public_id character varying(255) NOT NULL,
          variant_id integer NOT NULL,
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT variant_images_pkey PRIMARY KEY (id),
          CONSTRAINT uq_variant_images_public_id UNIQUE (public_id),
          CONSTRAINT fk_variant_images_variant_id FOREIGN KEY (variant_id)
              REFERENCES product_variants(id) ON DELETE CASCADE
      );

      -- Índice para variant_images
      CREATE INDEX idx_variant_images_variant_id ON variant_images(variant_id);

      -- Trigger para variant_images
      CREATE TRIGGER update_variant_images_updated_at
      BEFORE UPDATE ON variant_images
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      -- Tabla variant_attributes
      CREATE TABLE IF NOT EXISTS variant_attributes (
          id integer NOT NULL DEFAULT nextval('variant_attributes_id_seq'::regclass),
          variant_id integer NOT NULL,
          attribute_name character varying(100) NOT NULL,
          attribute_value character varying(255) NOT NULL,
          display_value character varying(255),
          display_type character varying(50) NOT NULL,
          is_filterable boolean NOT NULL DEFAULT false,
          sort_order integer DEFAULT 0,
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT variant_attributes_pkey PRIMARY KEY (id),
          CONSTRAINT variant_attributes_variant_id_fkey FOREIGN KEY (variant_id)
              REFERENCES product_variants(id) ON DELETE CASCADE,
          CONSTRAINT variant_attributes_display_type_check CHECK (
              display_type::text = ANY (
                  ARRAY[
                      'color_swatch'::character varying,
                      'select'::character varying,
                      'image_swatch'::character varying,
                      'text_swatch'::character varying
                  ]::text[]
              )
          )
      );

      -- Índices para variant_attributes
      CREATE INDEX idx_variant_attrs_name_value ON variant_attributes(attribute_name, attribute_value);
      CREATE INDEX idx_variant_attrs_variant ON variant_attributes(variant_id);

      -- Trigger para variant_attributes
      CREATE TRIGGER update_variant_attributes_updated_at
      BEFORE UPDATE ON variant_attributes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      -- Tabla sales
      CREATE TABLE IF NOT EXISTS sales (
          id integer NOT NULL DEFAULT nextval('sales_id_seq'::regclass),
          product_id integer,
          quantity integer NOT NULL,
          price_at_sale numeric(10,2) NOT NULL,
          sold_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT sales_pkey PRIMARY KEY (id),
          CONSTRAINT sales_product_id_fkey FOREIGN KEY (product_id)
              REFERENCES products(id) ON DELETE RESTRICT,
          CONSTRAINT sales_price_at_sale_check CHECK (price_at_sale >= 0::numeric),
          CONSTRAINT sales_quantity_check CHECK (quantity > 0)
      );

      -- Tabla views (asumiendo que existe según las relaciones mostradas)
      CREATE TABLE IF NOT EXISTS views (
          id integer NOT NULL DEFAULT nextval('views_id_seq'::regclass),
          product_id integer NOT NULL,
          -- (agrega otras columnas según sea necesario)
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT views_pkey PRIMARY KEY (id),
          CONSTRAINT views_product_id_fkey FOREIGN KEY (product_id)
              REFERENCES products(id) ON DELETE CASCADE
      );

    `);
    console.log("Tablas creadas con exito");
    await pool.end();
  } catch (error) {
    console.error("Error creating tables:", error);
  }
};


createTables();
