import { Request, Response } from "express";
import jwt from 'jsonwebtoken'
import dbQueriesProducts from "../db/queries/productQueries";
import validation from "../utils/validation";
import { cloudinary } from "../config/cloudinaryConfig";



////////////////////////////////        ADD PRODUCT CONTROLLER       ////////////////////////////

async function addProduct(
  req: Request,
  res: Response,
):Promise<Response>{
  try {

    const {name, description, status, category_id} = req.body;
    const isValidName = validation.isNonEmptyString(name);
    if(!isValidName){
      console.error('Controller: se paso un name vacio.');
      return res.status(400).json({error: "Name no debe ser una cadena vacia."});
    };

    const nameExists = await dbQueriesProducts.productExists(name);

    if (nameExists){
      console.warn(`Controller: Ya existe un producto con el nombre ${name}`);
      return res.status(409).json({error: 'Ya existe un producto con ese nombre.'})
    }

    const treatedDescription = validation.isNonEmptyString(description) ? description : 'Sin descripcion';

    if(!(status === 'active' || status === 'draft')){
      console.error('Controller: se paso un status incorrecto.')
      return res.status(400).json({error: 'Status debe ser active o draft al momento de la creacion.'})
    };

    const isValidCategory_id = await dbQueriesProducts.idsFromCategories(category_id);
    if (!isValidCategory_id){
      console.error('Controller: Se paso un category_id incorrecto');
      return res.status(400).json({error: 'Se envio una categoria invalida.'});
    }

    const productParent = await dbQueriesProducts.addProduct(
      name, treatedDescription, status, category_id
    );

    if (productParent) { // La función dbQueriesProducts.addProduct ya devuelve un objeto si es exitosa
      console.log(`Controller: Producto padre con (ID: ${productParent.id}) agregado con éxito.`);
      return res.status(201).json({
        message: 'Producto padre agregado con éxito. Ahora puedes añadir sus variantes.',
        product_id: productParent.id
      });
    } else {
      // Este bloque es poco probable que se alcance si dbQueriesProducts.addProduct lanza un error
      console.error('Controller: Error inesperado al agregar el producto padre. La función de DB no devolvió el producto.');
      return res.status(500).json({ error: 'Error inesperado al agregar el producto padre.' });
    }

  }catch (error: unknown) {
    console.error('Controller: Error al agregar el producto padre:', error);
    // Manejo de errores más específico basado en los errores lanzados por dbQueriesProducts
    if (error instanceof Error) {
      if (error.message.includes('Ya existe un producto con el nombre')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes('La categoría con ID')) {
        return res.status(400).json({ error: error.message });
      }
      // Para otros errores de base de datos no específicos
      return res.status(500).json({ error: `Error en el servidor al agregar el producto padre: ${error.message}` });
    }
    return res.status(500).json({ error: 'Error desconocido en el servidor al agregar el producto padre.' });
  }
}

///////////////////////////   ADD PRODUCT VARIANT CONTROLLER  /////////////////////////


async function addProductVariant(
  req: Request,
  res: Response,
):Promise<Response>{

  try{

    const {product_id, sku_code, price, stock, is_default} = req.body;

    const isProductId = await dbQueriesProducts.productIdExist(product_id);
    if(!isProductId){
      console.error(`Controller: El product_id ${product_id} proporcionado no existe.`);
      return res.status(400).json({ error: `El product_id que se paso es incorrecto.`});
    };

    const isValidskuCode = validation.isNonEmptyString(sku_code);
    if(!isValidskuCode){
      console.error('Controller: Se pasó un sku_code vacío o incorrecto.');
      return res.status(400).json({error: 'El sku_code enviado es incorrecto.'});
    }

    const isValidPrice = validation.isValidNumber(price);
    if(!isValidPrice){
      console.error('Controller: Se pasó un precio inválido o negativo.');
      return res.status(400).json({ error: 'El precio que se envió es incorrecto o negativo.' });
    }

    const isValidStock = validation.isValidNumber(stock);
    if(!isValidStock){
      console.error('Controller: Se pasó un stock inválido o negativo.');
      return res.status(400).json({ error: 'El stock que se envió es incorrecto o negativo.' });
    }

    if(typeof is_default !== "boolean"){
      console.error('Controller: Se pasó un valor incorrecto para is_default.');
      return res.status(400).json({ error: 'El is_default enviado es incorrecto.' });
    }

    const productVariant = await dbQueriesProducts.addProductVariant(
      product_id,
      sku_code,
      price,
      stock,
      is_default,
    );

    if (productVariant){
      console.log('Controller: se agrego la variante con exito.');
      return res.status(201).json({
        message: 'Variante de producto agregada con éxito.',
        variant_id: productVariant.id,
      });
    }else{
      console.error('Controller: Error inesperado al agregar la variante. La función de DB no devolvió la variante.');
      return res.status(500).json({ error: 'Error inesperado al agregar la variante de producto.' });
    }

  } catch(error: unknown){
    console.error('Controller: Error al agregar la variante de producto:', error);

    if (error instanceof Error) {
      if (error.message.includes('El producto padre con ID')) {
        return res.status(400).json({ error: error.message }); // 400 Bad Request si el product_id no existe
      }
      if (error.message.includes('El código SKU')) {
        return res.status(409).json({ error: error.message }); // 409 Conflict si el SKU ya existe
      }
      if (error.message.includes('Datos de variante inválidos')) {
        return res.status(400).json({ error: error.message }); // 400 Bad Request por precio/stock negativo
      }
      // Para otros errores de base de datos no específicos
      return res.status(500).json({ error: `Error en el servidor al agregar la variante de producto: ${error.message}` });
    }
    return res.status(500).json({ error: 'Error desconocido en el servidor al agregar la variante de producto.' });
  };
}

