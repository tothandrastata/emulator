require('dotenv').config();
const lwnoodle = require('lwnoodle');
const os = require('os');
const { WebServer } = require('./web/WebServer');

// Load configuration from .env file
const serverConfig = {
    host: process.env.LW3_HOST || '0.0.0.0',
    port: parseInt(process.env.LW3_PORT) || 7107
};

const webUIConfig = {
    host: process.env.WEB_UI_HOST || '0.0.0.0',
    port: parseInt(process.env.WEB_UI_PORT) || 8081,
    enabled: process.env.WEB_UI_ENABLED !== 'false'
};

const matrixSize = parseInt(process.env.MATRIX_SIZE) || 3;

// Emulator state and methods
const emulator = {
    server: null,
    webServer: null,
    tcpServerEnabled: true, // Default: Enabled
    activeSockets: new Set(),
    connectedClients: new Set(),
    eventListeners: [],
    serverConfig: serverConfig,
    matrixSize: matrixSize,
    nodeStructure: null // Store original node structure (node names)
};

// Function to get network IP addresses
function getNetworkAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({ name, address: iface.address });
            }
        }
    }

    return addresses;
}

// Function to initialize node structure
function initializeNodeStructure(server, reuseNodeStructure = null) {
    const layers = ['VIDEO','AUDIO','USBICRON','USBHID'];

    // Generic nodes:
    const genericTxNode = {
        StreamAlias: "",
        SignalPresent: true,
        Enabled: true
    };

    const genericRxNode = {
        StreamAlias: "",
        SignalPresent: false,
        SourceStream: "",
        SourceStreamAlias: "",
    };

    // If we have a saved node structure, use it; otherwise create new one
    if (!reuseNodeStructure) {
        reuseNodeStructure = {};
        layers.forEach(layer => {
            reuseNodeStructure[layer] = { txNodes: [], rxNodes: [] };
        });
    }

    // Initializing nodes:
    layers.forEach(layer => {
        const txNodes = [];
        const rxNodes = [];

        // Create all TX and RX nodes
        for (let id=1; id<=matrixSize; id++) {
            let txNodeName, rxNodeName;
            
            // Use existing node names if available, otherwise generate new ones
            if (reuseNodeStructure[layer] && reuseNodeStructure[layer].txNodes[id-1]) {
                txNodeName = reuseNodeStructure[layer].txNodes[id-1].nodeName;
            } else {
                // generate random MAC for each device
                let txMacAddress = `${Math.random().toString(16).slice(2, 14).toUpperCase()}`;
                txNodeName = `${txMacAddress}_S0`;
            }
            
            if (reuseNodeStructure[layer] && reuseNodeStructure[layer].rxNodes[id-1]) {
                rxNodeName = reuseNodeStructure[layer].rxNodes[id-1].nodeName;
            } else {
                let rxMacAddress = `${Math.random().toString(16).slice(2, 14).toUpperCase()}`;
                rxNodeName = `${rxMacAddress}_D0`;
            }

            server.V1.MEDIA[layer][txNodeName] = { ...genericTxNode };
            server.V1.MEDIA[layer][txNodeName].StreamAlias = `TX${id}_S0`;
            txNodes.push({ id, nodeName: txNodeName, alias: `TX${id}_S0` });

            server.V1.MEDIA[layer][rxNodeName] = { ...genericRxNode };
            server.V1.MEDIA[layer][rxNodeName].StreamAlias = `RX${id}_D0`;
            rxNodes.push({ id, nodeName: rxNodeName, alias: `RX${id}_D0` });

            // Create Symlinked nodes under XP as well
            server.V1.MEDIA[layer].XP[txNodeName] = server.V1.MEDIA[layer][txNodeName];
            server.V1.MEDIA[layer].XP[rxNodeName] = server.V1.MEDIA[layer][rxNodeName];

            // Set RX SourceStream to Read/Write
            server.V1.MEDIA[layer][rxNodeName].SourceStream__rw__ = true;

            // only for testing purposes, allow TX SignalPresent to be set manually
            server.V1.MEDIA[layer][txNodeName].SignalPresent__rw__ = true;

            // If any TX signal present is changed then the connected RXs (can be multiple) signal present propoerties are to be updated accordingly.
            const handler = (path, prop, value) => {
                handleTxSignalPresentChange(layer, path, prop, value);
            };
            server.V1.MEDIA[layer][txNodeName].on('SignalPresent', handler);
            emulator.eventListeners.push({
                target: server.V1.MEDIA[layer][txNodeName],
                event: 'SignalPresent',
                handler: handler
            });
        }

        // Store node structure for future reuse
        if (!emulator.nodeStructure) {
            emulator.nodeStructure = {};
        }
        if (!emulator.nodeStructure[layer]) {
            emulator.nodeStructure[layer] = { txNodes: [], rxNodes: [] };
        }
        emulator.nodeStructure[layer].txNodes = txNodes;
        emulator.nodeStructure[layer].rxNodes = rxNodes;

        // Connect each RX to its corresponding TX by default (O1->I1, O2->I2, O3->I3)
        for (let i = 0; i < rxNodes.length; i++) {
            const rxNode = rxNodes[i];
            const txNode = txNodes[i];

            server.V1.MEDIA[layer][rxNode.nodeName].SourceStream = txNode.nodeName;
            server.V1.MEDIA[layer][rxNode.nodeName].SourceStreamAlias = txNode.alias;
            // Copy signal present from TX to RX
            server.V1.MEDIA[layer][rxNode.nodeName].SignalPresent = server.V1.MEDIA[layer][txNode.nodeName].SignalPresent;

            console.log(`${layer}: Connected ${rxNode.alias} to ${txNode.alias}`);
        }

        // Implement the XP switch command
        server.V1.MEDIA[layer].XP = {
            switch: (command) => handleXPSwitch(layer, command)
        };
    });
}

