// utility/routes.js
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { getSensorData, getLatestSensorData, SensorReadings } = require('./sensorData');
const { SensorStatus } = require('./SensorStatus');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

const fs = require('fs');
const path = require('path');
const connectDB = require('./database');
const sensors = require('./sensors');

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
            let start = parseInt(parts[0], 10);
            let end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
            if (Number.isNaN(start)) {
                // Suffix range ("bytes=-500"): the last N bytes
                start = Math.max(file.length - end, 0);
                end = file.length - 1;
            }
            end = Math.min(end, file.length - 1);
            if (start > end) {
                res.set('Content-Range', `bytes */${file.length}`);
                return res.status(416).end();
            }
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

// Make sure MongoDB is connected before any data route runs. Mongoose is
// configured with bufferCommands: false, so on a cold start (Vercel) queries
// issued before the connection is ready would otherwise throw.
const requireDB = async (req, res, next) => {
  const conn = await connectDB();
  if (!conn) {
    return res.status(503).json({ error: 'Database unavailable' });
  }
  next();
};

router.get('/sensor-data', requireDB, getSensorData);

router.get('/latest-sensor-data', requireDB, getLatestSensorData);

router.get('/sensor-status', requireDB, async (req, res) => {
  try {
    // Fetch the latest sensor status from the SensorStatus collection
    const latestSensorStatus = await SensorStatus.findOne().sort({ StatusDate: -1 }).exec();
    if (!latestSensorStatus) {
      return res.status(404).json({ message: 'No sensor status found' });
    }

    // Treat the status as stale if the last update is older than 30 minutes
    const statusDate = new Date(latestSensorStatus.StatusDate);
    const THIRTY_MINUTES = 30 * 60 * 1000;
    const isStale = (Date.now() - statusDate) > THIRTY_MINUTES;

    // If stale, set all statuses to Offline
    const statusOf = (value) => (isStale ? 'Offline' : value);
    res.status(200).json({
      waterTemperatureStatus: statusOf(latestSensorStatus.WaterTemperatureStatus),
      tdsStatus: statusOf(latestSensorStatus.TDSStatus),
      humidityStatus: statusOf(latestSensorStatus.HumidityStatus),
      environmentTemperatureStatus: statusOf(latestSensorStatus.EnvironmentTemperatureStatus),
      waterLevelStatus: statusOf(latestSensorStatus.WaterLevelStatus),
      pHStatus: statusOf(latestSensorStatus.PHStatus),
      statusDate: statusDate.toISOString(),
      isStale,
    });
  } catch (error) {
    console.error('Error fetching sensor status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/rtc-date', async (req, res) => {
  const fallback = () => {
    const now = new Date();
    return { date: now.toISOString().slice(0, 10), time: now.toISOString().slice(11, 16) };
  };

  try {
    const conn = await connectDB();
    // Fetch the latest sensor reading to get the date reported by the device RTC
    const latestSensorData = conn && await SensorReadings.findOne().sort({ _id: -1 }).exec();

    if (!latestSensorData || !latestSensorData.Date) {
      return res.json(fallback());
    }

    // Convert DD/MM/YYYY to YYYY-MM-DD for consistent display
    const dateParts = latestSensorData.Date.split('/');
    const formattedDate = dateParts.length === 3
      ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
      : latestSensorData.Date;

    res.json({ date: formattedDate, time: (latestSensorData.Time || '00:00').slice(0, 5) });
  } catch (error) {
    console.error('Error fetching RTC date:', error);
    res.json(fallback());
  }
});

router.get('/', (req, res) => {
  res.render('index', { title: 'YGSAHS · Automated Hydroponic System' });
});

router.get('/dashboard', (req, res) => {
  res.render('dashboard', { title: 'Monitoring Dashboard · YGSAHS', sensors });
});

// Mail transport for the contact form, created on first use from env vars:
//   EMAIL_USER / EMAIL_PASS            (required)
//   EMAIL_HOST / EMAIL_PORT            (optional, defaults to Gmail)
let contactEmail = null;
const getContactEmail = () => {
  if (contactEmail) return contactEmail;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  const auth = { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS };
  contactEmail = process.env.EMAIL_HOST
    ? nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth,
      })
    : nodemailer.createTransport({ service: 'gmail', auth });
  return contactEmail;
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// Route for handling contact form submissions
router.post('/contact', async (req, res) => {
  const { name, email, subject, textMessage } = req.body || {};

  if (![name, email, subject, textMessage].every(v => typeof v === 'string' && v.trim())) {
    return res.status(400).json({ message: 'Please fill in all fields.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const transport = getContactEmail();
  if (!transport) {
    console.error('Contact form: EMAIL_USER / EMAIL_PASS are not configured');
    return res.status(503).json({ message: 'Messaging is not configured yet. Please try again later.' });
  }

  // Construct the email message. It is sent from our own account (most SMTP
  // providers reject spoofed senders); replies go to the visitor.
  const websiteName = process.env.WEBSITE_NAME || 'Automated Hydroponic System';
  const mailOptions = {
    from: `"${websiteName}" <${process.env.EMAIL_USER}>`,
    replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject: `[${websiteName}] ${subject}`,
    text: `Website: ${websiteName}\nName: ${name}\nEmail: ${email}\nMessage: ${textMessage}`,
    html: `<p><strong>Website:</strong> ${escapeHtml(websiteName)}</p>`
      + `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`
      + `<p><strong>Email:</strong> ${escapeHtml(email)}</p>`
      + `<p><strong>Message:</strong><br>${escapeHtml(textMessage).replace(/\n/g, '<br>')}</p>`,
  };

  try {
    await transport.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: "Sorry, we couldn't send your message. Please try again later." });
  }
});

module.exports = router;
