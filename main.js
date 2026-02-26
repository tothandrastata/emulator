require('dotenv').config();
const lwnoodle = require('lwnoodle');
const os = require('os');
const { WebServer } = require('./web/WebServer');

// Load configuration from .env file
const serverConfig = {
    host: process.env.LW3_HOST || '0.0.0.0',
    port: parseInt(process.env.LW3_PORT) || 6107
};

const webUIConfig = {
    host: process.env.WEB_UI_HOST || '0.0.0.0',
    port: parseInt(process.env.WEB_UI_PORT) || 8082,
    enabled: process.env.WEB_UI_ENABLED !== 'false'
};

// GVN MMU endpoints
const ENDPOINTS = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'];
const INPUTS = ['I101', 'I201', 'I301', 'I401'];
const OUTPUTS = ['O501', 'O601', 'O701', 'O801'];
const SOURCES = ['S101', 'S201', 'S301', 'S401'];
const DESTINATIONS = ['D501', 'D601', 'D701', 'D801'];

const emulator = {
    server: null,
    webServer: null,
    tcpServerEnabled: true,
    activeSockets: new Set(),
    connectedClients: new Set(),
    eventListeners: [],
    serverConfig: serverConfig,
    state: {}
};

function getNetworkAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({ name, address: iface.address });
            }
        }
    }
    return addresses;
}

