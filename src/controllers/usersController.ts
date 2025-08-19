import { Request, Response } from "express";
import { hashPassword, comparePasswords  } from "../utils/hash";
import dbQueriesUsers from "../db/queries/userQueries";
import jwt from 'jsonwebtoken'
import validation from "../utils/validation";



const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET){
  console.error('FATAL ERROR: JWT_SECRET is not defined in enviroment variables.');
  process.exit(1)
}

//////////////////////       LOGIN ADMIN AUTH         /////////////////////

async function loginAdminAuth(
  req: Request, res: Response
): Promise<Response> {

  const {usernameOrEmail, password} = req.body;

  console.log('--- Intentando login de admin ---');
  console.log('Datos recibidos (req.body):', req.body);
  console.log('Username/Email:', usernameOrEmail);
  console.log('Password (sin encriptar):', password);

  if (!usernameOrEmail || !password) {
    return res.status(400).json({error: "Username/Email and password are required"});
  }

  try {

    const userData = await dbQueriesUsers.getUserData(usernameOrEmail);

    if (!userData) {
      console.log('Usuario no encontrado o password_hash es null');
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const { id, password_hash, username, email,role} = userData
    const isPasswordMatch = await comparePasswords(password, password_hash)

    console.log('¿La contraseña coincide?:', isPasswordMatch);

    if (isPasswordMatch) {
      const payload = {
        id: id,
        username: username,
        email: email,
        role: role
      };

      const token = jwt.sign(payload, JWT_SECRET!, {expiresIn: '3h'});

      console.log('Login exitoso!');

      return res.status(200).json({
        message: "Correcto",
        token: token,
        /*
        user: {
          id:id,
          username: username,
          email: email,
          role: role
        }
        */
      });
    } else {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ error: "Invalid credentials." });
    }
  } catch (error) {
    console.error("Error during admin login", error);
    console.error("Error en loginAdminAuth:", error);
    return res.status(500).json({ error: "An internal server error occured during login." });

  }
}


//////////////////      ADD ADMIN         ////////////////////////////

async function addAdmin(
  req: Request,
  res: Response
):Promise<Response>{

  const { username, email, password, role } = req.body;

  if(!username || !email || !password || !role){
    console.log("Faltan datos para crear admin.")
    return res.status(400).json({ error: "username/email/password/role son requeridos."});
  }

  // validate username
  if(!validation.isNonEmptyString(username)){
    return res.status(400).json({ error: `Username invalido: "${username}" no debe ser texto vacio`})
  }
  //validate email
  if(!validation.isValidEmail(email)){
    return res.status(400).json({ error: `Email invalido: "${email}"`})
  }
  if(!validation.isValidPassword(password)){
    return res.status(400).json({ error: `El password debe tener minimo 8 characteres , una mayuscula, un numero y un simbolo especial.` })
  }

  const allowedRoles = ['admin'];

  if (!allowedRoles.includes(role)){
    console.log(`intento de crear admin con rol invalido: ${role}`);
    return res.status(400).json({ error: `Rol invalido. roles permitidos: ${allowedRoles.join(',')}.`});
  }

  try{
    const userExists = await dbQueriesUsers.userExistsByUsernameOrEmail(username,email);

    if ( userExists ){
      console.log(`Intento de crear admin con username o email duplicado: ${username}/${email}`);
      return res.status(409).json({ error: "Un usuario con ese nombre de usuario o email ya existe."});
    }

    const hashedPassword = await hashPassword(password);

    await dbQueriesUsers.addAdmin(username,email,hashedPassword,role);
    console.log("Admin creado con exito");
    return res.status(200).json({ mesage: "Adim creado con exito."})
  } catch (error){
    console.error("Error al agnadir un Admin", error)
    return res.status(500).json({ error: "Ocurrio un error en el servidor al agnadir un Admin"})
  }

}

///////////////////       GET ADMINS DATA  /////////////////

async function getAdminsUsername(req:Request, res:Response):Promise<Response> {
  try{

    const adminUsernames = await dbQueriesUsers.getAdminsUsername();

    if (!adminUsernames){
      console.log("Controlador: No se encontraron usuarios con rol de admin")
      return res.status(200).json({ message: "No admin users found", usernames: []});
    }
    console.log("Conrolador: Nombres de usuario de admins enviados con exito");
    return res.status(200).json({usernames: adminUsernames});


  } catch (error){
    console.error("Error al enviar los username de los admins", error)
    return res.status(500).json({ error: 'Ocurrio un error en el servidor al enviar los usernames de los admins'})
  }
}

