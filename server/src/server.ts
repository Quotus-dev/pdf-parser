import { MONGO_URI, PORT, app } from ".";

import { sequelize } from "./libs/db";

(async () => {
  try {
    await sequelize.sync({ force: true });
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log("🚀 Server is running on port:", PORT);
    });
  } catch (error) {
    console.error("Error synching database", error);
  }
})();

export { sequelize };
