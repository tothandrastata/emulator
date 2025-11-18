const lwnoodle = require('lwnoodle');
const server = lwnoodle.noodleServer({host:'0.0.0.0', port:6107});
server.APPLICATION.Name = 'TPN_MMU Emulator';
server.ManufacturerName="Lightware Visual Engineering";
server.ProductName="TPN-MMU-X100";
server.PartNumber="91710013";
server.SerialNumber="EMULATOR"
server.PackageVersion="v0.0.0";

const layers = ['VIDEO','AUDIO','USBICRON','USBHID'];
const roomName = 'MAIN';

// Generic nodes:
const genericTxNode = {
    SignalPresent: false,
    Enabled: false              // Start with false, user must set to true before use
};

const genericRxNode = {
    SignalPresent: false,
    SourceStream: 0
};




// Initializing nodes (1-3):
layers.forEach(layer => {
    for (let id=1; id<=3; id++) {
        server.V1.TPNAPP.MEDIA[layer][`${roomName}_TX${id}_S0`] = genericTxNode;
        server.V1.TPNAPP.MEDIA[layer][`${roomName}_RX${id}_D0`] = genericRxNode;
        // Create Symlinked nodes under XP as well
        server.V1.TPNAPP.MEDIA[layer].XP[`${roomName}_TX${id}_S0`] = server.V1.TPNAPP.MEDIA[layer][`${roomName}_TX${id}_S0`];
        server.V1.TPNAPP.MEDIA[layer].XP[`${roomName}_RX${id}_D0`] = server.V1.TPNAPP.MEDIA[layer][`${roomName}_RX${id}_D0`];       
        // Set RX SourceStream to Read/Write
        server.V1.TPNAPP.MEDIA[layer][`${roomName}_RX${id}_D0`].SourceStream__rw__ = true;
        
        // set Enabled property to R/W
        server.V1.TPNAPP.MEDIA[layer][`${roomName}_TX${id}_S0`].Enabled__rw__ = true;

        // only for testing purposes, allow TX SignalPresent to be set manually
        server.V1.TPNAPP.MEDIA[layer][`${roomName}_TX${id}_S0`].SignalPresent__rw__ = true;
        
        // Implement the XP switch command
        server.V1.TPNAPP.MEDIA[layer].XP = {
            switch: (command) => handleXPSwitch(layer, command)
        };

        // If any TX signal present is changed then the connected RXs (can be multiple) signal present propoerties are to be updated accordingly.
        server.V1.TPNAPP.MEDIA[layer][`${roomName}_TX${id}_S0`].on('SignalPresent', (path, prop, value) => {
            handleTxSignalPresentChange(layer, path, prop, value);
        });
    }
});


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

    // the server.V1.TPNAPP.MEDIA[layer].toJson() returns with the devices as nodes,
    // validate whether the source and destination exist
    // using this JSON representation to avoid issues with references
    const mediaJson = server.V1.TPNAPP.MEDIA[layer].toJSON();
    if (!mediaJson.hasOwnProperty(src)) {
        throw new Error(`Invalid source stream: ${src}`);
    }
    if (!mediaJson.hasOwnProperty(dest)) {
        throw new Error(`Invalid destination stream: ${dest}`);
    }

    // If source stream is not enabled, throw exception
    if (!server.V1.TPNAPP.MEDIA[layer][src].Enabled) {
        throw new Error(`Source stream ${src} is not enabled`);
    }

    // OK, now we can set the SourceStream of the destination to the source
    server.V1.TPNAPP.MEDIA[layer][dest].SourceStream = src;

    // If signal is present on the source, set it on the destination as well
    const signalPresent = server.V1.TPNAPP.MEDIA[layer][src].SignalPresent;
    server.V1.TPNAPP.MEDIA[layer][dest].SignalPresent = signalPresent;
};

// Function to handle TX SignalPresent changes and propagate to connected RXs
const handleTxSignalPresentChange = (layer, path, prop, value) => {
    // Find all RXs connected to this TX
    // Get the TX name from the path like "/V1/TPNAPP/MEDIA/VIDEO/MAIN_TX1_S0"
    // txStreamName is like MAIN_TX1_S0
    const txStreamName = path.split('/').pop();
    // console.log(`SignalPresent changed on ${txStreamName} to ${value}`);

    Object.keys(server.V1.TPNAPP.MEDIA[layer]).forEach(nodeName => {
        const node = server.V1.TPNAPP.MEDIA[layer][nodeName];
        // console.log(`Checking node ${nodeName} with SourceStream ${node.SourceStream}`);
        if (nodeName.startsWith(`${roomName}_RX`) && node.SourceStream === txStreamName) {
            console.log(`Updating SignalPresent on ${nodeName} to ${value}`);
            node.SignalPresent = value;
        }
    });
};
