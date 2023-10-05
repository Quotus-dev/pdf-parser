const { MONGO_URI, PORT, app } = require(".");

const { sequelize } = require("./libs/db");

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log("🚀 Server is running on port:", PORT);
    });
  } catch (error) {
    console.error("Error: ", error.message);
  }
})();
