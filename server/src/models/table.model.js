import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../libs/db.js";
import Clause from "./data.model.js";

class Table extends Model { }

Table.init(
    {
        documentId: {
            type: DataTypes.UUID,
            references: {
                model: 'clauses',
                key: 'id'
            }
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

Table.hasOne(Clause)

// (async () => {
//   await Clause.sync();
// })();

// module.exports = Table;
export default Table