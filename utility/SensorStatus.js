const mongoose = require('mongoose');

// Define the schema for SensorStatus
const sensorStatusSchema = new mongoose.Schema({
  StatusDate: { type: Date, default: Date.now },
  WaterTemperatureStatus: { type: String, default: 'Offline' },
  TDSStatus: { type: String, default: 'Offline' },
  HumidityStatus: { type: String, default: 'Offline' },
  EnvironmentTemperatureStatus: { type: String, default: 'Offline' },
  WaterLevelStatus: { type: String, default: 'Offline' },
  PHStatus: { type: String, default: 'Offline' }
}, { collection: 'SensorStatus' });

// Create the model
const SensorStatus = mongoose.model('SensorStatus', sensorStatusSchema);

// Function to fetch the latest sensor status
const getLatestSensorStatus = async (req, res) => {
  try {
    const latestSensorStatus = await SensorStatus.findOne().sort({ StatusDate: -1 }).exec();
    if (!latestSensorStatus) {
      return res.status(404).json({ message: 'No sensor status found' });
    }
    res.status(200).json(latestSensorStatus);
  } catch (error) {
    console.error('Error fetching latest sensor status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Function to fetch the last 24 sensor statuses
const getSensorStatus = async (req, res) => {
  try {
    const data = await SensorStatus.find().sort({ StatusDate: -1 }).limit(24);
    const formattedStatus = {
      waterTemperatureStatus: data.map(item => item.WaterTemperatureStatus),
      tdsStatus: data.map(item => item.TDSStatus),
      humidityStatus: data.map(item => item.HumidityStatus),
      environmentTemperatureStatus: data.map(item => item.EnvironmentTemperatureStatus),
      waterLevelStatus: data.map(item => item.WaterLevelStatus),
      phStatus: data.map(item => item.PHStatus),
      statusDates: data.map(item => item.StatusDate.toISOString().slice(0, 19).replace('T', ' '))
    };
    res.status(200).json(formattedStatus);
  } catch (error) {
    console.error('Error fetching sensor status data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getSensorStatus, getLatestSensorStatus, SensorStatus };
