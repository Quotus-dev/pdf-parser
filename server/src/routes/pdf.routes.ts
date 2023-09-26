import { Router } from "express";
import { getPdfData } from "../controllers/pdf.controller";

const router = Router();

router.route("/").get(getPdfData as any);

export default router;
