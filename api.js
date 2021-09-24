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
    let date = new Date(Date.parse(val)).toLocaleString("es-AR")
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
    let sqlQuery = "SELECT ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date FROM " // Promedio por minuto
    sqlQuery += table + " AS sensorTable INNER JOIN locations ON locations.id = sensorTable.location " + filterParams + " GROUP BY date ORDER BY date DESC"
    console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        let json = {
            data: results.rows,
            title: "Temperatura ambiente",
            unit: "°C",
            max: null,
            min: null,
            chartIcon: "fas fa-thermometer-half"
        }
        res.status(200).json(json)
    })
    .catch(error => {
        console.log(error)
    })
}

const getAmbientHumidity = async (req, res) => {
    const filterParams = getSQLFilters(req)
    const table = "humedad_ambiente"
    let sqlQuery = "SELECT ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date FROM " // Promedio por minuto
    sqlQuery += table + " AS sensorTable INNER JOIN locations ON locations.id = sensorTable.location " + filterParams + " GROUP BY date ORDER BY date DESC"
    //console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        let json = {
            data: results.rows,
            title: "Humedad ambiente",
            unit: "%",
            max: 100,
            min: 0,
            chartIcon: "fas fa-humidity"
        }
        res.status(200).json(json)
    })
    .catch(error => {
        console.log(error)
    })
}

const getSoilHumidity = async (req, res) => {
    const filterParams = getSQLFilters(req)
    const table = "humedad_suelo"
    let sqlQuery = "SELECT ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date FROM " // Promedio por minuto
    sqlQuery += table + " AS sensorTable INNER JOIN locations ON locations.id = sensorTable.location " + filterParams + " GROUP BY date ORDER BY date DESC"
    // console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        let json = {
            data: results.rows,
            title: "Humedad de suelo",
            unit: "%",
            max: 100,
            min: 0,
            chartIcon: "fas fa-seedling"
        }
        res.status(200).json(json)
    })
    .catch(error => {
        console.log(error)
    })
}

const getLux = async (req, res) => {
    const filterParams = getSQLFilters(req)
    const table = "luz"
    let sqlQuery = "SELECT ROUND(AVG(value), 2) as value, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) as date FROM " // Promedio por minuto
    sqlQuery += table + " AS sensorTable INNER JOIN locations ON locations.id = sensorTable.location " + filterParams + " GROUP BY date ORDER BY date DESC"
    //console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        let json = {
            data: results.rows,
            title: "Intensidad de luz",
            unit: "lux",
            max: null,
            min: null,
            chartIcon: "fas fa-cloud-sun"
        }
        res.status(200).json(json)
    })
    .catch(error => {
        console.log(error)
    })
}

const getLocationDetails = async (req, res) => {
    const filterParams = getSQLFiltersLocations(req)
    const table = "locations"
    const sqlQuery = "SELECT * from " + table + " " + filterParams;
    // console.log(sqlQuery)

    pool.query(sqlQuery)
    .then(results => {
        let greenhouses = []
        for(let loc of results.rows) { // Armamos el array de objetos anidados
            let gh = greenhouses.find(gh => gh.greenhouse == loc.greenhouse)
            if (gh != undefined) {
                let section = gh.sections.find(sect => sect.section == loc.section)
                if (section != undefined) {
                    let sector = section.sectors.find(sect => sect.sector == loc.sector)
                    if (sector == undefined) {
                        section.sectors.push({sector: loc.sector})
                    } 
                } else {
                    let sectors = []
                    sectors.push({sector: loc.sector})
                    gh.sections.push({section: loc.section, sectors: sectors})
                }
            } else {
                let sectors = []
                sectors.push({sector: loc.sector})
                let sections = []
                sections.push({section: loc.section, sectors:sectors})
                greenhouses.push({
                    greenhouse: loc.greenhouse, 
                    sections:sections, 
                    name: "Invernadero " + loc.greenhouse,
                    href: "/greenhouse-" + loc.greenhouse.toLowerCase(), 
                    id: loc.greenhouse})
            }
        }
        greenhouses.sort(orderGreenhouses)
        res.status(200).json(greenhouses)
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
        // results.rows.sort(orderGreenhouses)
        res.status(200).json(results.rows)
    })
    .catch(error => {
        console.log(error)
    })
}

