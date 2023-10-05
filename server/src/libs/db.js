const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  "postgres://postgres:admin@postgres:5432/mjunction"
);

// sequelize.sync({ force: true });

module.exports.sequelize = sequelize
