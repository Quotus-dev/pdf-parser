const { Router } = require("express");
const { getPdfData } = require("../controllers/pdf.controller");

const router = Router();

router.route("/").post(getPdfData);

module.exports = router
