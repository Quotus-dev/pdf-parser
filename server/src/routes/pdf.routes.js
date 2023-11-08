import { Router } from "express";
import { extractDataAndUploadToDB, getPDFData, getSinglePdfData } from "../controllers/pdf.controller.js";

const router = Router();

router.route("/").get(getPDFData).post(extractDataAndUploadToDB);
// router.route("/test").get(getTest)
// router.route("/:id").get(getSinglePdfData)

export default router