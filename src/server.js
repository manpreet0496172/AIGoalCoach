import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import goalRoutes from './routes/goalRoutes.js';
import TelemetryService from './services/TelemetryService.js';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============ ROUTES ============

// API routes
app.use('/api/goals', goalRoutes);

// Telemetry endpoints
app.get('/api/telemetry', async (req, res) => {
  try {
    const summary = await TelemetryService.getSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching telemetry summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch telemetry summary',
    });
  }
});

app.get('/api/telemetry/logs', async (req, res) => {
  const { date } = req.query; // Optional date filter in YYYY-MM-DD format
  try {
    const logs = await TelemetryService.getLogs(date);
    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length,
      dateFilter: date || 'all',
    });
  } catch (error) {
    console.error('Error fetching telemetry logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch telemetry logs',
    });
  }
});

// Test evaluation endpoint
app.post('/api/eval/run-tests', async (req, res) => {
  try {
    // Import and run the test suite
    const { runAllTests } = await import('../test_evals.js');
    
    // Override the process.exit to prevent server from shutting down
    const originalExit = process.exit;
    process.exit = () => {};
    
    // Capture console output
    const originalConsoleLog = console.log;
    const consoleOutput = [];
    console.log = (...args) => {
      consoleOutput.push(args.join(' '));
      originalConsoleLog(...args);
    };
    
    // Run tests and get results
    const testResults = await runAllTests();
    
    // Restore console and process.exit
    console.log = originalConsoleLog;
    process.exit = originalExit;
    
    res.json({
      success: true,
      data: {
        output: consoleOutput.join('\n'),
        results: testResults,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error running test suite:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run test suite'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============ SERVER START ============
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     AI Goal Coach - Server Started      ║
╚════════════════════════════════════════╝
🚀 Server running at: http://localhost:${PORT}
📊 API Docs: http://localhost:${PORT}/api/health
🎯 Web UI: http://localhost:${PORT}
  `);
});

export default app;