///////////////////////////   ADD VARIANT ATTRIBUTE CONTROLLER     ///////////////////////////////


async function addVariantAttribute(
  req: Request,
  res: Response,
):Promise<Response>{

  try{

    const {variant_id, attribute_name, attribute_value, display_value, display_type, is_filterable, sort_order} = req.body;

    const isValidVariantId = dbQueriesProducts.variantIdExists(variant_id);
    if(!isValidVariantId){
      console.error('Controller: se paso un variant_id que no existe.');
      return res.status(400).json({error: 'Se envio un dato incorrecto'});
    }

    const isValidAttributeName = validation.isNonEmptyString(attribute_name);
    if (!isValidAttributeName){
      console.error('Controller: se paso un attribute name vacio');
      return res.status(400).json({error: 'La entrada attribute no debe estar vacia.'});
    };

    const isValidAttributeValue = validation.isNonEmptyString(attribute_value);
    if (!isValidAttributeValue){
      console.error('Controller: se paso un attribute value vacio');
      return res.status(400).json({error: 'No se envio el valor del attributo.'});
    };

    const isValidDisplayValue = validation.isNonEmptyString(display_value);
    if (!isValidDisplayValue){
      console.error('Controller: se paso un display value vacio.');
      return res.status(400).json({error: 'Se envion un dato incorrecto'});
    };


    const validDisplayTypes = ['color_swatch', 'select', 'image_swatch', 'text_swatch'];
    if (!validDisplayTypes.includes(display_type)){
      console.error('Controller: Se paso un display type incorrecto.');
      return res.status(400).json({error: 'Se envio un dato incorrecto.'})
    }

    if (typeof is_filterable !== 'boolean'){
      console.error('Controller: tipo is_filterable incorrecto.');
      return res.status(400).json({error: 'La entrada is_filterable debe ser de tipo booleana'});
    };

    if(typeof(sort_order) !== 'number' || sort_order < 0){
      console.error('Controller: se paso un sort order incorrecto.')
      return res.status(400).json({error: 'Se envio un dato incorrecto'});
    }

    const variantAttribute = await dbQueriesProducts.addVariantAttribute(
      variant_id,
      attribute_name,
      attribute_value,
      display_value,
      display_type,
      is_filterable,
      sort_order,
    );

    if(variantAttribute){
      console.log('Controller: se agrego los atributos de la variante con exito.');
      return res.status(201).json({
        message: 'Atributos de la variante agregados con exito.',
      })
    }else {
      console.error('Controller: Error inesperado al agregar el tipo de atributo de variante. La función de DB no devolvió el atributo.');
      return res.status(500).json({ error: 'Error inesperado al agregar el tipo de atributo de variante.' });
    }

  }catch (error: unknown) {
    console.error('Controller: Error al agregar el tipo de atributo de variante:', error);
    // Manejo de errores más específico basado en los errores lanzados por dbQueriesProducts
    if (error instanceof Error) {
      if (error.message.includes('Ya existe un tipo de atributo con el nombre')) {
        return res.status(409).json({ error: error.message }); // 409 Conflict si el nombre ya existe
      }
      // Para otros errores de base de datos no específicos
      return res.status(500).json({ error: `Error en el servidor al agregar el tipo de atributo de variante: ${error.message}` });
    }
    return res.status(500).json({ error: 'Error desconocido en el servidor al agregar el tipo de atributo de variante.' });
  }
}



///////////////////////////         ADD VARIANT IMAGES CONTROLLER          //////////////////////

interface MulterError extends Error{
  code?: string;
  field?: string;
}

interface ImageMetadata{
  variant_id: number;
  is_primary: boolean;
}


