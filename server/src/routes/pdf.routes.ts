import { Router } from "express";
import { getPdfData } from "../controllers/pdf.controller";

const router = Router();

router.route("/").post(getPdfData as any);

export default router;
