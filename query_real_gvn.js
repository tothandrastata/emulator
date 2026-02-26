const net = require('net');

const HOST = '10.0.128.86';
const PORT = 6107;

const client = new net.Socket();
let buffer = '';

client.connect(PORT, HOST, function () {
    console.log(`Connected to \${HOST}:\${PORT}`);

    const queries = [
        'GET /MEDIA/VIDEO/D401',
        'GET /MEDIA/VIDEO/S101',
        'GET /MEDIA/VIDEO/I101',
        'GET /MEDIA/VIDEO/XP',
        'GET /MEDIA/VIDEO/XP/D401',
        'GET /ENDPOINTS/DEVICEMAP',
        'GET /ENDPOINTS/DEVICEMAP/X1'
    ];

    queries.forEach(q => client.write(q + '\r\n'));
});

client.on('data', function (data) {
    buffer += data.toString();
});

client.on('close', function () {
    console.log(buffer);
    console.log('Connection closed');
});

client.on('error', function (err) {
    console.error('Error:', err.message);
});

// Close connection after 3 seconds
setTimeout(() => {
    client.destroy();
}, 2000);
