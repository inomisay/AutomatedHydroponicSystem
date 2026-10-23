// utility/sensorData.js
const mongoose = require('mongoose');

// Define the schema for sensor readings
// Note: documents are written by DataRetrival (C#), which only stores Date/Time
// strings, so `timestamp` has no default — a default would be applied on every
// read and make each reading look like it was taken "now".
const sensorReadingsSchema = new mongoose.Schema({
  Date: { type: String, default: null },
  Time: { type: String, default: null },
  WaterTemperature: { type: Number, default: null },
  EnvironmentTemperature: { type: Number, default: null },
  Humidity: { type: Number, default: null },
  WaterLevel: { type: Number, default: null },
  TDS: { type: Number, default: null },
  PH: { type: Number, default: null },
  timestamp: { type: Date }
}, { collection: 'SensorReadings' });

// Create the model for SensorReadings
const SensorReadings = mongoose.model('SensorReadings', sensorReadingsSchema);

// When the reading was stored: explicit timestamp if present, otherwise the
// creation time embedded in the ObjectId.
const recordedAt = (item) => item.timestamp || item._id.getTimestamp();

// Short "HH:MM" label as reported by the device clock (RTC)
const timeLabel = (item) => {
  if (item.Time) return item.Time.slice(0, 5);
  return recordedAt(item).toISOString().slice(11, 16);
};

// Function to get the latest 24 sensor readings and format them
const getSensorData = async (req, res) => {
  try {
    // ObjectIds increase with insertion order, so _id is the reliable sort key
    const data = (await SensorReadings.find().sort({ _id: -1 }).limit(24)).reverse();

    // Format the data for frontend consumption (oldest → newest)
    const formattedData = {
      waterTemperature: data.map(item => item.WaterTemperature),
      environmentTemperature: data.map(item => item.EnvironmentTemperature),
      humidity: data.map(item => item.Humidity),
      waterLevel: data.map(item => item.WaterLevel),
      tds: data.map(item => item.TDS),
      ph: data.map(item => item.PH),
      timestamps: data.map(timeLabel),
      dates: data.map(item => item.Date || recordedAt(item).toISOString().slice(0, 10)),
      recordedAt: data.map(item => recordedAt(item).toISOString())
    };

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Function to get the latest sensor reading
const getLatestSensorData = async (req, res) => {
  try {
    const latestSensorData = await SensorReadings.findOne().sort({ _id: -1 }).exec();

    // If no sensor data is found, send a 404 response
    if (!latestSensorData) {
      return res.status(404).json({ message: 'No sensor data found' });
    }

    res.status(200).json({
      ...latestSensorData.toObject(),
      recordedAt: recordedAt(latestSensorData).toISOString()
    });
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Export the functions and model for use in other files
module.exports = { getSensorData, getLatestSensorData, SensorReadings };
