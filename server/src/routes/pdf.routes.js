import { Router } from "express";
import { deleteAllData, extractDataAndUploadToDB, getPDFData, getSinglePdfData, updatePdfData } from "../controllers/pdf.controller.js";

const router = Router();

router.route("/").get(getPDFData).post(extractDataAndUploadToDB).delete(deleteAllData)
// router.route("/test").get(getTest)
router.route("/:id").get(getSinglePdfData).patch(updatePdfData)

export default router