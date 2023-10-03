import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  "postgres://postgres:admin@postgres:5432/mjunction"
);
