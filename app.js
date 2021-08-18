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

app.post('/ambient-temperature/', api.getAmbientTemperature)
app.get('/ambient-humidity/', api.getAmbientHumidity)
app.get('/soil-humidity/', api.getSoilHumidity)
app.get('/lux/', api.getLux)


