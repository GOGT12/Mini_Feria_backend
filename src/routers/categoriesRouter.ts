import { Router } from "express";
import categoriesController from "../controllers/categoriesController";
import { authenticateJWT, authorizeRoles } from "../middlewares/authMiddleware";

const categoriesRouter: any = Router();


categoriesRouter.get(
  "/get-categories",
  authenticateJWT,
  authorizeRoles(['super_admin']),
  categoriesController.getCategories,
)

categoriesRouter.get(
  "/get-categories-idname",
  authenticateJWT,
  authorizeRoles(['super_admin', 'admin']),
  categoriesController.getCategoriesIdName,
)

categoriesRouter.post(
  "/add-category",
  authenticateJWT,
  authorizeRoles(['super_admin']),
  categoriesController.addCategory,
);

categoriesRouter.delete(
  "/delete-category",
  authenticateJWT,
  authorizeRoles(['super_admin']),
  categoriesController.deleteCategory,
)




export default categoriesRouter;
