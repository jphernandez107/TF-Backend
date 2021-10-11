'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Readings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sensor: {
        type: Sequelize.STRING
      },
      value: {
        type: Sequelize.FLOAT
      },
      location: {
        type: Sequelize.NUMBER
      },
      created_date: {
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Readings');
  }
};