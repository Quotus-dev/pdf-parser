import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../libs/db.js";

class Table extends Model { }

Table.init(
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
        modelName: "Table",
        freezeTableName: true,
        timestamps: true,
    }
);

// (async () => {
//   await Clause.sync();
// })();

// module.exports = Table;
export default Table