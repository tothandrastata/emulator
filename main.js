const lwnoodle = require('lwnoodle');
const server = lwnoodle.noodleServer({host:'127.0.0.1'});  
server.APPLICATION.Name = 'TPN_MMU Emulator';


// Initialie the Video layer:


// Generic nodes:
const genericTxNode = {
    SignalPresent: false,
    Enabled: true
};

const genericRxNode = {
    SignalPresent: false,
    SourceStream: 0
};

const layers = ['VIDEO','AUDIO','USBICRON','USBHID','RS232'];

// Initializing nodes (1-3):
layers.forEach(layer => {
    for (let id=1; id<=3; id++) {
        server.V1.TPNAPP.MEDIA[layer][`MAIN_TX${id}_S0`] = genericTxNode;
        server.V1.TPNAPP.MEDIA[layer][`MAIN_RX${id}_D0`] = genericRxNode;
        server.V1.TPNAPP.MEDIA[layer].XP = {switch: (command) => {
            console.log(`XP command received for ${layer}: ${command}`);
            // command format:  <SRC_STREAM_ID>:<DEST_STREAM_ID>
            // example MAIN_TX1_S0:MAIN_RX1_D0
            const [src, dest] = command.split(':');
            server.V1.TPNAPP.MEDIA[layer][dest].SourceStream = src;  
        }};
    }
});


// server.LED.setRGB = (r,g,b) => { /* do something with r,g,b values */}
// server.AUDIO.SoundLevel = 50;
// server.AUDIO.on('SoundLevel', (path, prop, value)=>{ /* do something with the new value when it has changed*/})
// setInterval(()=>{ server.APPLICATION.STATUS.Time = Date.now(); }, 1000);    // update APPLICATION.STATUS.Time in every second
