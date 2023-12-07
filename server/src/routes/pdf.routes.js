import { Router } from "express";
import { extractDataAndUploadToDB, extractDataAndUploadToDBApi, getPDFData, getSinglePdfData, updatePdfData } from "../controllers/pdf.controller.js";

const router = Router();

router.route("/").get(getPDFData).post(extractDataAndUploadToDBApi)
// router.route("/test").get(getTest)
router.route("/:id").get(getSinglePdfData).patch(updatePdfData)

// router.route("/test").get(getTest)
// router.route("/:id").get(getSinglePdfData)

export default router