function initializeNodeStructure(server, reuseState = null) {
    if (!emulator.state) emulator.state = {};
    if (reuseState) {
        emulator.state = reuseState;
    } else {
        // Initial Defaults
        emulator.state = {
            endpoints: {
                X1: { IpAddress: '192.168.0.101', DeviceLabel: 'Endpoint 1' },
                X2: { IpAddress: '192.168.0.102', DeviceLabel: 'Endpoint 2' },
                X3: { IpAddress: '192.168.0.103', DeviceLabel: 'Endpoint 3' },
                X4: { IpAddress: '192.168.0.104', DeviceLabel: 'Endpoint 4' },
                X5: { IpAddress: '192.168.0.105', DeviceLabel: 'Endpoint 5' },
                X6: { IpAddress: '192.168.0.106', DeviceLabel: 'Endpoint 6' },
                X7: { IpAddress: '192.168.0.107', DeviceLabel: 'Endpoint 7' },
                X8: { IpAddress: '192.168.0.108', DeviceLabel: 'Endpoint 8' },
            },
            inputs: {
                I101: { Connected: true, SignalPresent: true, SignalType: 'HDMI', UiIcon: 'hdmi' },
                I201: { Connected: false, SignalPresent: false, SignalType: 'N/A', UiIcon: 'hdmi' },
                I301: { Connected: false, SignalPresent: false, SignalType: 'N/A', UiIcon: 'hdmi' },
                I401: { Connected: false, SignalPresent: false, SignalType: 'N/A', UiIcon: 'hdmi' },
            },
            outputs: {
                O501: { Connected: true, SignalPresent: true, SignalType: 'HDMI', UiIcon: 'monitor' },
                O601: { Connected: true, SignalPresent: true, SignalType: 'HDMI', UiIcon: 'monitor' },
                O701: { Connected: true, SignalPresent: true, SignalType: 'HDMI', UiIcon: 'monitor' },
                O801: { Connected: true, SignalPresent: true, SignalType: 'HDMI', UiIcon: 'monitor' },
            },
            sources: {
                S101: { Name: 'Source 1', ActiveResolution: '1920x1080', RefreshRate: '60', ColorSpace: 'RGB' },
                S201: { Name: 'Source 2', ActiveResolution: '1920x1080', RefreshRate: '60', ColorSpace: 'RGB' },
                S301: { Name: 'Source 3', ActiveResolution: '1920x1080', RefreshRate: '60', ColorSpace: 'RGB' },
                S401: { Name: 'Source 4', ActiveResolution: '1920x1080', RefreshRate: '60', ColorSpace: 'RGB' },
            },
            destinations: {
                D501: { Name: 'Display 1', ActiveResolution: '3840x2160', RefreshRate: '60', ColorSpace: 'YUV444', ConnectedSource: 'S101' },
                D601: { Name: 'Display 2', ActiveResolution: '3840x2160', RefreshRate: '60', ColorSpace: 'YUV444', ConnectedSource: 'S101' },
                D701: { Name: 'Display 3', ActiveResolution: '3840x2160', RefreshRate: '60', ColorSpace: 'YUV444', ConnectedSource: 'S101' },
                D801: { Name: 'Display 4', ActiveResolution: '3840x2160', RefreshRate: '60', ColorSpace: 'YUV444', ConnectedSource: 'S101' },
            }
        };
    }

    // 1. MANAGEMENT
    server.MANAGEMENT = {
        DEVICE: {
            DeviceLabel: process.env.DEVICE_LABEL || 'SUPP-GVN-CONTROL1',
            HostName: process.env.HOST_NAME || 'SUPP-GVN-CONTROL1'
        },
        UID: {
            ProductName: server.ProductName,
            PartNumber: server.PartNumber,
            SerialNumber: server.SerialNumber,
            MacAddress: 'A8:D2:36:02:89:5A'
        },
        NETWORKINTERFACES: {},
        DATETIME: {},
        HEALTH: {},
        SERVICES: {}
    };
    server.MANAGEMENT.DEVICE.DeviceLabel__rw__ = true;
    server.MANAGEMENT.DEVICE.HostName__rw__ = true;

    // 2. ENDPOINTS/DEVICEMAP/*
    server.ENDPOINTS = {
        DEVICEMAP: {
            DeviceCount: ENDPOINTS.length,
            AutoAddEnabled: true,
            addDevice: (params) => { console.log('addDevice called', params); return 'OK'; },
            addAllDevices: () => { console.log('addAllDevices called'); return 'OK'; },
            swap: (params) => { console.log('swap called', params); return 'OK'; },
            removeDevice: (params) => { console.log('removeDevice called', params); return 'OK'; },
            removeAllDevice: () => { console.log('removeAllDevice called'); return 'OK'; },
            rebootAllDevice: () => { console.log('rebootAllDevice called'); return 'OK'; },
            rebootAllRequiredDevice: () => { console.log('rebootAllRequiredDevice called'); return 'OK'; }
        }
    };
    server.ENDPOINTS.DEVICEMAP.AutoAddEnabled__rw__ = true;

    ENDPOINTS.forEach(ep => {
        server.ENDPOINTS.DEVICEMAP[ep] = {
            IpAddress: emulator.state.endpoints[ep].IpAddress,
            DeviceLabel: emulator.state.endpoints[ep].DeviceLabel
        };
        server.ENDPOINTS.DEVICEMAP[ep].IpAddress__rw__ = true;
        server.ENDPOINTS.DEVICEMAP[ep].DeviceLabel__rw__ = true;
    });

    // 3. MEDIA/VIDEO/*
    server.MEDIA = { VIDEO: { XP: {} } };

    // Set XP methods
    server.MEDIA.VIDEO.XP.switch = (command) => handleXPSwitch(command);
    server.MEDIA.VIDEO.XP.switchAll = (command) => { console.log(`XP switchAll commanded: ${command}`); return 'OK'; };

    // Inputs (I)
    INPUTS.forEach(inp => {
        server.MEDIA.VIDEO[inp] = {
            Connected: emulator.state.inputs[inp].Connected,
            Name: 'HDMI in',
            UiIcon: emulator.state.inputs[inp].UiIcon,
            SignalPresent: emulator.state.inputs[inp].SignalPresent,
            SignalType: emulator.state.inputs[inp].SignalType,
            ActiveResolution: '0x0',
            RefreshRate: '0.00',
            COLOR: { ColorSpace: 'N/A' },
            TIMING: {},
            HDCP: {}
        };
        server.MEDIA.VIDEO[inp].Connected__rw__ = true;
        server.MEDIA.VIDEO[inp].Name__rw__ = true;
        server.MEDIA.VIDEO[inp].UiIcon__rw__ = true;
    });

    // Outputs (O)
    OUTPUTS.forEach(out => {
        server.MEDIA.VIDEO[out] = {
            Connected: emulator.state.outputs[out].Connected,
            Name: 'HDMI out',
            UiIcon: emulator.state.outputs[out].UiIcon,
            SignalPresent: emulator.state.outputs[out].SignalPresent,
            SignalType: emulator.state.outputs[out].SignalType,
            ActiveResolution: '1920x1080',
            RefreshRate: '60.00',
            COLOR: { ColorSpace: 'RGB' },
            TIMING: {},
            SCALING: {},
            HDCP: {},
            SCREEN: {}
        };
        server.MEDIA.VIDEO[out].Connected__rw__ = true;
        server.MEDIA.VIDEO[out].Name__rw__ = true;
        server.MEDIA.VIDEO[out].UiIcon__rw__ = true;
    });

    // Sources (S)
    SOURCES.forEach(src => {
        server.MEDIA.VIDEO[src] = {
            Name: emulator.state.sources[src].Name,
            ActiveResolution: emulator.state.sources[src].ActiveResolution,
            RefreshRate: emulator.state.sources[src].RefreshRate,
            COLOR: {
                ColorSpace: emulator.state.sources[src].ColorSpace
            }
        };
        server.MEDIA.VIDEO[src].Name__rw__ = true;
        server.MEDIA.VIDEO[src].ActiveResolution__rw__ = true;
        server.MEDIA.VIDEO[src].RefreshRate__rw__ = true;
        server.MEDIA.VIDEO[src].COLOR.ColorSpace__rw__ = true;
    });

    // Destinations (D)
    DESTINATIONS.forEach(dst => {
        server.MEDIA.VIDEO[dst] = {
            Name: emulator.state.destinations[dst].Name,
            ActiveResolution: emulator.state.destinations[dst].ActiveResolution,
            RefreshRate: emulator.state.destinations[dst].RefreshRate,
            COLOR: {
                ColorSpace: emulator.state.destinations[dst].ColorSpace
            }
        };
        server.MEDIA.VIDEO[dst].Name__rw__ = true;
        server.MEDIA.VIDEO[dst].ActiveResolution__rw__ = true;
        server.MEDIA.VIDEO[dst].RefreshRate__rw__ = true;
        server.MEDIA.VIDEO[dst].COLOR.ColorSpace__rw__ = true;

        // Destination under XP
        server.MEDIA.VIDEO.XP[dst] = {
            ConnectedSource: emulator.state.destinations[dst].ConnectedSource
        };
        server.MEDIA.VIDEO.XP[dst].ConnectedSource__rw__ = true;
    });
}

