const { DataTypes, Model, Sequelize } = require("sequelize");

const { sequelize } = require("../libs/db");

// const sequelize = new Sequelize('mjunction', 'postgres', 'admin', {
//   dialect: 'postgres',
//   host: 'postgres',
//   port: 5432
// });

class Clause extends Model { }

Clause.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      get() {
        return JSON.parse(this.getDataValue("data"));
      },
      set(value) {
        return this.setDataValue("data", JSON.stringify(value));
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

// (async () => {
//   try {
//     const newClause = await Clause.create({
//       data: {
//         test: "test",
//         "1": "test2",
//       },
//     });

//     await newClause.save();
//     console.log("New Clause created:", newClause.toJSON());
//   } catch (error) {
//     console.error("Error creating a new Clause:", error);
//   }
// })();

module.exports = Clause;
