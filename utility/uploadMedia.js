const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb'); 
const fs = require('fs');
const path = require('path');
const { MONGODB_URI } = require('./config');

const conn = mongoose.createConnection(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let gfs;
conn.once('open', async () => {
    gfs = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    await uploadFiles(); // Ensures uploads complete before logging final message
    console.log("🎉 All files processed successfully!");
});

const readFilesRecursively = (dir) => {
    let results = [];
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            results = results.concat(readFilesRecursively(filePath)); // Recursively read subdirectories
        } else {
            results.push(filePath);
        }
    });

    return results;
};

// Directory containing images & videos
const mediaFolder = path.join(__dirname, '../public/assets/images');

// Allowed media types
const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.mp4', '.mov', '.avi', '.svg', '.heic'];

async function uploadFiles() {
    const files = readFilesRecursively(mediaFolder);
    let uploadPromises = [];

    for (const file of files) {
        const fileName = path.basename(file);
        const fileExtension = path.extname(file).toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            console.log(`🚫 Skipping non-media file: ${fileName}`);
            continue;
        }

        // Check if the file already exists in GridFS
        const existingFile = await gfs.find({ filename: fileName }).toArray();
        if (existingFile.length > 0) {
            console.log(`⚠️ File already exists in MongoDB: ${fileName}`);
            continue;
        }

        const mimeType = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.svg': 'image/svg+xml',
            '.heic': 'image/heic'
        }[fileExtension] || 'application/octet-stream'; // Default to binary if unknown

        const writeStream = gfs.openUploadStream(fileName, { contentType: mimeType });

        const uploadPromise = new Promise((resolve, reject) => {
            fs.createReadStream(file)
                .pipe(writeStream)
                .on('finish', () => {
                    console.log(`✅ Uploaded: ${fileName}`);
                    resolve();
                })
                .on('error', reject);
        });

        uploadPromises.push(uploadPromise);
    }

    // Wait for all uploads to finish before proceeding
    await Promise.all(uploadPromises);
}
