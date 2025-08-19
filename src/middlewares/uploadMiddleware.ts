import multer from 'multer';
import { Request } from 'express';

interface MulterError extends Error {
  code?: string;
  field?: string;
}

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')){
    cb(null, true);
  }else{
    const errorToPass = new Error('Only image files are allowed!') as MulterError;
    errorToPass.code = 'INVALID_FILE_TYPE';
    (cb as (error: Error | null, acceptFile: boolean) => void)(errorToPass, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024
  },
});

const uploadMultipleImages = upload.array('files', 5);
export { uploadMultipleImages };
