import { Router } from "express";
import { upload } from "../controllers/upload.controller";
import { upload as uploader } from "./../libs";

const router = Router();

router.route("/").post(uploader.single("file"), upload as any);

export default router;