async function addProductImages(
  req: Request,
  res: Response
): Promise<Response> {
  try{
    const files = req.files as Express.Multer.File[];
    const metadataStrings = req.body.metadata as string[];

    if (!files || files.length === 0){
      console.warn('Controller: No se proporciono archivos de imagen para subir.');
      return res.status(400).json({error: 'No se proporciono imagenes'});
    }
    if (!metadataStrings || metadataStrings.length !== files.length){
      console.error('Controller: Desajuste entre el numero de archivos y metadatos.');
      return res.status(400).json({error: 'Desajuste entr archivos y metadatos.'});
    }

    console.log(`controller: Recibidos ${files.length} archivos y metadatos para procesamiento.`);

    const uploadAndDbPromises = files.map(async (file, index) => {
      let parsedMetadata: ImageMetadata;
      try{
        parsedMetadata = JSON.parse(metadataStrings[index]);
        if (typeof parsedMetadata.variant_id != 'number' || typeof parsedMetadata.is_primary !== 'boolean'){
          throw new Error(`Invalid metadata structure for image at index ${index}.`);
        }
      }catch (parseError) {
        console.error(`Controller: Error al parsear metadatos para el archivo ${index}:`, parseError);
        throw new Error(`Invalid metadata for image ${index}. Please check the data format.`);
      }
      const variantId = parsedMetadata.variant_id;

      if (variantId <= 0){
        throw new Error (`Invalid product ID "${variantId}" in metadata for image at index ${index}. Must be a positive number.`);
      }
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataUri = `data:${file.mimetype};base64,${b64}`;

      console.log(`Controller: Subiendo imagen ${index + 1} a Cloudinary...`);
      const cloudinaryResponse = await cloudinary.uploader.upload(dataUri, {
        folder: 'mini_feria_products',
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      });
      console.log(`Controller: Imagen ${index + 1} subida a Cloudinary. URL: ${cloudinaryResponse.secure_url}`);

      console.log(`Controller: Asociado Imagen ${index + 1} a product ID ${variantId} en DB...`);
      const success  = await dbQueriesProducts.addProductImage(

        cloudinaryResponse.secure_url,
        parsedMetadata.is_primary,
        cloudinaryResponse.public_id,
        variantId,

      );

      if (!success){
        throw new Error(`Failed to add image URL to database for product ID ${variantId}.`);
      }
      return true;
    });

    const results = await Promise.all(uploadAndDbPromises);
    const allSuccesful = results.every(result => result === true);

    if (!allSuccesful){
      throw new Error("One or more image associations failed in the database.");
    }
    console.log(`Controller: ${files.length} imagenes procesadas y asociadas al producto con exito.`);
    return res.status(201).json({ message: `${files.length} imagenes uploaded and associated succesfully.`})
  } catch (error: unknown) {
    console.error('Controller: Error general en addProdcutImages:', error);

    if (error instanceof Error) {
      const multerError = error as MulterError;
      if (multerError.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({error : `One or more image files are too large. Maximum 5MB allowed per file.`});
      }
      if (multerError.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: multerError.message });
      }
      return res.status(500).json({ error: `An internal server error occurred during image processing: ${error.message}` });
    }
    return res.status(500).json({ error: 'An unexpected internal server error occurred.' });
  }
}


async function getProductPreview(
  req: Request,
  res: Response,
):Promise<Response>{
  try{
    const products = await dbQueriesProducts.getProductPreview();
    if (!products || products.length === 0){
      return res.status(200).json({message: 'No hay productos que mostrar'});
    }else{
      console.log('Controller: se encontraron los productos con exito.')
      return res.status(200).json({products: products});
    }
  }catch(error){
    console.error('Controller: Hubo un error al obtener los productos.', error);
    return res.status(500).json({error: 'Hubo un error en el servidor al obtener los productos.'});
  }
}


async function getProductDetails(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    // 1. Validar que el ID existe y es numérico
    const { id } = req.params;
    const idNumber = parseInt(id)
    if (!idNumber) {
      console.error('Controller: No se envio el id.')
      return res.status(400).json({ error: 'Se requiere el ID del producto' });
    }

    if (typeof idNumber !== 'number') {
      console.error('Controller: El id debe ser un numero.')
      return res.status(400).json({ error: 'El ID debe ser un número válido' });
    }

    // 2. Obtener detalles del producto
    const productDetails = await dbQueriesProducts.getProductDetails(idNumber);

    // 3. Verificar que se encontró el producto
    if (!productDetails) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // 4. Formatear respuesta exitosa
    return res.status(200).json({
      success: true,
      data: productDetails,
    });

  } catch (error) {
    console.error('Controller: Error al obtener detalles del producto:', error);

    // Manejo específico para errores conocidos
    if (error instanceof Error && error.message === 'Producto no encontrado') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    // Error genérico del servidor
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener los detalles del producto'
    });
  }
}

async function deleteProduct(
  req: Request,
  res: Response
){
  try{

    const {id} = req.params;
    const newId = Number(id)

    const result = await dbQueriesProducts.deleteProduct(newId)
    if (result){
      return res.status(200).json({message: `Se elimo el producto con el id ${newId} con exito.`});
    }
  }catch(error){
    return res.status(500).json({error: 'Hubo un error en el servidor'});
  }

}


export default {
  addProduct,
  addProductVariant,
  addVariantAttribute,

  addProductImages,
  getProductPreview,
  getProductDetails,
  deleteProduct,
}
