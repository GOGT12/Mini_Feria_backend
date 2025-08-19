import pool from "../pool";


interface PgError extends Error {
  code: string;
  detail?: string;
}

//////////   GET USERS DATA QUERY    /////////////

async function getUserData(
  usernameOrEmail: string,
){
  const query = `
  SELECT id, username, email, password_hash, role
  FROM users
  WHERE username = $1 OR email = $1;
  `;
  const values =[usernameOrEmail];
  const result = await pool.query(query, values);
  if (result.rows.length > 0){
    return result.rows[0];
  } else {
    return null;
  }
}

//////////////     USER EXITS QUERY    ////////////////

async function userExistsByUsernameOrEmail(username: string, email: string): Promise<boolean> {
  try {
    const query = `
      SELECT 1
      FROM users
      WHERE username = $1 OR email = $2;
    `;
    const values = [username, email];
    const result = await pool.query(query, values);
    return result.rows.length > 0; // Si hay filas, significa que ya existe
  } catch (error) {
    console.error("Error checking if user exists:", error);
    throw error;
  }
}

//////////     ADD ADMIN QUERY       ////////////

async function addAdmin(
  username: string,
  email: string,
  hashedPassword: string,
  role: string,
): Promise<void>{
  const query = `
  INSERT INTO users (username, email, password_hash, role)
  VALUES ($1, $2, $3, $4);
  `;
  const values = [username,email,hashedPassword,role]
  try {
    await pool.query(query,values);
    console.log("Admin added successfully.");
  } catch (error: unknown) {

    const PgError = error as PgError;

    if (PgError.code === '23505'){
      console.error('Duplicate key error during admin creation', PgError.detail);
      throw new Error("A user with this username or email already exists.");
    }
    console.error('Error adding admin', error);
    throw error;
  }
}

////////////    DELETE ADMIN QUERY    //////////////

async function deleteAdmin(
  id: number,
): Promise<boolean>{
  try{
    const query = `
    DELETE FROM users
    WHERE id = $1
    `;
    const values = [id]
    const result  = await pool.query(query, values);

    if(result.rowCount && result.rowCount > 0){
      console.log(`Query: Admin eliminado con exito.`);
      return true;
    }else{
      console.log(`Query: Admin no encontrado.`);
      return false;
    }
  }catch (error){
    console.error('Error al eliminar un admin', error)
    throw new Error(`Error de base de datos: se pudo eliminar al admin.`)
  }
}

///////////////     GET ADMINS DATA QUERY     ///////////////


async function getAdminsUsername() {

  try{
    const query = `
      SELECT id, username, email, role,
      created_at, updated_at
      FROM users WHERE
      role = 'admin'
    `;
    const result = await pool.query(query);

    return result.rows;

  }catch(error){
    console.error('DataBase: error al obtener los usernames de los admins');
    throw new Error(`Error en la base de datos: no se pudo obtener el nombre de los admins.`)
  }
}


///////////////          EDIT SUPER ADMIN DATA QUERY     ////////////


async function editSuperAdmin(
  id: number,
  username: string,
  email: string,
  password_hash?: string,
): Promise<boolean>{

  try {

    let query = `
    UPDATE users
    SET username = $1,
        email = $2,
        updated_at = CURRENT_TIMESTAMP
    `;
    const values: (string | number)[] = [username, email];
    let placeholderCount = 2;

    if (password_hash !== undefined) {
      placeholderCount++;
      query += `, password_hash = $${placeholderCount}`;
      values.push(password_hash);
    }

    placeholderCount++;
    query += `
      WHERE id = $${placeholderCount}
    `;
    values.push(id);

    const result = await pool.query(query,values);

    if (result.rowCount && result.rowCount > 0){
      console.log(`Query: Super_admin con ID ${id} actualizado con exito.`);
      return true;
    } else {
      console.log(`Query: Super_admin con ID ${id} no se encontrado.`)
      return false
    }
  } catch (error: unknown ){
    console.error('DataBase: Error al actualizar super_admin', error);

    const PgError = error as PgError;

    if(PgError.code === '23505'){
      console.warn(`Database: Conflicto de unicidad al actualizar el usuario con ID ${id}. Detalle: ${PgError.detail}`);
      throw new Error(`Database Error: Un usuario con este username o email ya existe.`);
    }
    throw new Error(`DataBase Error: no se pudo actualizar los datos del super_admin con ID ${id}.`);
  }
};




const dbQueriesUsers = {
  getUserData,
  userExistsByUsernameOrEmail,
  addAdmin,
  deleteAdmin,
  getAdminsUsername,
  editSuperAdmin,
}

export default dbQueriesUsers;
