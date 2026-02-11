#!/usr/bin/env node
/**
 * Simple test upstream server
 * 
 * This is the API that gets protected behind the 402 gateway.
 * Run this on port 3000, then run the gateway on port 4020.
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  console.log(`📊 ${req.method} ${path} - ${new Date().toISOString()}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Simple API responses
  if (path === '/api/test') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: '✅ Access granted! This API call cost some NTMPI.',
      timestamp: new Date().toISOString(),
      path: path,
      method: req.method
    }));
  } else if (path === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: [1, 2, 3, 4, 5],
      message: 'Here is your protected data',
      cost: '0.1 NTMPI'
    }));
  } else if (path === '/api/expensive') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      result: 'This endpoint costs more NTMPI',
      computation: 'Heavy AI processing...',
      value: Math.random() * 1000
    }));
  } else if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'test-upstream' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log('🚀 Test upstream server started');
  console.log(`   Port: ${PORT}`);
  console.log('   Endpoints:');
  console.log('   • GET  /api/test      - Simple test endpoint');
  console.log('   • GET  /api/data      - Returns sample data');
  console.log('   • GET  /api/expensive - Expensive endpoint');
  console.log('   • GET  /health        - Health check');
  console.log('');
  console.log('💡 Start the 402 gateway on port 4020 to protect this API');
  console.log('   Then test with: node examples/test-client.js');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down test upstream server...');
  server.close(() => {
    process.exit(0);
  });
});