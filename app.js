const express = require('express')
const api = require('./api')
const app = express()
const port = 5000

app.use(express.json())
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
});


app.listen(port, () => {
  console.log('Server running on port ' + port + '.')
})

app.get('/ambient-temperature/filter', api.getAmbientTemperature)
app.get('/ambient-humidity/filter', api.getAmbientHumidity)
app.get('/soil-humidity/filter', api.getSoilHumidity)
app.get('/lux/filter', api.getLux)
app.get('/locations/filter', api.getLocationDetails)
app.get('/greenhouses', api.getGreenhouses)
app.get('/real-time/filter', api.getRealTimeData)


