const lwnoodle = require('lwnoodle');
const os = require('os');
const serverConfig = {host:'0.0.0.0', port:6107};
const server = lwnoodle.noodleServer(serverConfig);
server.APPLICATION.Name = 'TPN_MMU Emulator';
server.ManufacturerName="Lightware Visual Engineering";
server.ProductName="TPN-MMU-X100";
server.PartNumber="91710013";
server.SerialNumber="EMULATOR"
server.PackageVersion="v0.0.0";

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

const layers = ['VIDEO','AUDIO','USBICRON','USBHID']

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

const matrixSize = 3; // 3x3 matrix

// Initializing nodes:
layers.forEach(layer => {
    for (let id=1; id<=matrixSize; id++) {
        // generate random MAC for each device 
        let txMacAddress = `${Math.random().toString(16).slice(2, 14).toUpperCase()}`;
        server.V1.MEDIA[layer][`${txMacAddress}_S0`] = genericTxNode;
        server.V1.MEDIA[layer][`${txMacAddress}_S0`].StreamAlias = `TX${id}_S0`;
        
        let rxMacAddress = `${Math.random().toString(16).slice(2, 14).toUpperCase()}`;
        server.V1.MEDIA[layer][`${rxMacAddress}_D0`] = genericRxNode;
        server.V1.MEDIA[layer][`${rxMacAddress}_D0`].StreamAlias = `RX${id}_D0`;

        // Create Symlinked nodes under XP as well
        server.V1.MEDIA[layer].XP[`${txMacAddress}_S0`] = server.V1.MEDIA[layer][`${txMacAddress}_S0`];
        server.V1.MEDIA[layer].XP[`${rxMacAddress}_D0`] = server.V1.MEDIA[layer][`${rxMacAddress}_D0`];
  
        // Set RX SourceStream to Read/Write
        server.V1.MEDIA[layer][`${rxMacAddress}_D0`].SourceStream__rw__ = true;

        // only for testing purposes, allow TX SignalPresent to be set manually
        server.V1.MEDIA[layer][`${txMacAddress}_S0`].SignalPresent__rw__ = true;
        
        // Implement the XP switch command
        server.V1.MEDIA[layer].XP = {
            switch: (command) => handleXPSwitch(layer, command)
        };

        // If any TX signal present is changed then the connected RXs (can be multiple) signal present propoerties are to be updated accordingly.
        server.V1.MEDIA[layer][`${txMacAddress}_S0`].on('SignalPresent', (path, prop, value) => {
            handleTxSignalPresentChange(layer, path, prop, value);
        });
    }
});

// Find the node of the layer that contains the given StreamAlias
const findNodeByStreamAlias = (layer, StreamAlias) => {
    const mediaJson = server.V1.MEDIA[layer].toJSON();
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
    server.V1.MEDIA[layer][destNodeName].SourceStream = srcNodeName;
    server.V1.MEDIA[layer][destNodeName].SourceStreamAlias = src;
    console.log(`Switched ${dest} to source ${src}`);

    // If signal is present on the source, set it on the destination as well
    const signalPresent = server.V1.MEDIA[layer][srcNodeName].SignalPresent;
    server.V1.MEDIA[layer][destNodeName].SignalPresent = signalPresent;
};

// Function to handle TX SignalPresent changes and propagate to connected RXs
const handleTxSignalPresentChange = (layer, path, prop, value) => {
    // Find all RXs connected to this TX
    // Get the TX name from the path like "/V1/TPNAPP/MEDIA/VIDEO/MAIN_TX1_S0"
    // txStreamAlias is like MAIN_TX1_S0
    const txStreamAlias = path.split('/').pop();
    console.log(`SignalPresent changed on ${txStreamAlias} to ${value}`);

    Object.keys(server.V1.MEDIA[layer]).forEach(nodeName => {
        const node = server.V1.MEDIA[layer][nodeName];
        // console.log(`Checking node ${nodeName} with SourceStream ${node.SourceStream}`);
        if (nodeName.endsWith('_D0') && node.SourceStream === txStreamAlias) {
            console.log(`Updating SignalPresent on ${nodeName} to ${value}`);
            node.SignalPresent = value;
        }
    });
};