////////////////////      DELETE ADMIN      //////////////////

async function deleteAdmin(
  req: Request,
  res: Response,
):Promise<Response>{

  const { id } = req.body;
  console.log(id)

  if(!id){
    console.log("Controlador: No se envio el id del admin para eliminar.");
    return res.status(400).json({error: "No se envio el id del admin"});
  }

  try {
    const isDeleted = await dbQueriesUsers.deleteAdmin(id);
    if (isDeleted){
      console.log(`Contolador: admin eliminado con exito.`)
      return res.status(200).json({ message: `admin eliminado con exito.`});
    } else {
      // 4. Si no se eliminó (isDeleted es false), significa que el usuario no fue encontrado
      console.warn(`Controlador: Admin "admin no encontrado para eliminar.`);
      return res.status(404).json({ error: `admin with id ${id} not found.` }); // 404 Not Found
    }

  }catch(error){
    console.error(`Controlador: hubo un error inesperado al eliminar admin`,error)
    return res.status(500).json({ error: `Ocurrio un error en el servidor al eliminar admin.`})
  }
}


///////////      EDIT SUPER ADMIN      ////////////

async function editSuperAdmin( req: Request, res: Response): Promise<Response> {


  const idFromToken = req.user?.id;

  if(!idFromToken){
    console.error('Controlador: Falta el ID del token. Esta ruta debe estar protegida.');
    return res.status(401).json({ error: 'Sin autorizacion: falta la atenticacion del usuario.'})

  }
  const id = parseInt(idFromToken,10);
  if (isNaN(id)){
    console.error('Controlador: ID del usuario no es un numero valido.');
    return res.status(400).json({ error: "Formato invalido del ID obtenido del token."});
  }

  const {username,email,password} = req.body;

  // validate username
  if(!validation.isNonEmptyString(username)){
    console.log('Controller: Validación fallida - Username es requerido o vacío.');
    return res.status(400).json({ error: `Username invalido: "${username}" no debe ser un texto vacio.`})
  };
  //validate email
  if(!validation.isValidEmail(email)){
    console.log('Controller: Validación fallida - Email inválido.');
    return res.status(400).json({ error: `Email invalido: "${email}"`});
  };

  let hashedPassword: string | undefined;

  if (password !== undefined && password !== null && password !== ''){
    if(!validation.isValidPassword(password)){
      console.log('Controller: Validación fallida - Contraseña no cumple requisitos.');
      return res.status(400).json({ error: `El password debe tener minimo 8 characteres , una mayuscula, un numero y un simbolo especial.` });
    }
    hashedPassword = await hashPassword(password)
  } else{
    console.log('Controlador: No se prporciono una nueva contrasegna, se mantendra la existente.');
  }

  try {

    const userExists = await dbQueriesUsers.userExistsByUsernameOrEmail(username,email);

    if (userExists){
      console.log('Controller: Username/email ya existen.');
      return res.status(409).json({ error: "Un usuario con ese username/email ya esxiste."});
    };

    const isUpdated = await dbQueriesUsers.editSuperAdmin(id,username,email,hashedPassword);

    if (isUpdated){
      console.log(`Controlador: Datos de usuario con Id ${id} actualizados con exito.`);
      return res.status(200).json({ message: `Se actualizo los datos con exito.`})
    }else {
      console.warn(`Controller: Usuario con ID ${id} no encontrado para actualizar o no hubo cambios.`);
      return res.status(404).json({ error: `User with ID ${id} not found or no changes were made.` });
    }
  } catch(error: unknown) {

    console.error(`Controlador: Error general al actualizar usuario con ID ${id}:`,error);

    if (error instanceof Error) {
        // Por ejemplo, si dbQueriesUsers lanzó new Error("Database Error: A user with this username or email already exists.")
        if (error.message.includes("A user with this username or email already exists.")) {
            console.warn('Controller: Error de mensaje de unicidad propagado desde la query.');
            return res.status(409).json({ error: error.message });
        }
        // Para cualquier otro error de la query que es una instancia de Error
        return res.status(500).json({ error: `An internal server error occurred: ${error.message}` });
    }

    // Si el error no es una instancia de Error (algo completamente inesperado)
    return res.status(500).json({ error: "An unexpected internal server error occured." });
  }
}




export default{
  editSuperAdmin,
  addAdmin,
  loginAdminAuth,
  getAdminsUsername,
  deleteAdmin,
};
