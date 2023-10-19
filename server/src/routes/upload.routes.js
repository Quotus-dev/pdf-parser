import { Router } from "express";
import { handleUpload } from "../controllers/upload.controller.js";
import upload from "../libs/multer.js";

const router = Router();

router.route("/").post(upload.single("file"), handleUpload);

export default router;
