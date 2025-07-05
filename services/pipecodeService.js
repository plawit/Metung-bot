const http = require('http');
const https = require('https');

class PipecodeService {
  constructor(config = {}) {
    this.host = config.host || 'localhost';
    this.port = config.port || 8080;
    this.protocol = config.protocol || 'http';
    this.timeout = config.timeout || 5000;
    this.apiKey = config.apiKey || process.env.PIPECODE_API_KEY;
  }

  async testConnection() {
    return new Promise((resolve, reject) => {
      const client = this.protocol === 'https' ? https : http;
      const options = {
        hostname: this.host,
        port: this.port,
        path: '/health',
        method: 'GET',
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      };

      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const result = {
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            data: data,
            timestamp: new Date().toISOString(),
            host: this.host,
            port: this.port,
            protocol: this.protocol
          };
          resolve(result);
        });
      });

      req.on('error', (error) => {
        const result = {
          success: false,
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString(),
          host: this.host,
          port: this.port,
          protocol: this.protocol
        };
        reject(result);
      });

      req.on('timeout', () => {
        req.destroy();
        const result = {
          success: false,
          error: 'Connection timeout',
          code: 'TIMEOUT',
          timestamp: new Date().toISOString(),
          host: this.host,
          port: this.port,
          protocol: this.protocol,
          timeout: this.timeout
        };
        reject(result);
      });

      req.end();
    });
  }

  async sendData(data) {
    return new Promise((resolve, reject) => {
      const client = this.protocol === 'https' ? https : http;
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: this.host,
        port: this.port,
        path: '/api/data',
        method: 'POST',
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      };

      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          const result = {
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            data: responseData,
            timestamp: new Date().toISOString()
          };
          resolve(result);
        });
      });

      req.on('error', (error) => {
        const result = {
          success: false,
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        };
        reject(result);
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          success: false,
          error: 'Request timeout',
          code: 'TIMEOUT',
          timestamp: new Date().toISOString(),
          timeout: this.timeout
        });
      });

      req.write(postData);
      req.end();
    });
  }

  getStatus() {
    return {
      host: this.host,
      port: this.port,
      protocol: this.protocol,
      timeout: this.timeout,
      hasApiKey: !!this.apiKey,
      service: 'pipecode'
    };
  }
}

module.exports = PipecodeService;