// src\server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const signingRoutes = require('./routes/signing');
const remoteSigningRoutes = require('./routes/remoteSigningRoutes');
const remoteSigningRoutesHtml = require('./routes/remoteSigningRoutesHtml');
const getEnvelopeRoute = require('./routes/getEnvelopeRoute');
const listEnvelopeRecipientsRoute = require('./routes/listEnvelopeRecipientRoute');
const getDocumentsRoutes = require('./routes/getDocumentsRoutes');
const listEnvelopesRoutes = require('./routes/listEnvelopesRoutes');
const responsiveSigningRoutes = require('./routes/responsiveSigningRoutes');
const embeddedSigningRoutes = require('./routes/embeddedSigningRoutes');
const cors = require('cors');

require('dotenv').config();

const allowedOrigins = [
  'http://localhost:3000',
  'https://docusign-ten.vercel.app',
  'https://docaprise-6jfzbe.bunnyenv.com',
  'https://docaprise.netlify.app'
];

const PORT = process.env.PORT || 3001;
const app = express();


const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
    secret: 'docusign-hackathon',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));


app.use(express.json());

app.get('/', (req, res) => {
  res.send('<h1>Welcome to the Server!</h1><p>Server is running.</p>');
});

// API status route - returns a JSON response
app.get('/status', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.use('/api', authRoutes);
app.use('/api', signingRoutes);
app.use('/api', remoteSigningRoutes);
app.use('/api', remoteSigningRoutesHtml);
app.use('/api', getEnvelopeRoute);
app.use('/api', listEnvelopeRecipientsRoute);
app.use('/api', getDocumentsRoutes);
app.use('/api', listEnvelopesRoutes);
app.use('/api', responsiveSigningRoutes);
app.use('/api', embeddedSigningRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
