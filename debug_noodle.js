const lwnoodle = require('lwnoodle');
const server = lwnoodle.noodleServer(7109);

server.MEDIA = {
    VIDEO: {
        I101: {
            SignalPresent: 'false',
            SignalPresent__rw__: true
        }
    }
};

const node = server.MEDIA.VIDEO.I101;
const inner = node.__inner__;

console.log('--- Initial State ---');
console.log('Value:', node.SignalPresent);
console.log('RW Marker:', node.SignalPresent__rw__);
console.log('Internal Properties:', JSON.stringify(inner.properties.SignalPresent, null, 2));

console.log('\n--- Modifying RW via inner ---');
inner.properties.SignalPresent.rw = true;
console.log('RW Marker after mod:', node.SignalPresent__rw__);

console.log('\n--- Custom Setter ---');
inner.properties.SignalPresent.setter = function (v) {
    console.log('SETTER CALLED WITH:', v);
    this.value = v.toString();
};

console.log('\n--- Testing SET via Proxy ---');
try {
    node.SignalPresent = 'true';
    console.log('Proxy SET suceeded. New value:', node.SignalPresent);
} catch (e) {
    console.log('Proxy SET failed:', e.message);
}

process.exit(0);
