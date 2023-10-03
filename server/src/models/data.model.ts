import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../libs/db";

class Clause extends Model {}

Clause.init(
  {
    data: {
      type: DataTypes.JSONB,
      get() {
        return JSON.parse(this.getDataValue("clauses"));
      },
      set(value) {
        return this.setDataValue("clauses", JSON.stringify(value));
      },
    },
  },
  {
    sequelize,
    modelName: "Clause",
    freezeTableName: true,
    timestamps: true,
  }
);

(async () => {
  await Clause.sync({ force: true });
})();

(async () => {
  try {
    const newClause = await Clause.create({
      data: {
        test: "test",
        "1": "test2",
      },
    });
    console.log("New Clause created:", newClause.toJSON());
  } catch (error) {
    console.error("Error creating a new Clause:", error);
  }
})();

export default Clause;