function handleXPSwitch(command) {
    console.log(`XP switch commanded: ${command}`);
    // Command format is SRC:DST (e.g. S101:D501 or 0:D501 for disconnect)
    if (!command.includes(':')) {
        throw new Error(`Invalid XP switch format ${command}`);
    }
    const [src, dst] = command.split(':');

    if (!DESTINATIONS.includes(dst)) {
        throw new Error(`Invalid destination ${dst}`);
    }
    if (src !== '0' && !SOURCES.includes(src)) {
        throw new Error(`Invalid source ${src}`);
    }

    const newSource = src === '0' ? '' : src;
    emulator.state.destinations[dst].ConnectedSource = newSource;
    emulator.server.MEDIA.VIDEO.XP[dst].ConnectedSource = newSource;

    console.log(`Routed ${newSource || 'Disconnected'} to ${dst}`);
}

function setupConnectionHandlers() {
    if (emulator.server && emulator.server.server && Array.isArray(emulator.server.server)) {
        emulator.server.server.forEach((serverConn) => {
            if (serverConn && serverConn.server) {
                serverConn.server.on('connection', (socket) => {
                    if (!emulator.tcpServerEnabled) {
                        socket.destroy();
                        return;
                    }
                    emulator.activeSockets.add(socket);
                    if (socket.remoteAddress) {
                        emulator.connectedClients.add(socket.remoteAddress);
                    }
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

function saveNodeState() {
    // Current memory state is stored in `emulator.state` 
    // Re-verify with actual server properties to catch any manual changes via LW3
    ENDPOINTS.forEach(ep => {
        emulator.state.endpoints[ep].IpAddress = emulator.server.ENDPOINTS.DEVICEMAP[ep].IpAddress;
        emulator.state.endpoints[ep].DeviceLabel = emulator.server.ENDPOINTS.DEVICEMAP[ep].DeviceLabel;
    });
    INPUTS.forEach(inp => {
        emulator.state.inputs[inp].Connected = emulator.server.MEDIA.VIDEO[inp].Connected;
        emulator.state.inputs[inp].SignalPresent = emulator.server.MEDIA.VIDEO[inp].SignalPresent;
        emulator.state.inputs[inp].SignalType = emulator.server.MEDIA.VIDEO[inp].SignalType;
        emulator.state.inputs[inp].UiIcon = emulator.server.MEDIA.VIDEO[inp].UiIcon;
    });
    OUTPUTS.forEach(out => {
        emulator.state.outputs[out].Connected = emulator.server.MEDIA.VIDEO[out].Connected;
        emulator.state.outputs[out].SignalPresent = emulator.server.MEDIA.VIDEO[out].SignalPresent;
        emulator.state.outputs[out].SignalType = emulator.server.MEDIA.VIDEO[out].SignalType;
        emulator.state.outputs[out].UiIcon = emulator.server.MEDIA.VIDEO[out].UiIcon;
    });
    SOURCES.forEach(src => {
        emulator.state.sources[src].Name = emulator.server.MEDIA.VIDEO[src].Name;
        emulator.state.sources[src].ActiveResolution = emulator.server.MEDIA.VIDEO[src].ActiveResolution;
        emulator.state.sources[src].RefreshRate = emulator.server.MEDIA.VIDEO[src].RefreshRate;
        emulator.state.sources[src].ColorSpace = emulator.server.MEDIA.VIDEO[src].COLOR.ColorSpace;
    });
    DESTINATIONS.forEach(dst => {
        emulator.state.destinations[dst].Name = emulator.server.MEDIA.VIDEO[dst].Name;
        emulator.state.destinations[dst].ActiveResolution = emulator.server.MEDIA.VIDEO[dst].ActiveResolution;
        emulator.state.destinations[dst].RefreshRate = emulator.server.MEDIA.VIDEO[dst].RefreshRate;
        emulator.state.destinations[dst].ColorSpace = emulator.server.MEDIA.VIDEO[dst].COLOR.ColorSpace;
        emulator.state.destinations[dst].ConnectedSource = emulator.server.MEDIA.VIDEO.XP[dst].ConnectedSource;
    });
    return emulator.state;
}

async function stopTcpServer() {
    if (!emulator.tcpServerEnabled) return;
    emulator.tcpServerEnabled = false;

    for (const socket of Array.from(emulator.activeSockets)) {
        try {
            if (socket && !socket.destroyed) socket.destroy();
        } catch (error) { }
    }
    emulator.activeSockets.clear();
    emulator.connectedClients.clear();

    if (emulator.server && emulator.server.server && Array.isArray(emulator.server.server)) {
        for (const serverConn of emulator.server.server) {
            if (serverConn && serverConn.server) {
                await new Promise((resolve) => {
                    if (serverConn.server.listening) {
                        serverConn.server.close(() => resolve());
                    } else resolve();
                });
            }
        }
    }
}

async function startTcpServer() {
    if (emulator.tcpServerEnabled) return;

    saveNodeState();

    if (emulator.server && typeof emulator.server.close === 'function') {
        await Promise.race([
            new Promise((resolve) => emulator.server.close(() => resolve())),
            new Promise((resolve) => setTimeout(resolve, 2000))
        ]);
    }

    emulator.activeSockets.clear();
    emulator.connectedClients.clear();

    emulator.server = lwnoodle.noodleServer(emulator.serverConfig);
    setServerProperties();
    initializeNodeStructure(emulator.server, emulator.state);
    setupConnectionHandlers();

    if (emulator.webServer) {
        emulator.webServer.updateServer(emulator.server);
    }
    emulator.tcpServerEnabled = true;
    console.log('TCP server restarted');
}

function isTcpServerEnabled() {
    return emulator.tcpServerEnabled;
}

function setServerProperties() {
    emulator.server.ManufacturerName = process.env.MANUFACTURER_NAME || "Lightware Visual Engineering";
    emulator.server.ProductName = process.env.PRODUCT_NAME || "GVN-MMU";
    emulator.server.PartNumber = process.env.PART_NUMBER || "91000000";
    emulator.server.SerialNumber = process.env.SERIAL_NUMBER || "EMULATOR_GVN";
    emulator.server.PackageVersion = process.env.PACKAGE_VERSION || "v1.0.0";
}

// Initial Start
emulator.server = lwnoodle.noodleServer(serverConfig);
setServerProperties();
initializeNodeStructure(emulator.server);
setupConnectionHandlers();

console.log('='.repeat(50));
console.log('GVN-MMU Emulator Server Started');
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
    console.log(`Server accessible at: localhost:${serverConfig.port}`);
}
console.log('='.repeat(50));

emulator.stopTcpServer = stopTcpServer;
emulator.startTcpServer = startTcpServer;
emulator.isTcpServerEnabled = isTcpServerEnabled;

if (webUIConfig.enabled) {
    emulator.webServer = new WebServer(emulator.server, webUIConfig, emulator);
    emulator.webServer.start(webUIConfig.port, webUIConfig.host).catch(err => {
        console.error('Failed to start Web UI:', err);
    });
}
