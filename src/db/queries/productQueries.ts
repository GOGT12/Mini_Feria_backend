
import pool from "../pool"

/////////////////////  IDS FROM CATEGORIES QUERY    ////////////////

async function idsFromCategories(
  id: number
): Promise<boolean>{
  try{
    const query = `
    SELECT 1
    FROM categories
    WHERE id = $1;
    `;
    const values = [id];
    const result = await pool.query(query,values);
    return result.rows.length > 0;
  } catch(error){
    console.error("DataBase: Hubo un error al obtener los ids de categories", error);
    throw error;
  }
}

///////////////////////    PRODUCT NAME EXISTS QUERY  ////////////////

async function productExists(
  name: string
): Promise<boolean>{
  try{
    const query = `
      SELECT 1
      FROM products
      WHERE name = $1;
    `;
    const values = [name];
    const result  = await pool.query(query,values);
    return result.rows.length > 0;
  }catch(error){
    console.error("Databse: No se pudo comprobar si el producto ya existe", error);
    throw  error;
  }

}

//////////////////////////       PRODUCT ID EXISTS QUERY        /////////////////////

async function productIdExist(
  id: number
):Promise<boolean>{
  try{
    const query = `
      SELECT EXISTS(
        SELECT 1
        FROM products
        WHERE id = $1
      ) as "exists";
    `;
    const values = [id];
    const result = await pool.query(query,values);
    return result.rows[0].exists;
  }catch(error){
    console.error(`Query : Error al verificar la existencia del producto con ID ${id}:`, error);
    throw error;
  }
}

////////////////////////////    VARIANT ID EXISTS QUERY    ////////////////////////

async function variantIdExists(id: number): Promise<boolean> {

  try {
    const query = `
      SELECT EXISTS(
        SELECT 1
        FROM product_variants
        WHERE id = $1
      ) AS exists;
    `;

    const result = await pool.query(query, [id]);

    if (!result.rows[0]) {
      console.error('Resultado inesperado al verificar variante');
      return false;
    }

    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error al verificar variante ID ${id}:`, error);

    // Para errores de conexión/tiempo de espera
    if (error instanceof Error && 'code' in error && error.code === 'ECONNREFUSED') {
      throw new Error('Error de conexión con la base de datos');
    }

    // Para otros errores de PostgreSQL
    if (error instanceof Error && 'code' in error) {
      console.error(`Código de error PostgreSQL: ${error.code}`);
    }

    throw new Error(`No se pudo verificar la existencia de la variante`);
  }
}


/////////////////////////////        ADD PRODUCT QUERY      /////////////////////////

async function addProduct(
  name: string,
  description: string | null,
  status: string,
  category_id: number,
): Promise<{ id: number }> {
  try {
    const query = `
      INSERT INTO products (
        name, description,
        status, category_id
      ) VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const values = [
      name, description,
      status, category_id,
    ];
    const result = await pool.query(query, values);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`Query: Éxito al agregar el producto padre: ${result.rows[0].name} (ID: ${result.rows[0].id}).`);
      return result.rows[0];
    } else {
      console.error(`Query: Fallo en la inserción del producto padre. 0 filas afectadas inesperadamente.`);
      throw new Error(`Database Error: No se pudo agregar el producto padre.`);
    }
  } catch (error: unknown) {
    console.error('Database: Hubo un error al agregar el producto padre:', error);
    // Mejorar el manejo de errores para dar más contexto al frontend
    const pgError = error as { code?: string; detail?: string; message?: string };
    if (pgError.code === '23505') { // unique_violation (ej. por products_name_unique)
      throw new Error(`Database Error: Ya existe un producto con el nombre "${name}".`);
    }
    if (pgError.code === '23503') { // foreign_key_violation (ej. category_id no existe)
      throw new Error(`Database Error: La categoría con ID ${category_id} no existe.`);
    }
    throw new Error(`Database Error: Error en la base de datos al agregar el producto padre. ${pgError.message || 'Error desconocido.'}`);
  }
}

