const express = require('express')
const api = require('./api')
const app = express()
const port = 5000

app.use(express.json())

app.listen(port, () => {
  console.log('Server running on port ' + port + '.')
})

app.get('/ambient-temperature/', api.getAmbientTemperature)
app.get('/ambient-humidity/', api.getAmbientHumidity)
app.get('/soil-humidity/', api.getSoilHumidity)
app.get('/lux/', api.getLux)


