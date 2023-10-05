const multer = require("multer");

const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      // Define the filename for the uploaded file
      cb(null, Date.now() + "-" + file.originalname);
    },
  }),
  limits: {
    fileSize: 10000000,
  },
});

module.exports = upload
