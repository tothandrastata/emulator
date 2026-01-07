const Fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const fastifyCors = require('@fastify/cors');
const path = require('path');

/**
 * Web Server for TPN-MMU Emulator
 * Provides a REST API and web-based control interface
 */
class WebServer {
  constructor(noodleServer, config) {
    this.noodleServer = noodleServer;
    this.config = config;
    this.app = Fastify({ logger: false });

    this.setupMiddleware();
    this.setupRoutes();
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
    this.registerLayerRoutes();
  }

  /**
   * Register status route
   */
  registerStatusRoute() {
    this.app.get('/api/status', async (_request, _reply) => {
      return {
        productName: this.noodleServer.ProductName,
        partNumber: this.noodleServer.PartNumber,
        serialNumber: this.noodleServer.SerialNumber,
        packageVersion: this.noodleServer.PackageVersion,
        matrixSize: 3
      };
    });
  }

  /**
   * Register layer-specific routes (VIDEO, AUDIO, USBICRON, USBHID)
   */
  registerLayerRoutes() {
    // GET /api/layer/:layer/inputs - Get all TX (input) nodes for a layer
    this.app.get('/api/layer/:layer/inputs', async (request, _reply) => {
      const { layer } = request.params;
      const inputs = [];
      const mediaLayer = this.noodleServer.V1?.MEDIA?.[layer];

      if (!mediaLayer) {
        return { inputs: [] };
      }

      const mediaJson = mediaLayer.toJSON();
      Object.keys(mediaJson).forEach(nodeName => {
        if (nodeName.endsWith('_S0')) {
          const node = mediaJson[nodeName];
          inputs.push({
            nodeName: nodeName,
            alias: node.StreamAlias,
            signalPresent: node.SignalPresent === 'true' || node.SignalPresent === true,
            enabled: node.Enabled === 'true' || node.Enabled === true
          });
        }
      });

      return { inputs };
    });

    // GET /api/layer/:layer/outputs - Get all RX (output) nodes for a layer
    this.app.get('/api/layer/:layer/outputs', async (request, _reply) => {
      const { layer } = request.params;
      const outputs = [];
      const mediaLayer = this.noodleServer.V1?.MEDIA?.[layer];

      if (!mediaLayer) {
        return { outputs: [] };
      }

      const mediaJson = mediaLayer.toJSON();
      Object.keys(mediaJson).forEach(nodeName => {
        if (nodeName.endsWith('_D0')) {
          const node = mediaJson[nodeName];
          outputs.push({
            nodeName: nodeName,
            alias: node.StreamAlias,
            signalPresent: node.SignalPresent === 'true' || node.SignalPresent === true,
            sourceStream: node.SourceStream || '',
            sourceStreamAlias: node.SourceStreamAlias || ''
          });
        }
      });

      return { outputs };
    });

    // GET /api/layer/:layer/crosspoint - Get crosspoint matrix for a layer
    this.app.get('/api/layer/:layer/crosspoint', async (request, _reply) => {
      const { layer } = request.params;
      const matrix = [];
      const inputs = [];
      const mediaLayer = this.noodleServer.V1?.MEDIA?.[layer];

      if (!mediaLayer) {
        return { matrix: [], inputs: [] };
      }

      const mediaJson = mediaLayer.toJSON();

      // Collect inputs (TX nodes)
      Object.keys(mediaJson).forEach(nodeName => {
        if (nodeName.endsWith('_S0')) {
          const node = mediaJson[nodeName];
          inputs.push({
            nodeName: nodeName,
            alias: node.StreamAlias,
            signalPresent: node.SignalPresent === 'true' || node.SignalPresent === true
          });
        }
      });

      // Collect outputs (RX nodes) with their connections
      Object.keys(mediaJson).forEach(nodeName => {
        if (nodeName.endsWith('_D0')) {
          const node = mediaJson[nodeName];
          matrix.push({
            nodeName: nodeName,
            alias: node.StreamAlias,
            sourceStream: node.SourceStream || '',
            sourceStreamAlias: node.SourceStreamAlias || '',
            signalPresent: node.SignalPresent === 'true' || node.SignalPresent === true
          });
        }
      });

      return { matrix, inputs };
    });

    // PUT /api/layer/:layer/inputs/:alias/signal - Set SignalPresent for an input
    this.app.put('/api/layer/:layer/inputs/:alias/signal', async (request, reply) => {
      const { layer, alias } = request.params;
      const { signalPresent } = request.body;

      // Validate request body
      if (typeof signalPresent !== 'boolean') {
        return reply.code(400).send({ error: 'signalPresent must be a boolean' });
      }

      const mediaLayer = this.noodleServer.V1?.MEDIA?.[layer];
      if (!mediaLayer) {
        return reply.code(404).send({ error: `Layer ${layer} not found` });
      }

      // Find the node by StreamAlias
      const mediaJson = mediaLayer.toJSON();
      let foundNodeName = null;

      Object.keys(mediaJson).forEach(nodeName => {
        if (nodeName.endsWith('_S0') && mediaJson[nodeName].StreamAlias === alias) {
          foundNodeName = nodeName;
        }
      });

      if (!foundNodeName) {
        return reply.code(404).send({ error: `Input ${alias} not found in layer ${layer}` });
      }

      // Set SignalPresent (triggers event listeners in emulator)
      mediaLayer[foundNodeName].SignalPresent = signalPresent;

      console.log(`Web UI: Set ${layer} input ${alias} SignalPresent to ${signalPresent}`);

      return {
        nodeName: foundNodeName,
        alias: alias,
        signalPresent: mediaLayer[foundNodeName].SignalPresent
      };
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
