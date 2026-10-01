// utility/routes.js
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { getSensorData, getLatestSensorData, SensorReadings } = require('./sensorData');
const { SensorStatus } = require('./SensorStatus');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { MONGODB_URI } = require('./config');

const fs = require('fs');
const path = require('path');
const connectDB = require('./database');

let gfsBucket = null;

async function getGFS() {
    if (gfsBucket) return gfsBucket;
    const dbConn = await connectDB();
    if (dbConn && dbConn.connection && dbConn.connection.db) {
        gfsBucket = new GridFSBucket(dbConn.connection.db, { bucketName: 'uploads' });
        return gfsBucket;
    }
    if (mongoose.connection && mongoose.connection.db) {
        gfsBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
        return gfsBucket;
    }
    return null;
}

// Helper to locate media files locally in public/assets/images
const findLocalMedia = (filename) => {
    const candidates = [
        path.join(__dirname, '../public/assets/images', filename),
        path.join(__dirname, '../public/assets/images/screen', filename),
        path.join(__dirname, '../public/assets/images/team', filename),
        path.join(__dirname, '../public/assets/images/sensors', filename),
        path.join(__dirname, '../public/assets/images/dashboard', filename),
        path.join(__dirname, '../public/assets/images/svg', filename),
    ];

    // If filename has .HEIC, check .jpg candidate as well
    if (filename.toLowerCase().endsWith('.heic')) {
        const base = filename.slice(0, -5);
        candidates.unshift(path.join(__dirname, '../public/assets/images/screen', `${base}.jpg`));
        candidates.unshift(path.join(__dirname, '../public/assets/images/screen', `${base}.JPG`));
    }

    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
        }
    }
    return null;
};

// Route to serve images & videos from local filesystem or MongoDB GridFS
router.get('/media/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // 1. Try local file first (fastest, supports Range requests natively)
        const localPath = findLocalMedia(filename);
        if (localPath) {
            return res.sendFile(localPath);
        }

        // 2. Fall back to MongoDB GridFS
        const bucket = await getGFS();
        if (!bucket) {
            return res.status(503).json({ error: 'Database media storage not ready' });
        }

        // Candidate names in GridFS (including JPG equivalent if requested as HEIC)
        const searchNames = [filename];
        if (filename.toLowerCase().endsWith('.heic')) {
            const base = filename.slice(0, -5);
            searchNames.push(`${base}.jpg`);
            searchNames.push(`${base}.JPG`);
        }

        let file = null;
        for (const name of searchNames) {
            const files = await bucket.find({ filename: name }).toArray();
            if (files.length > 0) {
                file = files[0];
                break;
            }
        }

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.set('Cache-Control', 'public, max-age=86400');
        res.set('Content-Type', file.contentType || 'application/octet-stream');

        // Handle HTTP Range header for video streaming
        const range = req.headers.range;
        if (range && file.length) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
            const chunkSize = end - start + 1;

            res.status(206);
            res.set({
                'Content-Range': `bytes ${start}-${end}/${file.length}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
            });

            const stream = bucket.openDownloadStreamByName(file.filename, { start, end: end + 1 });
            return stream.pipe(res);
        }

        res.set('Content-Length', file.length);
        const readStream = bucket.openDownloadStreamByName(file.filename);
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
      console.log('⚠️ No sensor status found in database');
      return res.status(404).json({ message: 'No sensor status found' });
    }

    // Check if the last update is older than 30 minutes
    const now = new Date();
    const statusDate = new Date(latestSensorStatus.StatusDate);
    const THIRTY_MINUTES = 30 * 60 * 1000;
    const isStale = (now - statusDate) > THIRTY_MINUTES;

    console.log('========== SENSOR STATUS FROM DATABASE ==========');
    console.log('Raw Database Document:', JSON.stringify(latestSensorStatus, null, 2));
    console.log('StatusDate:', statusDate.toISOString(), '| Now:', now.toISOString(), '| Stale:', isStale);
    console.log('==================================================');

    // If stale, set all statuses to Offline
    const responseData = {
      waterTemperatureStatus: isStale ? 'Offline' : latestSensorStatus.WaterTemperatureStatus,
      tdsStatus: isStale ? 'Offline' : latestSensorStatus.TDSStatus,
      humidityStatus: isStale ? 'Offline' : latestSensorStatus.HumidityStatus,
      environmentTemperatureStatus: isStale ? 'Offline' : latestSensorStatus.EnvironmentTemperatureStatus,
      waterLevelStatus: isStale ? 'Offline' : latestSensorStatus.WaterLevelStatus,
      pHStatus: isStale ? 'Offline' : latestSensorStatus.PHStatus,
    };

    console.log('Response being sent:', JSON.stringify(responseData, null, 2));
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching sensor status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/rtc-date', async (req, res) => {
  try {
    // Fetch the latest sensor reading to get the date from the database
    const latestSensorData = await SensorReadings.findOne().sort({ timestamp: -1 }).exec();
    
    if (!latestSensorData || !latestSensorData.Date) {
      // Fallback to current date if no data found
      const now = new Date();
      const formattedDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const formattedTime = now.toTimeString().slice(0, 5); // HH:MM
      return res.json({ date: formattedDate, time: formattedTime });
    }

    // Use the date from the database
    const dbDate = latestSensorData.Date; // Format: '23/11/2024'
    const dbTime = latestSensorData.Time || '00:00'; // Format: 'HH:MM'
    
    // Convert DD/MM/YYYY to YYYY-MM-DD for consistent display
    const dateParts = dbDate.split('/');
    const formattedDate = dateParts.length === 3 
      ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` 
      : dbDate;
    
    res.json({ date: formattedDate, time: dbTime });
  } catch (error) {
    console.error('Error fetching RTC date:', error);
    // Fallback to current date on error
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);
    const formattedTime = now.toTimeString().slice(0, 5);
    res.json({ date: formattedDate, time: formattedTime });
  }
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
  const websiteName = process.env.WEBSITE_NAME || 'Automated Hydroponic System';
  const mailOptions = {
    from: `"${name}" <${email}>`, // Sender's name and email
    to: process.env.EMAIL_USER, // Recipient's email
    subject: subject, // Subject of the email
    text: `Website: ${websiteName}\nName: ${name}\nEmail: ${email}\nMessage: ${textMessage}`, // Plain text body
    html: `<p><strong>Website:</strong> ${websiteName}</p><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong> ${textMessage}</p>`, // HTML body
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
