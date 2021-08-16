const Pool = require('pg').Pool
const types = require('pg').types

const postgresNumericIdentifier = 1700
const postgresTimestamptzIdentifier = 1184
types.setTypeParser(postgresNumericIdentifier, function(val) {
    return parseFloat(val)
})
types.setTypeParser(postgresTimestamptzIdentifier, function(val) {
    var date = new Date(Date.parse(val)).toLocaleString("es-AR")
    return date
})

const pool = new Pool({
  user: 'pi',
  host: '192.168.0.77',
  database: 'invernaderos',
  password: 'raspberry',
  port: 5432
})

const getAmbientTemperature = async (req, res) => {
    const filterParams = getSQLFilters(req)
    const table = "temperatura_ambiente"
    const sqlQuery = "SELECT value, created_date, location FROM " + table + " " + filterParams + " ORDER BY id DESC"
    //console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        res.status(200).json(results.rows)
    })
    .catch(error => {
        console.log(error)
    })
}

const getAmbientHumidity = async (req, res) => {
    const filterParams = getSQLFilters(req)
    const table = "humedad_ambiente"
    const sqlQuery = "SELECT value, created_date, location FROM " + table + " " + filterParams + " ORDER BY id DESC"
    //console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        res.status(200).json(results.rows)
    })
    .catch(error => {
        console.log(error)
    })
}

const getSoilHumidity = async (req, res) => {
    const filterParams = getSQLFilters(req)
    const table = "humedad_suelo"
    const sqlQuery = "SELECT value, created_date, location FROM " + table + " " + filterParams + " ORDER BY id DESC"
    console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        res.status(200).json(results.rows)
    })
    .catch(error => {
        console.log(error)
    })
}

const getLux = async (req, res) => {
    const filterParams = getSQLFilters(req)
    const table = "luz"
    const sqlQuery = "SELECT value, created_date, location FROM " + table + " " + filterParams + " ORDER BY id DESC"
    //console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        res.status(200).json(results.rows)
    })
    .catch(error => {
        console.log(error)
    })
}


/**
 * Body format
 * {
 *      "locationIds": [1, 2, 3],
 *      "fromDate": "14/08/2021 00:00:00",
 *      "toDate": "15/08/2021 23:59:59"
 *      "fromValue": 7.4,
 *      "toValue": 15.3 
 * }
 */

function getSQLFilters(req) {
    var where = []

    if (req.body.locationIds != undefined && req.body.locationIds.length > 0) { where.push(getLocationFilter(req.body.locationIds))}
    if (req.body.fromDate != undefined && req.body.fromDate != "") { where.push(" created_date >= '" + req.body.fromDate + "'")}
    if (req.body.toDate != undefined && req.body.toDate != "") { where.push(" created_date <= '" + req.body.toDate + "'")}
    if (req.body.fromValue != undefined) { where.push(" value >= " + req.body.fromValue)}
    if (req.body.toValue != undefined) { where.push(" value <= " + req.body.toValue)}

    var query = ""
    if (where.length > 0) {
        query = " WHERE " + where.join(" AND ")
    }

    return query
}

function getLocationFilter(locationIdArray) {
    var locations = []
    for (let locationId of locationIdArray) {
        locations.push("location = " + locationId)
    }
    var locationSQL = ""
    if(locations.length > 0) {
        locationSQL = " (" + locations.join(" OR ") + ") "
    }
    return locationSQL
}

module.exports = {
    getAmbientTemperature,
    getAmbientHumidity,
    getSoilHumidity,
    getLux
}