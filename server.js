// RUN: npx nodemon server.js  
// server.js
const express = require('express');
const { PORT } = require('./utility/config');
const connectDB = require('./utility/database');
const app = require('./utility/middleware');
const routes = require('./utility/routes');

// Connect to MongoDB
connectDB();

// Use routes
app.use(routes);

// Start the server locally (skip when running on Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;

