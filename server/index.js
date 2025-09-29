require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// require your existing handler where it is NOW:
//   server/index.js  ->  ../api/send-email.js
const sendEmail = require(path.join(__dirname, '..', 'api', 'send-email.js'));

// mount it at POST /api/send-email
app.post('/api/send-email', sendEmail);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log('Mounted: POST /api/send-email');
});
