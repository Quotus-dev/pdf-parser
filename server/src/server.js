const { MONGO_URI, PORT, app } = require(".");

const { sequelize } = require("./libs/db");
const Clause = require("./models/data.model");

(async () => {


  try {
    await sequelize.authenticate();
    const tableExists = await sequelize.getQueryInterface().showAllTables()
    if (!tableExists.includes("Clause")) {
      await Clause.sync()
      console.log("🛢️: Database initialized")
    } else {
      console.log('🛢️: Database already initialized')
    }
    await sequelize.sync();
    console.log("💾 Database connected");
    app.listen(PORT, () => {
      console.log("🚀 Server is running on port:", PORT);
    });
  } catch (error) {
    console.error("Error: ⛔ ", error.message);
  }
})();
