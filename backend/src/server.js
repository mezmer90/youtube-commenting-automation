// Main Server Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
        }
    }
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
const publicPath = path.join(__dirname, '..', 'public');
console.log(`Serving static files from: ${publicPath}`);
app.use(express.static(publicPath));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Import routes
const categoriesRoutes = require('./routes/categories');
const videosRoutes = require('./routes/videos');
const progressRoutes = require('./routes/progress');
const populateRoutes = require('./routes/populate');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');

// API Routes
app.use('/api/categories', categoriesRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/populate', populateRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'YouTube Commenter Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            categories: '/api/categories',
            videos: '/api/videos',
            progress: '/api/progress',
            populate: '/api/populate',
            ai: {
                summarize: '/api/ai/summarize',
                chapters: '/api/ai/chapters',
                takeaways: '/api/ai/takeaways',
                comment: '/api/ai/comment',
                process: '/api/ai/process'
            }
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 YouTube Commenter Backend Server');
    console.log('='.repeat(60));
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    await pool.end();
    process.exit(0);
});

module.exports = app;
