require('dotenv').config();
const lwnoodle = require('lwnoodle');
const { WebServer } = require('./web/WebServer');

// --- Configuration ---
const PORT = process.env.LW3_PORT || 6107;
const WEB_PORT = 8082;
const INPUT_COUNT = 4;
const OUTPUT_COUNT = 4;

const INPUTS = Array.from({ length: INPUT_COUNT }, (_, i) => `I${101 + i * 100}`);
const OUTPUTS = Array.from({ length: OUTPUT_COUNT }, (_, i) => `O${501 + i * 100}`);

const emulator = {
    server: null,
    webServer: null,
    tcpServerEnabled: true,
    state: {
        inputs: {},
        outputs: {},
        xp: {}, // Dxxx -> Sxxx
        endpoints: {},
        sources: {},
        destinations: {}
    },
    // Mock TCP control for Web UI
    startTcpServer: async function () {
        console.log('Mock TCP Server: STARTING');
        this.tcpServerEnabled = true;
        return true;
    },
    stopTcpServer: async function () {
        console.log('Mock TCP Server: STOPPING');
        this.tcpServerEnabled = false;
        return true;
    },
    isTcpServerEnabled: function () {
        return this.tcpServerEnabled;
    },
    serverConfig: { port: PORT }
};

// Default State
INPUTS.forEach((inp, idx) => {
    emulator.state.inputs[inp] = { SignalPresent: idx === 0, Connected: true };
    const sAlias = `S${inp.substring(1)}`;
    emulator.state.sources[sAlias] = {
        Name: `Source ${idx + 1}`,
        ActiveResolution: '1920x1080',
        RefreshRate: 60
    };
});

OUTPUTS.forEach((out, idx) => {
    const dAlias = `D${out.substring(1)}`;
    const sAlias = `S${INPUTS[0].substring(1)}`;
    emulator.state.outputs[out] = { SignalPresent: false, Connected: true };
    emulator.state.xp[dAlias] = sAlias;
    emulator.state.destinations[dAlias] = {
        Name: `Destination ${idx + 1}`,
        ActiveResolution: '1920x1080',
        RefreshRate: 60,
        ConnectedSource: sAlias
    };
});

// Initialize Endpoints DEVICEMAP
for (let i = 1; i <= 8; i++) {
    const ep = `P${i}`;
    emulator.state.endpoints[ep] = {
        IpAddress: '0.0.0.0',
        DeviceLabel: `Device ${i}`
    };
}

function updateSignalPropagation() {
    console.log('--- Propagation Update ---');
    OUTPUTS.forEach(out => {
        const dAlias = `D${out.substring(1)}`;
        const sAlias = emulator.state.xp[dAlias];
        const inp = sAlias ? 'I' + sAlias.substring(1) : null;

        let signal = false;
        if (inp && emulator.state.inputs[inp]) {
            signal = emulator.state.inputs[inp].SignalPresent;
            console.log(`[PROP] ${out} (${dAlias}) <- ${sAlias} (${inp}): ${signal}`);
        }

        emulator.state.outputs[out].SignalPresent = signal;
        if (emulator.server && emulator.server.MEDIA && emulator.server.MEDIA.VIDEO && emulator.server.MEDIA.VIDEO[out]) {
            emulator.server.MEDIA.VIDEO[out].SignalPresent = signal;
        }

        // Update destination state for UI
        if (emulator.state.destinations[dAlias]) {
            emulator.state.destinations[dAlias].ConnectedSource = sAlias || '0';
        }
    });
    console.log('--------------------------');
}

function handleXPSwitch(command) {
    if (typeof command !== 'string' || !command.includes(':')) {
        console.error('LW3 XP SWITCH ERROR: Invalid format', command);
        throw new Error('Invalid format');
    }
    const [src, dest] = command.split(':');
    console.log(`LW3 CALL: switch ${src} -> ${dest}`);

    // Handle disconnect (source "0")
    if (src === '0' || src === 'S0' || !src) {
        emulator.state.xp[dest] = null;
    } else {
        emulator.state.xp[dest] = src;
    }

    updateSignalPropagation();
}

function handleXPSwitchAll(command) {
    console.log(`LW3 CALL: switchAll to ${command}`);
    Object.keys(emulator.state.xp).forEach(d => {
        if (command === '0' || command === 'S0' || !command) {
            emulator.state.xp[d] = null;
        } else {
            emulator.state.xp[d] = command;
        }
    });
    updateSignalPropagation();
}

function initServer() {
    const server = lwnoodle.noodleServer(parseInt(PORT));
    emulator.server = server;

    server.ProductName = 'GVN-MMU-X400';
    server.ManufacturerName = 'Lightware';
    server.PartNumber = '91710013';
    server.SerialNumber = 'EMULATOR-GVN';
    server.PackageVersion = '1.0.0';

    // Endpoints
    server.ENDPOINTS = { DEVICEMAP: {} };
    Object.entries(emulator.state.endpoints).forEach(([id, ep]) => {
        server.ENDPOINTS.DEVICEMAP[id] = {
            IpAddress: ep.IpAddress, IpAddress__rw__: true,
            DeviceLabel: ep.DeviceLabel, DeviceLabel__rw__: true
        };
    });

    server.MEDIA = { VIDEO: {} };
    server.MEDIA.VIDEO.XP = {
        'switch__method__': handleXPSwitch,
        'switchAll__method__': handleXPSwitchAll,
        // Expose as direct functions for WebServer.js
        'switch': handleXPSwitch,
        'switchAll': handleXPSwitchAll
    };


    // Add S/D aliases to XP node
    INPUTS.forEach(inp => server.MEDIA.VIDEO.XP[`S${inp.substring(1)}`] = { StreamAlias: inp });
    OUTPUTS.forEach(out => server.MEDIA.VIDEO.XP[`D${out.substring(1)}`] = { StreamAlias: out });

    // Inputs with Custom Property logic
    INPUTS.forEach(inp => {
        server.MEDIA.VIDEO[inp] = {
            Connected: true, Connected__rw__: true,
            Name: 'HDMI in', Name__rw__: true,
            SignalType: 'HDMI',
            SignalPresent: emulator.state.inputs[inp].SignalPresent,
            SignalPresent__rw__: true
        };

        // Inject custom behaviors into the lwnoodle internal engine
        const node = server.MEDIA.VIDEO[inp];
        const inner = node.__inner__;
        if (inner && inner.properties['SignalPresent']) {
            inner.properties['SignalPresent'].setter = function (v) {
                const newVal = (v === 'true' || v === true);
                console.log(`LW3 SET: ${inp}.SignalPresent -> ${newVal}`);
                if (emulator.state.inputs[inp].SignalPresent !== newVal) {
                    emulator.state.inputs[inp].SignalPresent = newVal;
                    updateSignalPropagation();
                }
            };
        }
    });

    // Outputs
    OUTPUTS.forEach(out => {
        server.MEDIA.VIDEO[out] = {
            Connected: true, Connected__rw__: true,
            Name: 'HDMI out', Name__rw__: true,
            SignalPresent: emulator.state.outputs[out].SignalPresent,
            SignalType: 'HDMI'
        };
    });

    console.log('GVN-MMU Server Started on Port', PORT);
    updateSignalPropagation();
}

function startWebUI() {
    emulator.updateSignalPropagation = updateSignalPropagation;
    emulator.webServer = new WebServer(emulator.server, { port: WEB_PORT }, emulator);
    emulator.webServer.start(WEB_PORT).catch(err => {
        console.error('Web UI failed to start:', err);
    });
}

try {
    initServer();
    startWebUI();
} catch (e) {
    console.error('Startup failed:', e);
}

