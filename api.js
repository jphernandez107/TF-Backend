const types = require('pg').types
const { Sequelize, Op } = require("sequelize");

const Reading = require('./ORM/models').Reading
const Sensor = require('./ORM/models').Sensor
const Location = require('./ORM/models').Location;
const db = require('./ORM/models/index')


const postgresNumericIdentifier = 1700
const postgresTimestamptzIdentifier = 1184
types.setTypeParser(postgresNumericIdentifier, function(val) {
    return parseFloat(val)
})
types.setTypeParser(postgresTimestamptzIdentifier, function(val) {
    let date = new Date(Date.parse(val)).toLocaleString("es-AR")
    return date
})

const getDataBySensorByLocation = async (req, res) => { 
    const secondsForAverageData = getSecondsForAverageData(req.query)
    return Reading
        .findAll({
            include: [
                {
                    model: Sensor,
                    where: whereSensor(req.query)
                },
                {
                    model: Location,
                    where: whereLocation(req.query)
                }
            ],
            attributes: [
                [Sequelize.fn('ROUND', Sequelize.fn('AVG', Sequelize.col('value')), 2), 'value'], 
                [Sequelize.literal(`to_timestamp(floor((extract('epoch' from \"Reading\".\"created_date\") / ${secondsForAverageData} )) * ${secondsForAverageData})`), 'date']],
                group: ['date', '"Sensor".id', '"Location".id'],
            order: [
                [Sequelize.literal('"date" DESC')]
            ],
            where: whereClause(req.query)
        })
        .then((readings) => {
            let read = readings.map((reading) => {
                return {
                    value: reading.dataValues.value,
                    date: reading.dataValues.date,
                    sensor: reading.dataValues.Sensor,
                    location: reading.dataValues.Location
                }
            })
            let json = {
                data: read,
                unit: "°C",
                max: null,
                min: null
            }
            console.log(json)
            res.status(200).json(json)
        })
        .catch((error) => {
            console.log(error)
            res.status(400).send(error)
        })
}

