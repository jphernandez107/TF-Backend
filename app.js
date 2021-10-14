const express = require('express')
const api = require('./api')
const app = express()
const port = process.env.PORT || 5000

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

app.get('/data/filter', api.getDataBySensorByLocation)
app.get('/locations/filter', api.getLocationDetails)
app.get('/real-time/filter', api.getRealTimeData)
app.get('/locations/real-time/filter', api.getLocationWithRealTimeData)