// Function to setup connection handlers for socket tracking
function setupConnectionHandlers() {
    if (emulator.server && emulator.server.server && Array.isArray(emulator.server.server)) {
        emulator.server.server.forEach((serverConn) => {
            if (serverConn && serverConn.server) {
                serverConn.server.on('connection', (socket) => {
                    // Reject if disabled
                    if (!emulator.tcpServerEnabled) {
                        socket.destroy();
                        return;
                    }

                    // Track socket object (not just IP!)
                    emulator.activeSockets.add(socket);
                    if (socket.remoteAddress) {
                        emulator.connectedClients.add(socket.remoteAddress);
                    }

                    // Cleanup on disconnect
                    const cleanup = () => {
                        emulator.activeSockets.delete(socket);
                        if (socket.remoteAddress) {
                            emulator.connectedClients.delete(socket.remoteAddress);
                        }
                    };
                    socket.on('close', cleanup);
                    socket.on('error', cleanup);
                });
            }
        });
    }
}

// Function to save node state
function saveNodeState() {
    const state = {};
    const nodeStructure = {}; // Also save node structure for recreation
    const layers = ['VIDEO','AUDIO','USBICRON','USBHID'];
    
    if (!emulator.server || !emulator.server.V1 || !emulator.server.V1.MEDIA) {
        return { state, nodeStructure };
    }

    layers.forEach(layer => {
        if (emulator.server.V1.MEDIA[layer]) {
            const mediaJson = emulator.server.V1.MEDIA[layer].toJSON();
            state[layer] = {};
            nodeStructure[layer] = { txNodes: [], rxNodes: [] };
            
            Object.keys(mediaJson).forEach(nodeName => {
                const node = mediaJson[nodeName];
                if (nodeName.endsWith('_S0')) {
                    state[layer][nodeName] = {
                        StreamAlias: node.StreamAlias,
                        SignalPresent: node.SignalPresent,
                        Enabled: node.Enabled,
                        SourceStream: node.SourceStream,
                        SourceStreamAlias: node.SourceStreamAlias
                    };
                    // Extract ID from StreamAlias (e.g., "TX1_S0" -> id: 1)
                    const match = node.StreamAlias.match(/TX(\d+)_S0/);
                    if (match) {
                        const id = parseInt(match[1]);
                        nodeStructure[layer].txNodes[id - 1] = { id, nodeName, alias: node.StreamAlias };
                    }
                } else if (nodeName.endsWith('_D0')) {
                    state[layer][nodeName] = {
                        StreamAlias: node.StreamAlias,
                        SignalPresent: node.SignalPresent,
                        Enabled: node.Enabled,
                        SourceStream: node.SourceStream,
                        SourceStreamAlias: node.SourceStreamAlias
                    };
                    // Extract ID from StreamAlias (e.g., "RX1_D0" -> id: 1)
                    const match = node.StreamAlias.match(/RX(\d+)_D0/);
                    if (match) {
                        const id = parseInt(match[1]);
                        nodeStructure[layer].rxNodes[id - 1] = { id, nodeName, alias: node.StreamAlias };
                    }
                }
            });
        }
    });

    return { state, nodeStructure };
}

// Function to restore node state
function restoreNodeState(savedData) {
    if (!savedData || !savedData.state || !emulator.server || !emulator.server.V1 || !emulator.server.V1.MEDIA) {
        return;
    }

    const state = savedData.state;
    Object.keys(state).forEach(layer => {
        if (emulator.server.V1.MEDIA[layer] && state[layer]) {
            Object.keys(state[layer]).forEach(nodeName => {
                const nodeState = state[layer][nodeName];
                const node = emulator.server.V1.MEDIA[layer][nodeName];
                if (node && nodeState) {
                    if (nodeState.SignalPresent !== undefined) node.SignalPresent = nodeState.SignalPresent;
                    if (nodeState.Enabled !== undefined) node.Enabled = nodeState.Enabled;
                    if (nodeState.SourceStream !== undefined) node.SourceStream = nodeState.SourceStream;
                    if (nodeState.SourceStreamAlias !== undefined) node.SourceStreamAlias = nodeState.SourceStreamAlias;
                }
            });
        }
    });
}

