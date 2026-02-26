require('dotenv').config();
const lwnoodle = require('lwnoodle');
const express = require('express');
const path = require('path');

// --- Configuration ---
const PORT = process.env.LW3_PORT || 6107;
const WEB_PORT = 8082;
const INPUT_COUNT = 4;
const OUTPUT_COUNT = 4;

const INPUTS = Array.from({ length: INPUT_COUNT }, (_, i) => `I${101 + i * 100}`);
const OUTPUTS = Array.from({ length: OUTPUT_COUNT }, (_, i) => `O${501 + i * 100}`);

const emulator = {
    state: {
        inputs: {},
        outputs: {},
        xp: {} // Dxxx -> Sxxx
    }
};

// Default State
INPUTS.forEach((inp, idx) => {
    emulator.state.inputs[inp] = { SignalPresent: idx === 0, Connected: true };
});

OUTPUTS.forEach(out => {
    const dAlias = `D${out.substring(1)}`;
    const sAlias = `S${INPUTS[0].substring(1)}`;
    emulator.state.outputs[out] = { SignalPresent: false, Connected: true };
    emulator.state.xp[dAlias] = sAlias;
});

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
        if (global.server && global.server.MEDIA && global.server.MEDIA.VIDEO && global.server.MEDIA.VIDEO[out]) {
            global.server.MEDIA.VIDEO[out].SignalPresent = signal;
        }
    });
    console.log('--------------------------');
}

function handleXPSwitch(command) {
    if (typeof command !== 'string' || !command.includes(':')) throw new Error('Invalid format');
    const [src, dest] = command.split(':');
    console.log(`LW3 CALL: switch ${src} -> ${dest}`);
    emulator.state.xp[dest] = src;
    updateSignalPropagation();
}

function handleXPSwitchAll(command) {
    console.log(`LW3 CALL: switchAll to ${command}`);
    Object.keys(emulator.state.xp).forEach(d => {
        emulator.state.xp[d] = command;
    });
    updateSignalPropagation();
}

function initServer() {
    const server = lwnoodle.noodleServer(parseInt(PORT));
    global.server = server;

    server.ProductName = 'GVN-MMU-X400';
    server.ManufacturerName = 'Lightware';

    // Endpoints
    server.ENDPOINTS = { DEVICEMAP: {} };
    for (let i = 1; i <= 8; i++) {
        const ep = `P${i}`;
        server.ENDPOINTS.DEVICEMAP[ep] = {
            IpAddress: '0.0.0.0', IpAddress__rw__: true,
            DeviceLabel: `Device ${i}`, DeviceLabel__rw__: true
        };
    }

    server.MEDIA = { VIDEO: {} };
    server.MEDIA.VIDEO.XP = {
        'switch__method__': handleXPSwitch,
        'switchAll__method__': handleXPSwitchAll
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
    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'web/static')));
    app.get('/api/state', (req, res) => res.json(emulator.state));
    app.post('/api/input/:id/signal', (req, res) => {
        const { id } = req.params;
        const { present } = req.body;
        if (emulator.state.inputs[id]) {
            emulator.state.inputs[id].SignalPresent = present;
            updateSignalPropagation();
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    });
    app.listen(WEB_PORT, () => console.log(`Web UI: http://localhost:${WEB_PORT}`));
}

try {
    initServer();
    startWebUI();
} catch (e) {
    console.error('Startup failed:', e);
}
