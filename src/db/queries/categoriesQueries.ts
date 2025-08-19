import pool from "../pool";


interface PgError extends Error {
  code: string;
  detail?: string;
}


////////////////        ADD CATEGORY QUERY        ///////////////

async function addCategory(
  name: string,
  description?: string | null | undefined | '',
  parent_id?: number | null | undefined,
):Promise<boolean>{

  try {
    const query = `
    INSERT INTO categories (name, description, parent_id)
    VALUES ($1, $2, $3)
    `;

    const parentIdValue = parent_id === undefined ? null : parent_id;

    const descriptionValue = description === undefined || description === '' || description === null ? 'Sin descripcion' : description;

    const values = [name,descriptionValue, parentIdValue];


    const result = await pool.query(query,values);

    if (result.rowCount && result.rowCount > 0){
      console.log(`Query: Categoria "${name} agregada con exito."`)
      return true
    } else{
      console.error(`Query: No se pudo agregar la categoria "${name}"`)
      throw new Error(`Database Error: Could not add category "${name}". No rows affected.`);
    }
  } catch(error: unknown){

    console.error(`DataBase: hubo un error al agregar la categoria`, error)
    throw new Error(`Database Error: Could not add category "${name}". ${error instanceof Error ? error.message : 'Unknown database error.'}`);
  }
}

/////////////////       DELETE CATEGORY      //////////////

async function deleteCategory(
  id: number):Promise<boolean>{

    try {
      const query = `
        DELETE FROM categories
        WHERE id = $1;
      `;
      const values = [id];
      const result = await pool.query(query, values);
      if (result.rowCount && result.rowCount > 0){
        console.log(`Query: Categoria con id ${id} eliminada con exito`);
        return true;
      }else{
        console.log(`Query: no se encontro una categoria con el id: ${id} para su eliminacion.`)
        return false
      }
    } catch(error: unknown){
        console.log(`DataBase: Error al eliminar la categoria con id: ${id}`, error)
        throw new Error(`DataBase Error: hubo un error al eliminar la categoria con id. ${id} ${error instanceof Error ? error.message : 'Unknown database error.'}`);
    }

}


//////////////      CATEGORY EXITS QUERY      ////////////


async function categoryExistsByName(
  name: string
):Promise<boolean> {
  try {
    const query = `
      SELECT 1
      FROM categories
      WHERE name = $1;
    `;
    const values = [name];
    const result = await pool.query(query, values);
    return result.rows.length > 0; // Si hay filas, significa que ya existe
  } catch (error) {
    console.error("DataBase: Error checking if user exists:", error);
    throw error;
  }
}

//////////////////////           GET CATEGORIES DATA QUERY         /////////////////////

interface Category{
  id: number,
  name: string,
  description: string,
  parent_id: number | null,
  created_at: Date,
  updated_at: Date,
}

async function getCategories():Promise<Category[]>{

  try {
    const query = `
    SELECT id, name, description,
    parent_id, created_at, updated_at
    FROM categories;
  `;
    const result = await pool.query(query);
    return result.rows

  }catch(error: unknown){
    console.error('Database: Hubo un error al obtener el data de las categories', error);

    throw new Error(`Database Error: No se pudo obtener el data de las categorias.${error instanceof Error ? error.message: 'Unknow database error.'}`);
  }
}


//////////////////////          GET CATEGORIES ID / NAME QUERY         /////////////////////

interface Category{
  id: number,
  name: string,
}

async function getCategoriesIdName():Promise<Category[]>{

  try {
    const query = `
    SELECT id, name
    FROM categories;
  `;
    const result = await pool.query(query);
    return result.rows

  }catch(error: unknown){
    console.error('Database: Hubo un error al obtener el id/name de las categories', error);

    throw new Error(`Database Error: No se pudo obtener el id/name de las categorias.${error instanceof Error ? error.message: 'Unknow database error.'}`);
  }
}

const dbQueriesCategories ={
  addCategory,
  deleteCategory,
  categoryExistsByName,
  getCategories,
  getCategoriesIdName,
}

export default dbQueriesCategories;