// Function to stop TCP server
async function stopTcpServer() {
    if (!emulator.tcpServerEnabled) {
        return; // Already disabled
    }

    // CRITICAL: Set state FIRST to prevent new connections
    emulator.tcpServerEnabled = false;

    // Close all active socket connections
    const socketCount = emulator.activeSockets.size;
    if (socketCount > 0) {
        console.log(`Closing ${socketCount} active TCP connections`);
        for (const socket of Array.from(emulator.activeSockets)) {
            try {
                if (socket && !socket.destroyed) {
                    socket.destroy(); // Force close
                }
            } catch (error) {
                // Ignore errors on already-closed sockets
            }
        }
        emulator.activeSockets.clear();
    }

    // Clear client tracking
    emulator.connectedClients.clear();

    // Close the TCP server listener
    if (emulator.server && emulator.server.server && Array.isArray(emulator.server.server)) {
        for (const serverConn of emulator.server.server) {
            if (serverConn && serverConn.server) {
                await new Promise((resolve) => {
                    if (serverConn.server.listening) {
                        serverConn.server.close(() => {
                            console.log('TCP server listener closed');
                            resolve();
                        });
                    } else {
                        resolve(); // Already closed
                    }
                });
            }
        }
    }
}

// Function to start TCP server
async function startTcpServer() {
    if (emulator.tcpServerEnabled) {
        return; // Already enabled
    }

    // Save current node state and structure
    const savedData = saveNodeState();
    const nodeState = savedData.state;
    const savedNodeStructure = savedData.nodeStructure;

    // Remove all event listeners
    for (const { target, event, handler } of emulator.eventListeners) {
        try {
            if (target && typeof target.removeListener === 'function') {
                target.removeListener(event, handler);
            }
        } catch (error) {
            // Ignore errors
        }
    }
    emulator.eventListeners = [];

    // Close old server with timeout to prevent hanging
    if (emulator.server && typeof emulator.server.close === 'function') {
        await Promise.race([
            new Promise((resolve) => {
                emulator.server.close(() => resolve());
            }),
            new Promise((resolve) => {
                setTimeout(() => {
                    console.warn('Server close timeout - continuing anyway');
                    resolve();
                }, 2000); // 2 second timeout
            })
        ]);
    }

    // Clear old socket references
    emulator.activeSockets.clear();
    emulator.connectedClients.clear();

    // Create new server
    emulator.server = lwnoodle.noodleServer(emulator.serverConfig);
    emulator.server.APPLICATION.Name = 'TPN_MMU Emulator';
    emulator.server.ManufacturerName = process.env.MANUFACTURER_NAME || "Lightware Visual Engineering";
    emulator.server.ProductName = process.env.PRODUCT_NAME || "TPN-MMU-X100";
    emulator.server.PartNumber = process.env.PART_NUMBER || "91710013";
    emulator.server.SerialNumber = process.env.SERIAL_NUMBER || "EMULATOR";
    emulator.server.PackageVersion = process.env.PACKAGE_VERSION || "v0.0.0";

    // Reinitialize everything - reuse saved node structure to preserve node names
    initializeNodeStructure(emulator.server, savedNodeStructure);
    setupConnectionHandlers();
    restoreNodeState(savedData);

    // Update web server reference
    if (emulator.webServer) {
        emulator.webServer.updateServer(emulator.server);
    }

    emulator.tcpServerEnabled = true;
    console.log('TCP server enabled');
}

// Function to check if TCP server is enabled
function isTcpServerEnabled() {
    return emulator.tcpServerEnabled;
}

// Initialize LW3 server
emulator.server = lwnoodle.noodleServer(serverConfig);
emulator.server.APPLICATION.Name = 'TPN_MMU Emulator';
emulator.server.ManufacturerName = process.env.MANUFACTURER_NAME || "Lightware Visual Engineering";
emulator.server.ProductName = process.env.PRODUCT_NAME || "TPN-MMU-X100";
emulator.server.PartNumber = process.env.PART_NUMBER || "91710013";
emulator.server.SerialNumber = process.env.SERIAL_NUMBER || "EMULATOR";
emulator.server.PackageVersion = process.env.PACKAGE_VERSION || "v0.0.0";

// Initialize node structure
initializeNodeStructure(emulator.server);
setupConnectionHandlers();

