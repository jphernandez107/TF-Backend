'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Reading extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Reading.belongsTo(models.Sensor, {
        foreignKey: "sensor_id"

      })
      Reading.belongsTo(models.Location, {
        foreignKey: "location_id"
      })
    }
  };
  Reading.init({
    sensor_id: DataTypes.STRING,
    value: DataTypes.FLOAT,
    location_id: DataTypes.NUMBER,
    created_date: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Reading',
  });
  return Reading;
};