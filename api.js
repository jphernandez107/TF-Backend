const Pool = require('pg').Pool
const types = require('pg').types

/**
 * MIGRAR el accesso a la bbdd a ORM con Sequelize
 */


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
  host: '190.18.169.205',
  database: 'invernaderos',
  password: 'raspberry',
  port: 5432
})

const getAmbientTemperature = async (req, res) => {
    const filterParams = getSQLFilters(req)
    const table = "temperatura_ambiente"
    var sqlQuery = "SELECT ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date FROM " // Promedio por minuto
    sqlQuery += table + " " + filterParams + " GROUP BY date ORDER BY date DESC"
    // console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        console.log(results.rows)
        res.status(200).json(results.rows)
    })
    .catch(error => {
        console.log(error)
    })
}

const getAmbientHumidity = async (req, res) => {
    const filterParams = getSQLFilters(req)
    const table = "humedad_ambiente"
    var sqlQuery = "SELECT ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date FROM " // Promedio por minuto
    sqlQuery += table + " " + filterParams + " GROUP BY date ORDER BY date DESC"
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
    var sqlQuery = "SELECT ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date FROM " // Promedio por minuto
    sqlQuery += table + " " + filterParams + " GROUP BY date ORDER BY date DESC"
    // console.log(sqlQuery)

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
    var sqlQuery = "SELECT ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date FROM " // Promedio por minuto
    sqlQuery += table + " " + filterParams + " GROUP BY date ORDER BY date DESC"
    //console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        res.status(200).json(results.rows)
    })
    .catch(error => {
        console.log(error)
    })
}

const getLocationDetails = async (req, res) => {
    const filterParams = getSQLFiltersLocations(req)
    const table = "locations"
    // TODO: Filter disctinct values to get only the sectors/sections/gh unique values
    const sqlQuery = "SELECT * from " + table + " " + filterParams;
    // console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        res.status(200).json(results.rows)
    })
    .catch(error => {
        console.log(error)
    })
}

const getGreenhouses = async (req, res) => {
    const table = "locations"
    const sqlQuery = "SELECT DISTINCT greenhouse from " + table;
    pool.query(sqlQuery)
    .then(results => {
        res.status(200).json(results.rows)
    })
    .catch(error => {
        console.log(error)
    })
}

const getRealTimeData = async (req, res) => {
    const filterParams = getSQLFilters(req)
    let room_temp = "(select 'room_temperature' as sensor, ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date from temperatura_ambiente " + filterParams + " group by date order by date DESC limit 1)"
    let room_hum = "(select 'room_humidity' as sensor, ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date from humedad_ambiente " + filterParams + " group by date order by date DESC limit 1)"
    let soil_hum = "(select 'soil_humidity' as sensor, ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date from humedad_suelo " + filterParams + " group by date order by date DESC limit 1)"
    let lux = "(select 'lux' as sensor, ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date from luz " + filterParams + " group by date order by date DESC limit 1);"

    var sqlQuery = room_temp + " union " + room_hum + " union " + soil_hum + " union " + lux;
    // console.log(sqlQuery)

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

    console.log(req.query)

    if (req.query.locationIds != undefined && req.query.locationIds.length > 0) { where.push(getLocationFilter(req.query.locationIds, "location"))}
    if (req.query.fromDate != undefined && req.query.fromDate != "") { where.push(" created_date >= '" + req.query.fromDate + "'")}
    if (req.query.toDate != undefined && req.query.toDate != "") { where.push(" created_date <= '" + req.query.toDate + "'")}
    if (req.query.fromValue != undefined) { where.push(" value >= " + req.query.fromValue)}
    if (req.query.toValue != undefined) { where.push(" value <= " + req.query.toValue)}

    var query = ""
    if (where.length > 0) {
        query = " WHERE " + where.join(" AND ")
    }

    return query
}

function getLocationFilter(locationIdArray, filterParam = "location") {
    var locations = []
    for (let locationId of locationIdArray) {
        locations.push(filterParam + " = '" + locationId + "'")
    }
    var locationSQL = ""
    if(locations.length > 0) {
        locationSQL = " (" + locations.join(" OR ") + ") "
    }
    return locationSQL
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

 function getSQLFiltersLocations(req) {
    var where = []

    if (req.query.greenhouses != undefined && req.query.greenhouses.length > 0) { where.push(getLocationFilter(req.query.greenhouses, "greenhouse"))}
    if (req.query.sections != undefined && req.query.sections.length > 0) { where.push(getLocationFilter(req.query.sections, "section"))}
    if (req.query.sectors != undefined && req.query.sectors.length > 0) { where.push(getLocationFilter(req.query.sectors, "sector"))}

    var query = ""
    if (where.length > 0) {
        query = " WHERE " + where.join(" AND ")
    }

    return query
}

module.exports = {
    getAmbientTemperature,
    getAmbientHumidity,
    getSoilHumidity,
    getLux,
    getLocationDetails,
    getGreenhouses,
    getRealTimeData
}