// Log server information
console.log('='.repeat(50));
console.log('TPN_MMU Emulator Server Started');
console.log('='.repeat(50));
console.log(`Binding Address: ${serverConfig.host}`);
console.log(`Server Port: ${serverConfig.port}`);
console.log('-'.repeat(50));

const networkAddresses = getNetworkAddresses();
if (networkAddresses.length > 0) {
    console.log('Server accessible at:');
    networkAddresses.forEach(({ name, address }) => {
        console.log(`  ${address}:${serverConfig.port} (${name})`);
    });
} else {
    console.log('No external network interfaces found.');
    console.log(`Server accessible at: localhost:${serverConfig.port}`);
}

console.log('='.repeat(50));

// Find the node of the layer that contains the given StreamAlias
const findNodeByStreamAlias = (layer, StreamAlias) => {
    if (!emulator.server || !emulator.server.V1 || !emulator.server.V1.MEDIA || !emulator.server.V1.MEDIA[layer]) {
        return null;
    }
    const mediaJson = emulator.server.V1.MEDIA[layer].toJSON();
    for (const [nodeName, node] of Object.entries(mediaJson)) {
        if (node.StreamAlias === StreamAlias) {
            return nodeName;
        }
    }
    return null;
};

// Function to handle XP switch command
const handleXPSwitch = (layer, command) => {
    console.log(`XP command received for ${layer}: ${command}`);

    // command format:  <SRC_STREAM_ID>:<DEST_STREAM_ID>
    // example MAIN_TX1_S0:MAIN_RX1_D0
    // Throw exception if format is invalid
    if (!command.includes(':')) {
        throw new Error(`Invalid XP command format: ${command}`);
    }

    // Get source and destination from command
    const [src, dest] = command.split(':');

    // Check if the source exists among the "_S0" as StreamAlias in the layer
    const srcNodeName = findNodeByStreamAlias(layer, src);
    if (!srcNodeName || !srcNodeName?.endsWith('_S0')) {
        throw new Error(`Source stream ${src} not found in layer ${layer}`);
    }

    // Check if the destination exists among the "_D0" as StreamAlias in the layer
    const destNodeName = findNodeByStreamAlias(layer, dest);
    if (!destNodeName || !destNodeName?.endsWith('_D0')) {
        throw new Error(`Destination stream ${dest} not found in layer ${layer}`);
    }

 
    // OK, now we can set the SourceStream of the destination to the source
    if (!emulator.server || !emulator.server.V1 || !emulator.server.V1.MEDIA || !emulator.server.V1.MEDIA[layer]) {
        throw new Error(`Layer ${layer} not found`);
    }
    emulator.server.V1.MEDIA[layer][destNodeName].SourceStream = srcNodeName;
    emulator.server.V1.MEDIA[layer][destNodeName].SourceStreamAlias = src;
    console.log(`Switched ${dest} to source ${src}`);

    // If signal is present on the source, set it on the destination as well
    const signalPresent = emulator.server.V1.MEDIA[layer][srcNodeName].SignalPresent;
    emulator.server.V1.MEDIA[layer][destNodeName].SignalPresent = signalPresent;
};

// Function to handle TX SignalPresent changes and propagate to connected RXs
const handleTxSignalPresentChange = (layer, path, prop, value) => {
    if (!emulator.server || !emulator.server.V1 || !emulator.server.V1.MEDIA || !emulator.server.V1.MEDIA[layer]) {
        return;
    }
    // Find all RXs connected to this TX
    // Get the TX name from the path like "/V1/TPNAPP/MEDIA/VIDEO/MAIN_TX1_S0"
    // txStreamAlias is like MAIN_TX1_S0
    const txStreamAlias = path.split('/').pop();
    console.log(`SignalPresent changed on ${txStreamAlias} to ${value}`);

    Object.keys(emulator.server.V1.MEDIA[layer]).forEach(nodeName => {
        const node = emulator.server.V1.MEDIA[layer][nodeName];
        // console.log(`Checking node ${nodeName} with SourceStream ${node.SourceStream}`);
        if (nodeName.endsWith('_D0') && node.SourceStream === txStreamAlias) {
            console.log(`Updating SignalPresent on ${nodeName} to ${value}`);
            node.SignalPresent = value;
        }
    });
};

// Attach methods to emulator object (before creating WebServer)
emulator.stopTcpServer = stopTcpServer;
emulator.startTcpServer = startTcpServer;
emulator.isTcpServerEnabled = isTcpServerEnabled;

// Initialize and start the web server
if (webUIConfig.enabled) {
    emulator.webServer = new WebServer(emulator.server, webUIConfig, emulator);
    emulator.webServer.start(webUIConfig.port, webUIConfig.host).catch(err => {
        console.error('Failed to start Web UI:', err);
    });
}
