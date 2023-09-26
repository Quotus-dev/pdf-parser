import { MONGO_URI, PORT, app } from ".";

import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  "postgres://postgres:admin@postgres:5432/mjunctionDB"
);

(async () => {
  try {
    await sequelize.sync({ force: true });
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log("🚀 Server is running on port:", PORT);
    });
  } catch (error) {
    console.error("error synching database", error);
  }
})();

// sequelize
//   .authenticate()
//   .then(() => {
//     console.log("Connection has been established successfully.");
//   })
//   .catch((err: Error) => console.log("🔴 Error:", err.message));

export { sequelize };
