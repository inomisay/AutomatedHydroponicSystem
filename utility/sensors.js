// utility/sensors.js
// Single source of truth for the sensors shown on the dashboard.
//   key       – field name in the /sensor-data response
//   reading   – field name in a SensorReadings document (/latest-sensor-data)
//   status    – field name in the /sensor-status response
//   min / max – healthy range for a DWC system (used for the target band)
//   image     – photo in public/assets/images/sensors
module.exports = [
  {
    key: 'environmentTemperature', reading: 'EnvironmentTemperature', status: 'environmentTemperatureStatus',
    label: 'Air Temperature', unit: '°C', decimals: 1, min: 18, max: 26,
    image: 'temperature.jpeg', icon: 'bi-thermometer-sun', color: '#e8590c', sensor: 'DHT22',
  },
  {
    key: 'waterTemperature', reading: 'WaterTemperature', status: 'waterTemperatureStatus',
    label: 'Water Temperature', unit: '°C', decimals: 1, min: 18, max: 22,
    image: 'waterTemperature.jpeg', icon: 'bi-thermometer-half', color: '#1c7ed6', sensor: 'DS18B20',
  },
  {
    key: 'humidity', reading: 'Humidity', status: 'humidityStatus',
    label: 'Humidity', unit: '%', decimals: 0, min: 40, max: 70,
    image: 'humidity.jpeg', icon: 'bi-moisture', color: '#0ca678', sensor: 'DHT22',
  },
  {
    key: 'waterLevel', reading: 'WaterLevel', status: 'waterLevelStatus',
    label: 'Water Level', unit: '', decimals: 0, min: 180, max: 220,
    image: 'waterLevel.jpeg', icon: 'bi-water', color: '#3b5bdb', sensor: 'Gravity level sensor',
    note: 'Raw sensor value — pumps hold it at 200',
  },
  {
    key: 'tds', reading: 'TDS', status: 'tdsStatus',
    label: 'TDS', unit: 'ppm', decimals: 0, min: 560, max: 840,
    image: 'TDS.jpeg', icon: 'bi-droplet-half', color: '#f08c00', sensor: 'Gravity TDS',
  },
  {
    key: 'ph', reading: 'PH', status: 'pHStatus',
    label: 'pH', unit: '', decimals: 2, min: 5.5, max: 6.5,
    image: 'pH.jpeg', icon: 'bi-speedometer2', color: '#9c36b5', sensor: 'Analog pH sensor',
  },
];
