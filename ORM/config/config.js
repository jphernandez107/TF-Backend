require('dotenv').config();
// const { DB_HOST, DB_USERNAME, DB_PASSWORD } = process.env;

const DB_HOST = '190.18.169.205'
const DB_USERNAME = 'pi'
const DB_PASSWORD = 'raspberry'

module.exports = {
  development: {
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: "invernaderos",
    host: DB_HOST,
    dialect: "postgres",
    define: {
      timestamps: false,
      underscored: true
    }
  },
  test: {
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: "invernaderos",
    host: DB_HOST,
    dialect: "postgres",
    define: {
      timestamps: false,
      underscored: true
    }
  },
  production: {
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: "invernaderos",
    host: DB_HOST,
    dialect: "postgres",
    define: {
      timestamps: false,
      underscored: true
    }
  }
}