///////////////////////////        ADD PRODUCT VARIANTS        ////////////////////////

async function addProductVariant(
  product_id: number,
  sku_code: string,
  price: number,
  stock: number,
  is_default: boolean,
): Promise<{ id: number }> {
  try {
    const query = `
      INSERT INTO product_variants (
        product_id, sku_code, price,
        stock, is_default
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const values = [product_id, sku_code, price, stock, is_default];
    const result = await pool.query(query, values);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`Query: Éxito al agregar la variante SKU con (ID: ${result.rows[0].id}) para el producto ID ${product_id}.`);
      return result.rows[0]; // Retorna la ID y el SKU de la variante creada
    } else {
      console.error(`Query: Fallo en la inserción de la variante para producto ID ${product_id}, 0 filas afectadas inesperadamente.`);
      throw new Error(`Database Error: No se pudo agregar la variante para el producto ID ${product_id}.`);
    }
  } catch (error: unknown) {
    console.error(`Database: Hubo un error al agregar la variante para producto ID ${product_id}:`, error);
    const pgError = error as { code?: string; detail?: string; message?: string };

    if (pgError.code === '23505') { // unique_violation (ej. sku_code duplicado)
      throw new Error(`Database Error: El código SKU "${sku_code}" ya existe.`);
    }
    if (pgError.code === '23503') { // foreign_key_violation (ej. product_id no existe)
      throw new Error(`Database Error: El producto padre con ID ${product_id} no existe.`);
    }
    if (pgError.code === '23514') { // check_violation (ej. price o stock negativo)
      throw new Error(`Database Error: Datos de variante inválidos (ej. precio o stock negativo).`);
    }

    throw new Error(`Database Error: Error en la base de datos al agregar la variante. ${pgError.message || 'Error desconocido.'}`);
  }
}

///////////////////    ADD VARIANT ATTRIBUTES QUERY   //////////////////

type DisplayType = 'color_swatch' | 'select' | 'image_swatch' | 'text_swatch';

async function addVariantAttribute(
  variant_id: string,
  attribute_name: string,
  attribute_value: string,
  display_value: string,
  display_type: DisplayType,
  is_filterable: boolean,
  sort_order: number,
): Promise<boolean> {
  try {
    const query = `
      INSERT INTO variant_attributes (
        variant_id, attribute_name, attribute_value,
        display_value, display_type,
        is_filterable, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;
    const values = [variant_id, attribute_name, attribute_value, display_value, display_type, is_filterable, sort_order];
    const result = await pool.query(query, values);

    if (result.rowCount && result.rowCount > 0) {
      return true;
    } else {
      console.error(`Query: Fallo en la inserción del tipo de atributo. 0 filas afectadas inesperadamente.`);
      throw new Error(`Database Error: No se pudo agregar el tipo de atributo.`);
    }
  } catch (error: unknown) {
    console.error('Database: Hubo un error al agregar el tipo de atributo:', error);
    const pgError = error as { code?: string; detail?: string; message?: string };

    if (pgError.code === '23505') { // unique_violation (ej. name duplicado)
      throw new Error(`Database Error: Ya existe un tipo de atributo con el nombre "${attribute_name}".`);
    }

    throw new Error(`Database Error: Error en la base de datos al agregar el tipo de atributo. ${pgError.message || 'Error desconocido.'}`);
  }
}


///////////////////////      ADD PRODUCT IMAGES       ///////////////////


async function addProductImage(
  imageUrl: string,
  isPrimary: boolean,
  publicId: string,
  variantId: number // Cambiado a variantId para reflejar la columna
): Promise<{ id: number, url: string }> { // Cambiado el tipo de retorno
  try {
    const query = `
      INSERT INTO variant_images (
        url, is_primary, public_id, variant_id -- ¡Corregido para usar variant_id!
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, url; -- Retornamos la ID y la URL de la imagen creada
    `;
    const values = [imageUrl, isPrimary, publicId, variantId]; // Los valores corresponden a los placeholders

    const result = await pool.query(query, values);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`Query: Éxito al agregar la imagen ${result.rows[0].url} (ID: ${result.rows[0].id}) para la variante ID ${variantId}.`);
      return result.rows[0]; // Retorna la ID y la URL de la imagen creada
    } else {
      console.error(`Query: Fallo en la inserción de la imagen para la variante ID ${variantId}, 0 filas afectadas inesperadamente.`);
      throw new Error(`Database Error: No se pudo agregar la imagen para la variante ID ${variantId}.`);
    }
  } catch (error: unknown) {
    console.error(`Database: Hubo un error al agregar la imagen para la variante ID ${variantId}:`, error);
    const pgError = error as { code?: string; detail?: string; message?: string };

    if (pgError.code === '23505') { // unique_violation (ej. public_id duplicado)
      throw new Error(`Database Error: Ya existe una imagen con el public_id "${publicId}".`);
    }
    if (pgError.code === '23503') { // foreign_key_violation (ej. variant_id no existe)
      throw new Error(`Database Error: La variante de producto con ID ${variantId} no existe.`);
    }

    throw new Error(`Database Error: Error en la base de datos al agregar la imagen. ${pgError.message || 'Error desconocido.'}`);
  }
}


