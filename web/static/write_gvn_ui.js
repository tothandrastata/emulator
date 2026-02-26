const fs = require('fs');
const path = require('path');

const targetFile = 'C:\\Taurus\\LARA\\GVN\\emulator\\web\\static\\index.html';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GVN-MMU Emulator Control Panel</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 25px;
        }

        .header h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 10px;
        }

        .device-info {
            display: flex;
            gap: 30px;
            margin-top: 15px;
            color: #666;
            font-size: 14px;
        }

        .device-info-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .device-info-label {
            font-weight: 600;
            color: #444;
        }

        .section {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 25px;
        }

        .section h2 {
            color: #333;
            font-size: 22px;
            margin-bottom: 20px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }

        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
        }

        .card {
            background: #f8f9fa;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 20px;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .card-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }

        .status-indicator {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: inline-block;
        }

        .status-active {
            background: #4caf50;
            box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
        }

        .status-inactive {
            background: #ccc;
        }

        .card-body {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .property {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }

        .property:last-child {
            border-bottom: none;
        }

        .property-label {
            font-weight: 500;
            color: #555;
            font-size: 14px;
        }

        .property-value {
            font-family: 'Courier New', monospace;
            color: #333;
            font-size: 14px;
            font-weight: 600;
        }

        button {
            padding: 10px 18px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: background 0.2s;
        }

        .btn-primary {
            background: #667eea;
            color: white;
        }

        .btn-primary:hover {
            background: #5568d3;
        }

        .btn-success {
            background: #4caf50;
            color: white;
        }

        .btn-success:hover {
            background: #45a049;
        }

        .btn-danger {
            background: #f44336;
            color: white;
        }

        .btn-danger:hover {
            background: #da190b;
        }

        .button-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 18px;
        }

        .error {
            background: #ffebee;
            border: 2px solid #f44336;
            color: #c62828;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .refresh-info {
            text-align: center;
            color: #666;
            font-size: 13px;
            margin-top: 10px;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 6px;
        }

        /* Crosspoint Matrix Styles */
        .xp-matrix {
            display: table;
            border-collapse: collapse;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
        }

        .xp-row {
            display: table-row;
        }

        .xp-cell {
            display: table-cell;
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
            background: #f8f9fa;
            min-width: 60px;
            height: 60px;
            vertical-align: middle;
        }

        .xp-header {
            background: #667eea;
            color: white;
            font-weight: 600;
            font-size: 14px;
        }

        .xp-label {
            background: #e0e0e0;
            font-weight: 600;
            color: #333;
            font-size: 13px;
        }

        .xp-cell-clickable { cursor: pointer; transition: all 0.2s; }
        .xp-cell-clickable:hover { background-color: #e3f2fd; }
        
        .xp-cell-active {
            background: #4caf50;
            position: relative;
        }

        .xp-cell-active::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: 30px;
            background: #2e7d32;
            border-radius: 4px;
        }

        .xp-cell-inactive {
            background: #f8f9fa;
            cursor: pointer;
        }
        .xp-cell-inactive:hover {
            background: #e3f2fd;
        }

        .xp-cell-disconnect {
            background: #f44336;
            color: white;
            cursor: pointer;
            font-weight: bold;
        }

        .xp-cell-disconnect:hover {
            background: #da190b;
        }

        .xp-cell-disconnect-active {
            background: #f8f9fa;
            color: #333;
            font-weight: bold;
        }

        /* TCP Toggle Styles */
        .tcp-toggle-container {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 15px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .tcp-toggle-label {
            font-weight: 600;
            color: #444;
            font-size: 14px;
        }

        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: 0.3s;
            border-radius: 24px;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
            background-color: #4caf50;
        }

        .toggle-switch input:checked + .toggle-slider:before {
            transform: translateX(26px);
        }

        .toggle-switch input:disabled + .toggle-slider {
            opacity: 0.6;
            cursor: not-allowed;
        }

        #tcp-status {
            font-weight: 600;
            font-size: 14px;
        }

        /* Custom Table Styles for Endpoints */
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
        thead th { background: #f8f9fa; font-weight: 600; color: #333; border-bottom: 2px solid #667eea; }
        tbody tr:hover { background-color: #f8f9fa; }
        .endpoint-id { font-weight: 600; color: #333; }
        .ip-badge { background: #e0e0e0; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px; }

        /* Modal Styles */
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; }
        .modal { background: white; padding: 25px; border-radius: 12px; width: 100%; max-width: 500px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 15px; }
        .modal-title { font-size: 20px; font-weight: 600; color: #333; }
        .modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; }
        .form-group { margin-bottom: 15px; }
        .form-label { display: block; margin-bottom: 8px; font-weight: 500; color: #444; }
        .form-control { width: 100%; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; transition: border-color 0.2s; }
        .form-control:focus { outline: none; border-color: #667eea; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; border-top: 1px solid #e0e0e0; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>GVN-MMU Emulator Control Panel</h1>
            <div id="device-info" class="device-info">
                <div class="loading">Loading device information...</div>
            </div>
            <div class="tcp-toggle-container">
                <span class="tcp-toggle-label" id="tcp-toggle-label">TCP Control Server:</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="tcp-server-toggle" disabled>
                    <span class="toggle-slider"></span>
                </label>
                <span id="tcp-status" class="device-info-label">Disabled</span>
            </div>
        </div>

        <div id="error-container"></div>

        <div class="section">
            <h2>DeviceMap Endpoints</h2>
            <div id="endpoints-container">
                <div class="loading">Loading endpoints...</div>
            </div>
        </div>

        <div class="section">
            <h2>Video Crosspoint Matrix (XP)</h2>
            <div id="crosspoint-matrix">
                <div class="loading">Loading crosspoint matrix...</div>
            </div>
        </div>

        <div class="section">
            <h2>Video Inputs (Media)</h2>
            <div id="inputs-grid" class="cards-grid">
                <div class="loading">Loading inputs...</div>
            </div>
        </div>

        <div class="section">
            <h2>Video Destinations</h2>
            <div id="destinations-grid" class="cards-grid">
                <div class="loading">Loading destinations...</div>
            </div>
            <div class="refresh-info">
                Auto-refresh every 2 seconds
            </div>
        </div>
    </div>

    <!-- Edit Endpoint Modal -->
    <div id="editEndpointModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title">Edit Endpoint <span id="edit-endpoint-id-display" style="background:#e0e0e0;padding:2px 8px;border-radius:4px;font-size:16px;"></span></div>
                <button class="modal-close" onclick="closeEditModal()">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="edit-endpoint-id">
                <div class="form-group">
                    <label class="form-label">Device Label</label>
                    <input type="text" class="form-control" id="edit-device-label">
                </div>
                <div class="form-group">
                    <label class="form-label">IP Address</label>
                    <input type="text" class="form-control" id="edit-ip-address" placeholder="192.168.0.x">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" style="background:#e0e0e0;color:#333;" onclick="closeEditModal()">Cancel</button>
                <button class="btn-primary" onclick="saveEndpointChanges()">Save Changes</button>
            </div>
        </div>
    </div>

    <script>
        let emulatorState = {};

        // Initialize when document is loaded
        document.addEventListener('DOMContentLoaded', () => {
            loadStatus();
            loadState();
            setupEventListeners();
            
            // Auto-refresh every 2 seconds
            setInterval(() => {
                loadState();
                loadStatus();
            }, 2000);
        });

        function showError(message) {
            const container = document.getElementById('error-container');
            container.innerHTML = \`<div class="error">\${message}</div>\`;
            setTimeout(() => {
                container.innerHTML = '';
            }, 5000);
        }

        function setupEventListeners() {
            const toggle = document.getElementById('tcp-server-toggle');
            if (toggle) {
                toggle.addEventListener('change', async (e) => {
                    const enabled = e.target.checked;
                    toggle.disabled = true;
                    
                    try {
                        const action = enabled ? 'enable' : 'disable';
                        const response = await fetch(\`/api/tcp/\${action}\`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
                        });
                        if (!response.ok) throw new Error(\`Failed to \${action} TCP server\`);
                    } catch (error) {
                        showError(error.message);
                        e.target.checked = !enabled; // Revert visually
                    } finally {
                        toggle.disabled = false;
                        await loadStatus(); // Verify actual state
                    }
                });
            }
        }

        async function loadStatus() {
            try {
                const response = await fetch('/api/status');
                if (!response.ok) throw new Error('Failed to load status');
                const data = await response.json();

                let infoText = \`\${data.productName} (PN: \${data.partNumber}, SN: \${data.serialNumber})\`;
                if (data.packageVersion) {
                    infoText += \` - Version \${data.packageVersion}\`;
                }
                
                document.getElementById('device-info').innerHTML = \`
                    <div class="device-info-item">
                        <span class="device-info-label">Product info:</span>
                        <span>\${infoText}</span>
                    </div>
                \`;

                const toggle = document.getElementById('tcp-server-toggle');
                const tcpStatus = document.getElementById('tcp-status');
                const tcpLabel = document.getElementById('tcp-toggle-label');

                if (data.tcpServerEnabled !== undefined && toggle) {
                    toggle.checked = data.tcpServerEnabled;
                    toggle.disabled = false;
                    
                    tcpStatus.textContent = data.tcpServerEnabled ? 'Enabled' : 'Disabled';
                    tcpStatus.style.color = data.tcpServerEnabled ? '#4caf50' : '#f44336';
                }

                if (data.tcpPort && tcpLabel) {
                    tcpLabel.textContent = \`TCP Control Server at port \${data.tcpPort}:\`;
                }
            } catch (error) {
                console.error('Error loading status:', error);
                
            }
        }

        async function loadState() {
            try {
                const response = await fetch('/api/state');
                if (!response.ok) throw new Error('Failed to load state');
                emulatorState = await response.json();

                renderEndpoints();
                renderInputs();
                renderDestinations();
            } catch (error) {
                console.error('Error loading state:', error);
            }
        }

        function renderEndpoints() {
            const container = document.getElementById('endpoints-container');
            if (!emulatorState.endpoints) return;

            let html = \`
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Device Label</th>
                            <th>IP Address</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            \`;

            Object.entries(emulatorState.endpoints).forEach(([id, endpoint]) => {
                html += \`
                    <tr>
                        <td class="endpoint-id">\${id}</td>
                        <td>\${endpoint.DeviceLabel}</td>
                        <td><span class="ip-badge">\${endpoint.IpAddress}</span></td>
                        <td style="text-align: right;">
                            <button class="btn-primary" onclick="openEditModal('\${id}')">Edit</button>
                        </td>
                    </tr>
                \`;
            });

            html += \`
                    </tbody>
                </table>
            \`;
            container.innerHTML = html;
        }

        function openEditModal(id) {
            const endpoint = emulatorState.endpoints[id];
            if (!endpoint) return;
            document.getElementById('edit-endpoint-id').value = id;
            document.getElementById('edit-endpoint-id-display').textContent = id;
            document.getElementById('edit-device-label').value = endpoint.DeviceLabel;
            document.getElementById('edit-ip-address').value = endpoint.IpAddress;
            document.getElementById('editEndpointModal').style.display = 'flex';
        }

        function closeEditModal() {
            document.getElementById('editEndpointModal').style.display = 'none';
        }

        async function saveEndpointChanges() {
            const id = document.getElementById('edit-endpoint-id').value;
            const deviceLabel = document.getElementById('edit-device-label').value;
            const ipAddress = document.getElementById('edit-ip-address').value;

            try {
                const response = await fetch(\`/api/endpoints/\${id}\`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deviceLabel, ipAddress })
                });

                if (!response.ok) throw new Error('Failed to update endpoint');

                closeEditModal();
                loadState();
            } catch (error) {
                showError(error.message);
            }
        }

        function renderInputs() {
            const container = document.getElementById('inputs-grid');
            if (!emulatorState.inputs) return;

            container.innerHTML = Object.entries(emulatorState.inputs).map(([id, input]) => {
                let sourceDetails = '-';
                let srcName = '-';
                let srcResolution = '-';

                if (input.Connected) {
                    const srcMatch = id.replace('I', 'S');
                    const srcInfo = emulatorState.sources?.[srcMatch];
                    if (srcInfo) {
                        srcName = srcInfo.Name || 'Unknown';
                        srcResolution = \`\${srcInfo.ActiveResolution}@\${srcInfo.RefreshRate}Hz\`;
                    }
                }

                return \`
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">\${id}</span>
                        <span class="status-indicator \${input.Connected ? 'status-active' : 'status-inactive'}"></span>
                    </div>
                    <div class="card-body">
                        <div class="property">
                            <span class="property-label">Connected:</span>
                            <span class="property-value">\${input.Connected ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="property">
                            <span class="property-label">Source Name:</span>
                            <span class="property-value">\${srcName}</span>
                        </div>
                        <div class="property">
                            <span class="property-label">Resolution:</span>
                            <span class="property-value">\${srcResolution}</span>
                        </div>
                        <div class="button-group">
                            <button class="btn-success" onclick="toggleInput('\${id}', true)">Connect</button>
                            <button class="btn-danger" onclick="toggleInput('\${id}', false)">Disconnect</button>
                        </div>
                    </div>
                </div>
                \`;
            }).join('');
        }

        async function toggleInput(id, connected) {
            try {
                const response = await fetch(\`/api/inputs/\${id}/connect\`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ connected })
                });
                if (!response.ok) throw new Error('Failed to toggle input');
                loadState();
            } catch (error) {
                showError(error.message);
            }
        }

        function renderDestinations() {
            renderDestinationCards();
            renderCrosspointMatrix();
        }

        function renderDestinationCards() {
            const container = document.getElementById('destinations-grid');
            if (!emulatorState.destinations) return;

            container.innerHTML = Object.entries(emulatorState.destinations).map(([id, dest]) => {
                const sourceRouted = dest.ConnectedSource || '0';
                const isRouted = sourceRouted && sourceRouted.length > 0 && sourceRouted !== '0';
                const srcName = isRouted && emulatorState.sources && emulatorState.sources[sourceRouted] ? emulatorState.sources[sourceRouted].Name : 'None';

                return \`
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">\${id}</span>
                        <span class="status-indicator \${isRouted ? 'status-active' : 'status-inactive'}"></span>
                    </div>
                    <div class="card-body">
                        <div class="property">
                            <span class="property-label">Name:</span>
                            <span class="property-value">\${dest.Name}</span>
                        </div>
                        <div class="property">
                            <span class="property-label">Resolution:</span>
                            <span class="property-value">\${dest.ActiveResolution}@\${dest.RefreshRate}Hz</span>
                        </div>
                        <div class="property">
                            <span class="property-label">Connected Source:</span>
                            <span class="property-value">\${sourceRouted === '0' ? 'None' : sourceRouted}</span>
                        </div>
                    </div>
                </div>
                \`;
            }).join('');
        }

        function renderCrosspointMatrix() {
            const container = document.getElementById('crosspoint-matrix');
            if (!emulatorState.destinations || !emulatorState.sources) {
                container.innerHTML = '<div class="loading">Loading crosspoint matrix...</div>';
                return;
            }

            const sources = Object.keys(emulatorState.sources);
            const destinations = Object.keys(emulatorState.destinations);

            let html = '<div class="xp-matrix">';

            // Header row
            html += '<div class="xp-row">';
            html += '<div class="xp-cell xp-header">Dest \\ Source</div>';
            html += '<div class="xp-cell xp-header">Disconnect</div>';
            sources.forEach(src => {
                html += \`<div class="xp-cell xp-header">\${src}</div>\`;
            });
            html += '</div>';

            // Destination rows
            destinations.forEach(dest => {
                const connectedSrc = emulatorState.destinations[dest].ConnectedSource || '0';
                
                html += '<div class="xp-row">';
                html += \`<div class="xp-cell xp-label">\${dest}</div>\`;

                // Disconnect cell
                const isDisc = (!connectedSrc || connectedSrc === '0' || connectedSrc === '');
                html += \`<div class="xp-cell \${isDisc ? 'xp-cell-disconnect-active' : 'xp-cell-disconnect'}" onclick="routeDestination('\${dest}', '0')">\${isDisc ? 'X' : 'Disc.'}</div>\`;

                // Source cells
                sources.forEach(src => {
                    const isConn = connectedSrc === src;
                    const cellClass = isConn ? 'xp-cell-active' : 'xp-cell-inactive';
                    html += \`<div class="xp-cell \${cellClass}" onclick="routeDestination('\${dest}', '\${src}')"></div>\`;
                });

                html += '</div>';
            });

            html += '</div>';
            container.innerHTML = html;
        }

        async function disconnectDestination(id) {
            try {
                const response = await fetch(\`/api/destinations/\${id}/disconnect\`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                if (!response.ok) throw new Error('Failed to disconnect destination');
                loadState();
            } catch (error) {
                showError(error.message);
            }
        }

        async function routeDestination(id, targetSource) {
            if (targetSource === '0') {
                return disconnectDestination(id);
            }

            try {
                const response = await fetch(\`/api/destinations/\${id}/route\`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: targetSource })
                });
                if (!response.ok) throw new Error('Failed to route destination');
                loadState();
            } catch (error) {
                showError(error.message);
            }
        }
    </script>
</body>
</html>`;

fs.writeFileSync(targetFile, htmlContent, 'utf-8');
console.log('Successfully wrote replacement index.html.');
