const { Router } = require("express");
const { extractDataAndUploadToDB, getPDFData, getSinglePdfData } = require("../controllers/pdf.controller");

const router = Router();

router.route("/").get(getPDFData).post(extractDataAndUploadToDB);
router.route("/:id").get(getSinglePdfData)

module.exports = router
