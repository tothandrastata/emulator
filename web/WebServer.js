const Fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const fastifyCors = require('@fastify/cors');
const path = require('path');

/**
 * Web Server for TPN-MMU Emulator
 * Provides a REST API and web-based control interface
 */
class WebServer {
  constructor(noodleServer, config, emulator = null) {
    this.noodleServer = noodleServer;
    this.config = config;
    this.emulator = emulator;
    this.app = Fastify({ logger: false });

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Update the noodle server reference (used when server is recreated)
   */
  updateServer(noodleServer) {
    this.noodleServer = noodleServer;
  }

  /**
   * Set up middleware (CORS and static file serving)
   */
  setupMiddleware() {
    // CORS for potential external access
    this.app.register(fastifyCors, { origin: true });

    // Serve static files from static/ directory
    const staticPath = path.join(__dirname, 'static');

    // Verify path exists before registering
    const fs = require('fs');
    if (fs.existsSync(staticPath)) {
      this.app.register(fastifyStatic, {
        root: staticPath,
        prefix: '/'
      });
      console.log(`Static files served from: ${staticPath}`);
    } else {
      console.warn(`Static files directory not found: ${staticPath}`);
    }
  }

  /**
   * Set up all API routes
   */
  setupRoutes() {
    this.registerStatusRoute();
    this.registerMediaRoutes();
    this.registerTcpRoutes();
  }

  /**
   * Register status route
   */
  registerStatusRoute() {
    this.app.get('/api/status', async (_request, _reply) => {
      const response = {
        productName: this.noodleServer.ProductName,
        partNumber: this.noodleServer.PartNumber,
        serialNumber: this.noodleServer.SerialNumber,
        packageVersion: this.noodleServer.PackageVersion,
        matrixSize: 3
      };

      // Include TCP server state and port if emulator is available
      if (this.emulator) {
        if (typeof this.emulator.isTcpServerEnabled === 'function') {
          response.tcpServerEnabled = this.emulator.isTcpServerEnabled();
        } else if (typeof this.emulator.tcpServerEnabled !== 'undefined') {
          response.tcpServerEnabled = this.emulator.tcpServerEnabled;
        }

        // Include TCP port from server config
        if (this.emulator.serverConfig && this.emulator.serverConfig.port) {
          response.tcpPort = this.emulator.serverConfig.port;
        }
      }

      return response;
    });
  }

  /**
   * Register API routes for Endpoints and Media
   */
  registerMediaRoutes() {
    this.app.get('/api/state', async (_request, _reply) => {
      if (!this.emulator || !this.emulator.state) {
        return { error: 'Emulator state not found' };
      }
      return this.emulator.state;
    });

    // Toggle Input Connected Status
    this.app.put('/api/inputs/:id/connect', async (request, reply) => {
      const { id } = request.params;
      const { connected } = request.body;

      if (!this.emulator || !this.emulator.server?.MEDIA?.VIDEO?.[id]) {
        return reply.code(404).send({ error: `Input ${id} not found` });
      }

      this.emulator.server.MEDIA.VIDEO[id].Connected = connected;
      this.emulator.state.inputs[id].Connected = connected;

      return { success: true, id, connected };
    });

    // Disconnect Endpoint
    this.app.put('/api/destinations/:id/disconnect', async (request, reply) => {
      const { id } = request.params;
      if (!this.emulator || !this.emulator.server?.MEDIA?.VIDEO?.XP?.[id]) {
        return reply.code(404).send({ error: `Destination ${id} not found` });
      }
      try {
        this.emulator.server.MEDIA.VIDEO.XP.switch(`0:${id}`);
        return { success: true, id, connectedSource: '' };
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    // Route Endpoint
    this.app.put('/api/destinations/:id/route', async (request, reply) => {
      const { id } = request.params;
      const { source } = request.body;
      if (!this.emulator || !this.emulator.server?.MEDIA?.VIDEO?.XP?.[id]) {
        return reply.code(404).send({ error: `Destination ${id} not found` });
      }
      try {
        this.emulator.server.MEDIA.VIDEO.XP.switch(`${source}:${id}`);
        return { success: true, id, connectedSource: source };
      } catch (err) {
        return reply.code(400).send({ error: err.message });
      }
    });

    // Update DeviceMap
    this.app.put('/api/endpoints/:id', async (request, reply) => {
      const { id } = request.params;
      const { ipAddress, deviceLabel } = request.body;

      if (!this.emulator || !this.emulator.server?.ENDPOINTS?.DEVICEMAP?.[id]) {
        return reply.code(404).send({ error: `Endpoint ${id} not found` });
      }

      if (ipAddress !== undefined) {
        this.emulator.server.ENDPOINTS.DEVICEMAP[id].IpAddress = ipAddress;
        this.emulator.state.endpoints[id].IpAddress = ipAddress;
      }
      if (deviceLabel !== undefined) {
        this.emulator.server.ENDPOINTS.DEVICEMAP[id].DeviceLabel = deviceLabel;
        this.emulator.state.endpoints[id].DeviceLabel = deviceLabel;
      }

      return { success: true, endpoint: this.emulator.state.endpoints[id] };
    });
  }

  /**
   * Register TCP server control routes
   */
  registerTcpRoutes() {
    // POST /api/tcp/disable
    this.app.post('/api/tcp/disable', async (_request, _reply) => {
      if (!this.emulator || typeof this.emulator.stopTcpServer !== 'function') {
        return _reply.code(500).send({ error: 'Emulator instance not available' });
      }

      try {
        await this.emulator.stopTcpServer();
        return { success: true, message: 'TCP server disabled' };
      } catch (error) {
        console.error('Error disabling TCP server:', error);
        return _reply.code(500).send({ error: error.message || 'Failed to disable TCP server' });
      }
    });

    // POST /api/tcp/enable
    this.app.post('/api/tcp/enable', async (_request, _reply) => {
      if (!this.emulator || typeof this.emulator.startTcpServer !== 'function') {
        return _reply.code(500).send({ error: 'Emulator instance not available' });
      }

      try {
        await this.emulator.startTcpServer();
        return { success: true, message: 'TCP server enabled' };
      } catch (error) {
        console.error('Error enabling TCP server:', error);
        return _reply.code(500).send({ error: error.message || 'Failed to enable TCP server' });
      }
    });
  }

  /**
   * Start the web server
   */
  async start(port = 8081, host = '0.0.0.0') {
    try {
      await this.app.listen({
        port: port,
        host: host
      });
      console.log('='.repeat(50));
      console.log(`Web UI started on http://${host}:${port}`);
      console.log(`Access the control panel at: http://localhost:${port}`);
      console.log('='.repeat(50));
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.error(`Web UI port ${port} is already in use`);
        throw new Error(`Port ${port} already in use`);
      }
      throw error;
    }
  }

  /**
   * Close the web server gracefully
   */
  async close() {
    await this.app.close();
    console.log('Web UI server closed');
  }
}

module.exports = { WebServer };
