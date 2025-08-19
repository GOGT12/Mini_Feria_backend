import { Request, Response } from "express";
import jwt from 'jsonwebtoken'
import dbQueriesCategories from "../db/queries/categoriesQueries";
import validation from "../utils/validation";
import { error } from "console";



//////////////////          ADD CATEGORY          ////////////////

async function addCategory(
    req: Request,
    res: Response,
):Promise<Response> {

  const {parent_id, name, description} = req.body;


  if(!validation.isNonEmptyString(name)){
    console.log("El nombre de la categoria no debe ser una cadena vacia.")
    return res.status(400).json({ error: `El nombre del la categoria "${name}" no debe ser un texto vacio.`})
  }

  const lowerName = name.toLowerCase();
  const validatedDescription = validation.isNonEmptyString(description) ? description : null;

  let validatedParentId: number | null | undefined = undefined;

  if(parent_id!== undefined && parent_id!== null && typeof parent_id === 'number'){
    validatedParentId = parent_id;
  } else if (parent_id !== undefined && parent_id !== null){
    console.log("Controller: Validacion fallida parent_id no es un numero valido.");
    return res.status(400).json({error: `Error: "${parent_id }" partent ID debe ser un numero o null`})
  }

  try {

    const isNameDuplicated = await dbQueriesCategories.categoryExistsByName(lowerName);

    if (isNameDuplicated) {
      console.warn(`Controlador: la categoria ${lowerName} ya existe en la base de datos.`)
      return res.status(409).json({ error: `La categoria ${lowerName} ya existe.`})
    }
    const isAdded =  await dbQueriesCategories.addCategory(
      lowerName,
      validatedDescription,
      validatedParentId,
    );

    if (isAdded){
      console.log(`Controller: Categoria "${lowerName}" creada con exito`);
      return res.status(201).json({ message: `La categoria ${lowerName} se creo con exito.`});
    } else {
      console.error(`Controller: la funcion query devolvio false`)
      return res.status(500).json({error: `Fallo inesperado al agregar la categoria ${lowerName}`})

    }
  }catch(error: unknown){
    console.error(`Controller: Error general al agregar categoria`, error)
    return res.status(500).json({ error: `Hubo un error en el servidor al crear la categoria ${lowerName}`});
  }
}

///////////////////////      DELETE CATEGORY           /////////////////////

async function deleteCategory(
  req: Request,
  res: Response,
):Promise<Response>{

  const {id} = req.body;

  if (typeof id !== 'number'){
    console.warn(`${id} no es un numero.`)
    return res.status(400).json({error: 'Se proporciono mal los datos'});
  }

  try{

    const isDeleted = await dbQueriesCategories.deleteCategory(id);
    if(isDeleted){
      console.log(`Controller: Se elimino la categoria con id: ${id} con exito.`);
      return res.status(200).json({message: 'Se elimino la categoria con exito'});
    }else{
      return res.status(404).json({message: 'La categoria a eliminar no existe.'});
    }
  }catch(error: unknown){
    console.error(`Controller: Hubo un error al eliminar la categoria con id: ${id}`, error)

    if (error instanceof Error){
      return res.status(500).json({ error: `Ocurrio un error interno en el servidor al enviar las categorias: ${error.message}`});
    }

    return res.status(500).json({error: `Hubo un error desconocido en el servidor al intentar elimindar la categoria`});
  }

}

///////////////////////      GET CATEGORIES DATA CONTROLLER       ///////////////

async function getCategories(
  req: Request,
  res: Response
):Promise<Response>{

  try{

    const categoriesFromDb = await dbQueriesCategories.getCategories();

    if (categoriesFromDb.length > 0){
      console.log(`Controller: Se enviaron ${categoriesFromDb.length} categorias con exito.`);
      return res.status(200).json({ categories: categoriesFromDb });
    }else{
      console.log('Controller: No se encontraron categorias');
      return res.status(200).json({ message: 'No se encontraron categorias', categories: []});
    }

  }catch(error: unknown){
    console.error('Controller: Hubo un error al enviar las categorias.', error);

    if (error instanceof Error){
      return res.status(500).json({ error: `Ocurrio un error interno en el servidor al enviar las categorias: ${error.message}`});
    }
    return res.status(500).json({ error: 'Hubo un error inesperado en el servidor al enviar las categorias.'});
  }
}


///////////////////////      GET CATEGORIES ID/NAME CONTROLLER       ///////////////

async function getCategoriesIdName(
  req: Request,
  res: Response
):Promise<Response>{

  try{

    const categoriesFromDb = await dbQueriesCategories.getCategories();

    if (categoriesFromDb.length > 0){
      console.log(`Controller: Se enviaron ${categoriesFromDb.length} categorias con exito.`);
      return res.status(200).json({ categories: categoriesFromDb });
    }else{
      console.log('Controller: No se encontraron categorias');
      return res.status(200).json({ message: 'No se encontraron categorias', categories: []});
    }

  }catch(error: unknown){
    console.error('Controller: Hubo un error al enviar las categorias.', error);

    if (error instanceof Error){
      return res.status(500).json({ error: `Ocurrio un error interno en el servidor al enviar las categorias: ${error.message}`});
    }
    return res.status(500).json({ error: 'Hubo un error inesperado en el servidor al enviar las categorias.'});
  }
}



export default {
  addCategory,
  deleteCategory,
  getCategories,
  getCategoriesIdName,
}
