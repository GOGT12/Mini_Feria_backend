import { Router } from "express";
import { authenticateJWT, authorizeRoles } from "../middlewares/authMiddleware";
import productsController from "../controllers/productsController";
import { uploadMultipleImages } from "../middlewares/uploadMiddleware";


const productsRouter: any = Router();


productsRouter.post(
  "/add-product",
  authenticateJWT,
  authorizeRoles(['super_admin', 'admin']),
  productsController.addProduct,
)

productsRouter.post(
  "/add-product-variant",
  authenticateJWT,
  authorizeRoles(['super_admin', 'admin']),
  productsController.addProductVariant,
)

productsRouter.post(
  "/add-attribute",
  authenticateJWT,
  authorizeRoles(['super_admin', 'admin']),
  productsController.addVariantAttribute,
)


productsRouter.post(
  "/add-product-images",
  authenticateJWT,
  authorizeRoles(['super_admin', 'admin']),
  uploadMultipleImages,
  productsController.addProductImages
)

productsRouter.get(
  "/get-products",
  productsController.getProductPreview
)

productsRouter.get(
  "/get-products/:id",
  productsController.getProductDetails
)

productsRouter.put(
  "/delete-product/:id",
  authenticateJWT,
  authorizeRoles(['super_admin', 'admin']),
  productsController.deleteProduct
)


export default productsRouter;