const getRealTimeData = async (req, res) => {
    const filterParams = getSQLFilters(req)
    let room_temp = "(SELECT 'room_temperature' AS sensor, ROUND(AVG(value), 2) AS VALUE, location, greenhouse, section, sector, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) AS date FROM temperatura_ambiente AS sensorTable INNER JOIN locations ON locations.id = sensorTable.location " + filterParams + " GROUP BY date, location, greenhouse, section, sector ORDER BY date DESC LIMIT 1)"
    let room_hum = "(SELECT 'room_humidity' AS sensor, ROUND(AVG(value), 2) AS VALUE, location, greenhouse, section, sector, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) AS date FROM humedad_ambiente AS sensorTable INNER JOIN locations ON locations.id = sensorTable.location " + filterParams + " GROUP BY date, location, greenhouse, section, sector ORDER BY date DESC LIMIT 1)"
    let soil_hum = "(SELECT 'soil_humidity' AS sensor, ROUND(AVG(value), 2) AS VALUE, location, greenhouse, section, sector, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) AS date FROM humedad_suelo AS sensorTable INNER JOIN locations ON locations.id = sensorTable.location " + filterParams + " GROUP BY date, location, greenhouse, section, sector ORDER BY date DESC LIMIT 1)"
    let lux = "(SELECT 'lux' AS sensor, ROUND(AVG(value), 2) AS VALUE, location, greenhouse, section, sector, to_timestamp(floor((extract('epoch' from created_date) / 60 )) * 60) AS date FROM luz AS sensorTable INNER JOIN locations ON locations.id = sensorTable.location " + filterParams + " GROUP BY date, location, greenhouse, section, sector ORDER BY date DESC LIMIT 1);"

    let sqlQuery = room_temp + " union " + room_hum + " union " + soil_hum + " union " + lux;
    console.log(sqlQuery)

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
    let where = []

    console.log(req.query)

    if (req.query.locationIds != undefined && req.query.locationIds.length > 0) { where.push(getLocationFilter(req.query.locationIds, "location"))}
    if (req.query.greenhouses != undefined && req.query.greenhouses.length > 0) { where.push(getLocationQuery(req, "locations."))}
    if (req.query.fromDate != undefined && req.query.fromDate != "") { where.push(" created_date >= '" + req.query.fromDate + "'")}
    if (req.query.toDate != undefined && req.query.toDate != "") { where.push(" created_date <= '" + req.query.toDate + "'")}
    if (req.query.fromValue != undefined) { where.push(" value >= " + req.query.fromValue)}
    if (req.query.toValue != undefined) { where.push(" value <= " + req.query.toValue)}

    let query = ""
    if (where.length > 0) {
        query = " WHERE " + where.join(" AND ")
    }

    return query
}

function getLocationFilter(locationIdArray, filterParam = "location") {
    let locations = []
    for (let locationId of locationIdArray) {
        locations.push(filterParam + " = '" + locationId + "'")
    }
    let locationSQL = ""
    if(locations.length > 0) {
        locationSQL = " (" + locations.join(" OR ") + ") "
    }
    return locationSQL
}

function getLocationQuery(req, filterParam = "locations.") {
    let greenhouses = []
    let sections = []
    let sectors = []
    if (req.query.greenhouses != undefined)
        for (let greenhouse of req.query.greenhouses) 
            greenhouses.push(filterParam + "greenhouse = '" + greenhouse + "'")
    if (req.query.sections != undefined)
        for (let section of req.query.sections)
            sections.push(filterParam + "section = '" + section + "'")
    if (req.query.sectors != undefined)
        for (let sector of req.query.sectors)
            sectors.push(filterParam + "sector = '" + sector + "'")

    let locations = []
    if (greenhouses.length > 0) locations.push(" (" + greenhouses.join(" OR ") + ") ")
    if (sections.length > 0) locations.push(" (" + sections.join(" OR ") + ") ")
    if (sectors.length > 0) locations.push(" (" + sectors.join(" OR ") + ") ")
    
    let locationSQL = ""
    if (locations.length > 0) locationSQL = " (" + locations.join(" AND ") + ") "

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
    let where = []

    if (req.query.greenhouses != undefined && req.query.greenhouses.length > 0) { where.push(getLocationFilter(req.query.greenhouses, "greenhouse"))}
    if (req.query.sections != undefined && req.query.sections.length > 0) { where.push(getLocationFilter(req.query.sections, "section"))}
    if (req.query.sectors != undefined && req.query.sectors.length > 0) { where.push(getLocationFilter(req.query.sectors, "sector"))}

    let query = ""
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


function orderSectors(sectorA, sectorB) {
    if (sectorA.sector > sectorB.sector) {
        return 1;
    }
    if (sectorA.sector < sectorB.sector) {
        return -1;
    }
    return 0;
}

function orderSections(sectionA, sectionB) {
    sectionA.sectors.sort(orderSectors)
    sectionB.sectors.sort(orderSectors)
    if (sectionA.section > sectionB.section) {
        return 1;
    }
    if (sectionA.section < sectionB.section) {
        return -1;
    }
    return 0;
}

function orderGreenhouses(ghA, ghB) {
    ghA.sections.sort(orderSections)
    ghB.sections.sort(orderSections)
    if (ghA.greenhouse > ghB.greenhouse) {
        return 1;
    }
    if (ghA.greenhouse < ghB.greenhouse) {
        return -1;
    }
    return 0;
}