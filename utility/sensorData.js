// utility/sensorData.js
const mongoose = require('mongoose');

// Define the schema for sensor readings
const sensorReadingsSchema = new mongoose.Schema({
  Date: { type: String, default: null },
  Time: { type: String, default: null },
  WaterTemperature: { type: Number, default: null },
  EnvironmentTemperature: { type: Number, default: null },
  Humidity: { type: Number, default: null },
  WaterLevel: { type: Number, default: null },
  TDS: { type: Number, default: null },
  PH: { type: Number, default: null },
  timestamp: { type: Date, default: Date.now } // Date object for timestamp
}, { collection: 'SensorReadings' });

// Create the model for SensorReadings
const SensorReadings = mongoose.model('SensorReadings', sensorReadingsSchema);

// Function to get the latest 24 sensor readings and format them
const getSensorData = async (req, res) => {
  try {
    // Fetch the latest 24 sensor readings sorted by timestamp in descending order
    const data = await SensorReadings.find().sort({ _id: -1 }).limit(24);
    console.log('Fetched sensor data:', data);

    // Format the data for frontend consumption
    const formattedData = {
      waterTemperature: data.map(item => item.WaterTemperature),
      environmentTemperature: data.map(item => item.EnvironmentTemperature),
      humidity: data.map(item => item.Humidity),
      waterLevel: data.map(item => item.WaterLevel),
      tds: data.map(item => item.TDS),
      ph: data.map(item => item.PH),
      timestamps: data.map(item => item.timestamp.toISOString().slice(11, 16)) // Extract and format time
    };

    // Send the formatted data as a JSON response
    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Function to get the latest sensor reading
const getLatestSensorData = async (req, res) => {
  try {
    // Fetch the latest sensor reading sorted by timestamp in descending order
    const latestSensorData = await SensorReadings.findOne().sort({ timestamp: -1 }).exec();

    // If no sensor data is found, send a 404 response
    if (!latestSensorData) {
      return res.status(404).json({ message: 'No sensor data found' });
    }

    // Send the latest sensor data as a JSON response
    res.status(200).json(latestSensorData);
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Export the functions and model for use in other files
module.exports = { getSensorData, getLatestSensorData, SensorReadings };