const getLocationDetails = async (req, res) => { 

    return Reading
        .findAll({
            include: [
                {
                    model: Location
                }
            ],
            attributes: [
                ['sensor_id', 'sensorId']
            ],
            where: whereLocation(req.query),
            group: ['"Location".id', 'sensorId']
        })
        .then( readings => {
            let sensors = readings.map((read) => { 
                let json = {}
                json['sensorId'] = read.dataValues.sensorId
                json['location'] = read.dataValues.Location.dataValues
                return json
            })
            
            Location
                .findAll({
                    include: [],
                    where: whereLocation(req.query)
                })
                .then(readings => {
                    let results = readings.map((read) => { return read.dataValues })
                    let greenhouses = []
                    for (let sensor of sensors) {
                        for(let loc of results) { // Armamos el array de objetos anidados
                            let gh = greenhouses.find(gh => gh.greenhouse == loc.greenhouse)
                            if (gh != undefined) {
                                let section = gh.sections.find(sect => sect.section == loc.section)
                                if (section != undefined) {
                                    let sector = section.sectors.find(sect => sect.sector == loc.sector)
                                    if (sector != undefined) {
                                        addSensorToLocation(sensor, gh, section, sector)
                                    } else {
                                        addSensorToLocation(sensor, gh, section, loc.sector)
                                        section.sectors.push({sector: loc.sector})
                                    } 
                                } else {
                                    addSensorToLocation(sensor, gh, loc.section, null)
                                    let sectors = []
                                    sectors.push({sector: loc.sector})
                                    gh.sections.push({section: loc.section, sectors: sectors})
                                }
                            } else {
                                addSensorToLocation(sensor, loc.greenhouse, null, null)
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
                    }
                    greenhouses.sort(orderGreenhouses)
                    res.status(200).json(greenhouses)
                })
                .catch(error => {
                    console.log(error)
                })

        })
        .catch(error => {
            console.log(error)
        })    
}

const getRealTimeData = async (req, res) => {
    let locationFiltered = getSQLFiltersLocations(req.query, "AND")
    /// TODO: Calcular el promedio de todos los sensores de la ubicacion elegida
    let sqlQuery = 'SELECT value AS "value", "Sensor"."id" AS "sensorId", "Location"."greenhouse" AS "greenhouse", "Filtered"."Max" AS "date" '
        sqlQuery += 'FROM "readings" AS "Reading" '
        sqlQuery += 'JOIN (SELECT sensor_id, "l"."greenhouse", MAX(created_date) as "Max" FROM "readings" AS "r" INNER JOIN "locations" AS "l" ON "l"."id" = "r"."location_id" GROUP BY sensor_id, "l"."greenhouse") AS "Filtered" '
        sqlQuery += 'ON "Reading"."created_date" = "Filtered"."Max" '
        sqlQuery += 'AND "Reading"."sensor_id" = "Filtered"."sensor_id" '
        sqlQuery += 'INNER JOIN "sensors" AS "Sensor" '
        sqlQuery += 'ON "Reading"."sensor_id" = "Sensor"."id" '
        sqlQuery += 'INNER JOIN "locations" AS "Location" '
        sqlQuery += `ON "Reading"."location_id" = "Location"."id" ${locationFiltered} `
        sqlQuery += 'ORDER BY "Max" DESC'

    console.log(sqlQuery)

    return db.sequelize.query(sqlQuery)
        .then((readings) => {
            res.status(200).json(readings[0].map((read) => { return read }))
        }).catch((error) => {
            console.log(error)
            res.status(400).send(error)
        })

}

const getLocationWithRealTimeData = async (req, res) => { 

    return Reading
        .findAll({
            include: [
                {
                    model: Location,
                    where: whereLocation(req.query),
                    attributes: [
                        ['id', 'id'],
                        ['greenhouse', 'greenhouse'],
                        ['section', 'section'],
                        ['sector', 'sector']
                    ]
                },
                {
                    model: Sensor,
                    where: whereSensor(req.query),
                    attributes: [
                        ['id', 'id'],
                        ['name', 'name']
                    ]
                }
            ],
            attributes: [
                [Sequelize.fn('ROUND', Sequelize.fn('AVG', Sequelize.col('"Reading"."value"')), 2), 'value'],
                [Sequelize.fn('MAX', Sequelize.col('created_date')), 'date']],
            group: ['"Sensor"."id"', '"Sensor"."name"', '"Location"."id"'],
            where: whereClause(req.query)
        })
        .then( readings => {
            // let sensors = readings.map((read) => read.dataValues)
            // console.log(reads)
            // res.status(200).json(reads)

            let sensors = readings.map((read) => { 
                let json = {}
                json['sensor'] = read.dataValues.Sensor.dataValues
                json.sensor['value'] = read.dataValues.value
                json.sensor['date'] = read.dataValues.date
                json['location'] = read.dataValues.Location.dataValues
                return json
            })

            // res.status(200).json(sensors)
            
            Location
                .findAll({
                    include: [],
                    where: whereLocation(req.query)
                })
                .then(readings => {
                    let results = readings.map((read) => { return read.dataValues })
                    let greenhouses = []
                    for (let sensor of sensors) {
                        for(let loc of results) { // Armamos el array de objetos anidados
                            let gh = greenhouses.find(gh => gh.greenhouse == loc.greenhouse)
                            if (gh != undefined) {
                                let section = gh.sections.find(sect => sect.section == loc.section)
                                if (section != undefined) {
                                    let sector = section.sectors.find(sect => sect.sector == loc.sector)
                                    if (sector != undefined) {
                                        addSensorToLocation(sensor, gh, section, sector)
                                    } else {
                                        addSensorToLocation(sensor, gh, section, loc.sector)
                                        section.sectors.push({sector: loc.sector})
                                    } 
                                } else {
                                    addSensorToLocation(sensor, gh, loc.section, null)
                                    let sectors = []
                                    sectors.push({sector: loc.sector})
                                    gh.sections.push({section: loc.section, sectors: sectors})
                                }
                            } else {
                                addSensorToLocation(sensor, loc.greenhouse, null, null)
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
                    }
                    greenhouses.sort(orderGreenhouses)
                    res.status(200).json(greenhouses)
                })
                .catch(error => {
                    console.log(error)
                })

        })
        .catch(error => {
            console.log(error)
            res.status(400).send(error)
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

 function getSQLFiltersLocations(query, starterFilter = "WHERE") {
    let where = []

    if (query.greenhouses != undefined && query.greenhouses.length > 0) { where.push(getLocationFilter(query.greenhouses, '"Location"."greenhouse"'))}
    if (query.sections != undefined && query.sections.length > 0) { where.push(getLocationFilter(query.sections, '"Location"."section"'))}
    if (query.sectors != undefined && query.sectors.length > 0) { where.push(getLocationFilter(query.sectors, '"Location"."sector"'))}

    let sql = ""
    if (where.length > 0) {
        sql = ` ${starterFilter} ` + where.join(" AND ")
    }

    return sql
}

module.exports = {
    getDataBySensorByLocation,
    getLocationDetails,
    getRealTimeData,
    getLocationWithRealTimeData
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
    if (parseInt(sectionA.section) > parseInt(sectionB.section)) { // SMELL: We cannot use letters on sections. We are limited to numbers only
        return 1;
    }
    if (parseInt(sectionA.section) < parseInt(sectionB.section)) {
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

function getDateFromString(dateString) {
    let dateTime = dateString.split(" ")
    let date = dateTime[0].split("/")    // [0]dia [1]mes  [2]año
    let time = dateTime[1].split(":")    // [0]hr  [1]min  [2]seg
    return new Date(date[2], date[1]-1, date[0], time[0], time[1], time[2])
}

function whereClause(query) {
    let where = {}
    let date = filterDate(query)
    if (date) where['created_date'] = date
    let value = filterValue(query)
    if (value) where['value'] = value
    return where
}

function filterDate(query) {
    let fromDate = query.fromDate; let toDate = query.toDate
    if (fromDate && toDate) return { [Op.between]: [getDateFromString(fromDate), getDateFromString(toDate)]}
    else if (fromDate) return { [Op.gte]: getDateFromString(fromDate) }
    else if (toDate) return { [Op.lte]: getDateFromString(toDate) }
    else return undefined
}

function filterValue(query) {
    let fromValue = query.fromValue; let toValue = query.toValue
    if (fromValue && toValue) return { [Op.between]: [fromValue, toValue]}
    else if (fromValue) return { [Op.gte]: fromValue }
    else if (toValue) return { [Op.lte]: toValue }
    else return undefined
}

function whereLocation(query) {
    let whereFilter = []
    if (query.greenhouses) {
        let gr = []
        for (let greenhouse of query.greenhouses) { gr.push({'greenhouse': greenhouse}) }
        whereFilter.push({ [Op.or]: gr })
    }

    if (query.sections) {
        let sc = []
        for (let section of query.sections) { sc.push({'section': section}) }
        whereFilter.push({ [Op.or]: sc })
    }

    if (query.sectors) {
        let sr = []
        for (let sector of query.sectors) { sr.push({'sector': sector}) }
        whereFilter.push({ [Op.or]: sr })
    }

    return {
        [Op.and]: whereFilter
    }
}

function whereSensor(query) {
    // TODO: migrate to array of ids
    if (query.sensorIds) return { 'id': query.sensorIds }
    else return {}
}

function addSensorToLocation(sensor, greenhouse, section, sector) {
    if (greenhouse && greenhouse.greenhouse === sensor.location.greenhouse) {
        let sensorIds = []
        if (greenhouse.sensorIds) sensorIds = greenhouse.sensorIds
        if (sensorIds.indexOf(sensor.sensorId) === -1) sensorIds.push(sensor.sensorId)
        greenhouse['sensorIds'] = sensorIds
        console.log(sensorIds)

        if (section && section.section === sensor.location.section) {
            if (section.sensorIds) sensorIds = section.sensorIds
            else sensorIds = []
            if (sensorIds.indexOf(sensor.sensorId) === -1) sensorIds.push(sensor.sensorId)
            section['sensorIds'] = sensorIds

            if (sector && sector.sector === sensor.location.sector) {
                let sensors = []
                if (sector.sensorIds) sensorIds = sector.sensorIds
                else sensorIds = []
                if (sector.sensors) sensors = sector.sensors
                else sensors = []
                if (sensorIds.indexOf(sensor.sensorId) === -1) sensorIds.push(sensor.sensorId)
                sector['sensorIds'] = sensorIds
                if (sensors.indexOf(sensor.sensor) === -1) sensors.push(sensor.sensor)
                sector['sensors'] = sensors
            }
        }
    }

}

function getSecondsForAverageData(query) {
    let toDate = new Date()
    let fromDate = new Date().setDate(toDate.getDate() - 1)
    if (query.toDate) toDate = getDateFromString(query.toDate)
    if (query.fromDate) fromDate = getDateFromString(query.fromDate)

    let differenceInDays = (toDate - fromDate) / (1000 * 3600 * 24)
    if (differenceInDays <= 1) differenceInDays = 1

    return 100 * differenceInDays

}