// utility/routes.js
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { getSensorData, getLatestSensorData } = require('./sensorData');
const { SensorStatus } = require('./SensorStatus');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { MONGODB_URI } = require('./config');

let gfs; // Declare the GridFS variable

// Initialize MongoDB Connection
const conn = mongoose.createConnection(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

conn.once('open', () => {
    gfs = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    console.log('✅ MongoDB GridFS Connected');
});

conn.on('error', (err) => {
    console.error('❌ MongoDB Connection Error:', err);
});

// Route to serve images & videos from MongoDB
router.get('/media/:filename', async (req, res) => {
    try {
        const fileCursor = gfs.find({ filename: req.params.filename });
        const files = await fileCursor.toArray();

        if (!files.length) return res.status(404).json({ error: 'File not found' });

        res.set('Content-Type', files[0].contentType);
        const readStream = gfs.openDownloadStreamByName(req.params.filename);
        readStream.pipe(res);
    } catch (error) {
        console.error('Error fetching media:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/sensor-data', getSensorData);

router.get('/latest-sensor-data', getLatestSensorData);

router.get('/sensor-status', async (req, res) => {
  try {
    // Fetch the latest sensor status from the SensorStatus collection
    const latestSensorStatus = await SensorStatus.findOne().sort({ StatusDate: -1 }).exec();
    if (!latestSensorStatus) {
      return res.status(404).json({ message: 'No sensor status found' });
    }

    // Respond with the latest status data
    res.status(200).json({
      waterTemperatureStatus: latestSensorStatus.WaterTemperatureStatus,
      tdsStatus: latestSensorStatus.TDSStatus,
      humidityStatus: latestSensorStatus.HumidityStatus,
      environmentTemperatureStatus: latestSensorStatus.EnvironmentTemperatureStatus,
      waterLevelStatus: latestSensorStatus.WaterLevelStatus,
      pHStatus: latestSensorStatus.PHStatus,
    });
  } catch (error) {
    console.error('Error fetching sensor status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/rtc-date', (req, res) => {
  const now = new Date();
  const formattedDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const formattedTime = now.toTimeString().slice(0, 5); // HH:MM
  res.json({ date: formattedDate, time: formattedTime });
});

router.get('/', (req, res) => {
  res.render('index', { title: '🪴Automated Hydroponic System🍃' });
});

router.get('/dashboard', (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

// Route for handling contact form submissions
router.post('/contact', (req, res) => {
  const { name, email, subject, textMessage } = req.body;

  // Construct the email message
  const mailOptions = {
    from: `"${name}" <${email}>`, // Sender's name and email
    to: process.env.EMAIL_USER, // Recipient's email
    subject: subject, // Subject of the email
    text: `Website: ${process.env.WEBSITE_NAME}\nName: ${name}\nEmail: ${email}\nMessage: ${textMessage}`, // Plain text body
    html: `<p><strong>Website:</strong> ${process.env.WEBSITE_NAME}</p><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong> ${textMessage}</p>`, // HTML body
  };

  // Send the email
  contactEmail.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error); // Log the error
      res.status(500).json({ message: 'Error sending email' }); // Respond with error status
    } else {
      console.log('Email sent successfully'); // Log success
      console.log("Message sent: %s", info.messageId); // Log message ID
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info)); // Log preview URL (useful for test accounts)

      res.status(200).json({ message: 'Email sent successfully' }); // Respond with success status
    }
  });
});

module.exports = router;