interface ProductPreview {
  id: number;
  name: string;
  price: number;
  url: string;
  stock: number;
}

async function getProductPreview(
  /* This functions gets the data necesary to show to users */
):Promise<ProductPreview[]>{
  try{
    const query = `
    SELECT
      p.id,
      p.name,
      pv.price,
      vi.url
    FROM
      products p
    JOIN
      product_variants pv ON pv.product_id = p.id
    JOIN
      variant_images vi ON vi.variant_id = pv.id
    WHERE
      p.status = 'active' AND pv.is_default = true AND vi.is_primary = true;
    `;
    const result = await pool.query(query);
    console.log('Query: se enviaron los productos con exito');
    return result.rows as ProductPreview[];
  }catch(error){
    console.error('Database: Hubo un error al enviar los productos. ');
    throw error;
  }
}

interface ProductDetails{
  name: string;
  description: string;
  price: number;
  stock: number;
  urls: string[];
}
async function getProductDetails(
  id: number
):Promise<ProductDetails>{

  try{
    const query = `
      WITH default_variant AS (
        SELECT id, price, stock
        FROM product_variants
        WHERE product_id = $1 AND is_default = true
        LIMIT 1
      )
      SELECT
      p.name,
      p.description,
      pv.price,
      pv.stock,
      (
        SELECT array_agg(vi.url)
        FROM variant_images vi
        WHERE vi.variant_id = pv.id
      ) as image_urls
      FROM
      products p
      JOIN
        default_variant pv ON pv.id = pv.id
      WHERE
      p.id = $1;
    `;
    const values = [id];
    const result = await pool.query(query,values);
    if (result.rows.length === 0){
      throw new Error('Producto no encontrado.')
    }
    return result.rows[0] as ProductDetails;
  }catch(error){
    console.error('Database: Hubo un error al enviar los productos.', error);
    throw error
  }
}


async function deleteProduct(
  id:number
):Promise<boolean> {

  try{

    console.log('caraio')
    const query = `
    UPDATE products
    SET status = 'inactive'
    WHERE id = $1
    `
    const values = [id];
    const result = await pool.query(query,values);
    if (result.rowCount && result.rowCount > 0){
      return true
    }else{
      return false
    }

  }catch(error){
    console.error('Query: Error en el query para actualizar el estado de activo a inactivo', error);
    throw error
  }

}


const dbQueriesProducts = {
  addProduct,
  addProductVariant,
  addVariantAttribute,

  addProductImage,
  getProductPreview,
  getProductDetails,

  idsFromCategories,
  productExists,
  productIdExist,
  variantIdExists,
  deleteProduct,

}

export default dbQueriesProducts;
