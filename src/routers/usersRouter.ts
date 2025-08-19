import { Router } from "express";
import usersController from "../controllers/usersController";
import { authenticateJWT, authorizeRoles } from "../middlewares/authMiddleware";

const usersRouter: any = Router();

//////////    ADMIN LOGIN ROUTE   /////////////

usersRouter.post(
  "/loginAdminAuth",
   usersController.loginAdminAuth
  );

/////////      ADD ADMIN ROUTE     /////////
usersRouter.post(
  "/add-admin",
  authenticateJWT,
  authorizeRoles(['super_admin']),
  usersController.addAdmin
);
////////   GET ADMIN USERNAMES     ////////

usersRouter.get(
  "/getAdminsUsername",
  authenticateJWT,
  authorizeRoles(['super_admin']),
  usersController.getAdminsUsername,
)
/////////    DELETE ADMIN ROUTE    ///////
usersRouter.delete(
  "/deleteAdmin",
  authenticateJWT,
  authorizeRoles(['super_admin']),
  usersController.deleteAdmin,
)

// EDIIT SUPER ADMIN ROUTE //
usersRouter.put(
  "/edit-super-admin",
  authenticateJWT,
  authorizeRoles(['super_admin']),
  usersController.editSuperAdmin,
);


export default usersRouter;
