import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extender la interfaz Request para TypeScript
// Esto permite que TypeScript sepa que req.user existirá después del middleware
declare global {
  namespace Express {
    interface Request {
      user?: { // El objeto user que guardaremos en req.user
        id: string;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

// Asegúrate de que JWT_SECRET esté disponible.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables for authMiddleware.');
  process.exit(1);
}

// Middleware de autenticación (verifica si hay un token válido)
const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  // 1. Obtener el encabezado de autorización
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // 2. Extraer el token (ej. "Bearer eyJhbGciOiJIUzI1NiI...")
    const token = authHeader.split(' ')[1]; // Divide "Bearer token" y toma la segunda parte

    // 3. Verificar el token
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        // Token inválido (ej. firma incorrecta, expirado)
        console.error('authenticateJWT: Token inválido o expirado.', err.message);
        return res.status(401).json({ error: 'No autorizado: Token invalido o expirado.' });
      }

      // 4. Guardar los datos del usuario decodificado en el objeto req
      // El 'user' aquí es el payload del JWT (id, username, email, role)
      req.user = user as Request['user']; // Casting a Request['user'] para TypeScript
      console.log('authenticateJWT: Token válido. Usuario:', req.user.username, 'Rol:', req.user.role);
      next(); // Continuar con la siguiente función (middleware o controlador)
    });
  } else {
    // No hay encabezado de autorización (no hay token)
    console.log('authenticateJWT: No se proporcionó token.');
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }
};

// Middleware de autorización (verifica el rol)
const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Primero, verificamos que authenticateJWT ya se haya ejecutado y haya puesto req.user
    if (!req.user) {
      console.error('authorizeRoles: req.user no está disponible. ¿Falta authenticateJWT?');
      return res.status(500).json({ error: 'Internal Server Error: User data not found.' });
    }

    // Normalizamos el rol del usuario para la comparación
    const userRole = req.user.role.toLowerCase();

    // Verificamos si el rol del usuario está en la lista de roles permitidos
    if (allowedRoles.includes(userRole)) {
      console.log(`authorizeRoles: Acceso PERMITIDO para rol "${userRole}".`);
      next(); // El usuario tiene el rol permitido, continuar
    } else {
      console.warn(`authorizeRoles: Acceso DENEGADO. Rol "${userRole}" no está en los roles permitidos: [${allowedRoles.join(', ')}]`);
      return res.status(403).json({ error: 'Forbidden: No tienes los permisos necesarios.' }); // 403 Forbidden
    }
  };

};

export { authenticateJWT, authorizeRoles };
