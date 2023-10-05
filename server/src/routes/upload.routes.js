const { Router } = require("express")
const { handleUpload } = require("../controllers/upload.controller");
const upload = require("../libs/multer");

const router = Router();

router.route("/").post(upload.single("file"), handleUpload);

module.exports = router;
