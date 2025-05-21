const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const path = require('path');
const visitRoutes = require('./routes/visitRoutes'); // Import visitRoutes
const authRoutes = require('./routes/authRoutes');
const submittedVisitRoutes = require('./routes/SubmittedVisitRoutes');
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
const multer = require('multer'); // Import multer
const { error } = require('console');
const pendingVisitRoutes = require('./routes/PendingVisitRoutes');
const approvedRoutes = require('./routes/approvedRouter');
const userRoutes = require('./routes/userRoutes');
//google login
const session = require('express-session');
const passport = require('passport');

// Load env vars
dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });
require('./middleware/googleAuth');

// Connect to Database
connectDB();

// Initialize express app
const app = express();

// Add this error logging middleware
app.use((req, res, next) => {
    console.log(`Incoming ${req.method} request to ${req.path}`);
    next();
});

// Enhanced Security Middleware
app.use(helmet());
// Use a more explicit CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            console.error(msg);
            callback(new Error(msg), false);
        }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length']
}));

// Request logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// JSON body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

// Static files (if needed)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', require('./routes/employees'));
app.use('/api/visits', visitRoutes);
app.use('/api/submitted-visits', submittedVisitRoutes);
app.use('/api/pending-visits', pendingVisitRoutes);
app.use('/api/approved-visits', approvedRoutes);
app.use('/api/users', userRoutes);
// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

// Simple base route
app.get('/', (req, res) => res.send('API Running'));

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    //check for specific mongoose errors
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
      });
    }
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});


require('./middleware/googleAuth');
// Port
const PORT = process.env.PORT || 5000;

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Database: ${process.env.MONGO_URI}`);
});

// Graceful shutdown
process.on('unhandledRejection', (err, promise) => {
    console.error(`Unhandled Rejection at: ${promise}, Error: ${err.message}`);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    console.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
});
