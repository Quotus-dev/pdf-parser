import { DataTypes, Model, Sequelize } from "sequelize";

const sequelize = new Sequelize(
  process.env.DB_NAME!,
  "admin",
  process.env.DB_PASSWORD,
  {
    host: "localhost",
    dialect: "postgres",
  }
);

class Clause extends Model {}

Clause.init(
  {
    clause: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
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

export default Clause;
