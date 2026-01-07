# TPN-MMU Emulator

A Node.js-based emulator for TPN-MMU (TPN Matrix Management Unit) using the lwnoodle library with a web-based control interface.

## Description

This emulator simulates a TPN-MMU device that manages multiple media layers including VIDEO, AUDIO, USB (ICRON and HID). It provides virtual transmitter (TX) and receiver (RX) nodes for testing and development purposes, along with a modern web UI for control and monitoring.

## Features

- **Multiple Media Layers**: VIDEO, AUDIO, USBICRON, USBHID
- **Configurable Matrix Size**: Default 3x3 (3 TX and 3 RX nodes per layer)
- **Cross-Point Switching**: Route any input to any output within a layer
- **Signal Present Control**: Toggle signal presence on TX inputs
- **Web UI**: Modern browser-based control panel
  - Layer selection tabs
  - Crosspoint matrix visualization
  - Real-time status updates
  - Signal present controls
- **REST API**: Full HTTP API for programmatic control
- **LW3 Protocol**: Built on the lwnoodle server framework

## Quick Start

### Installation

```bash
npm install
```

### Running the Emulator

Start the emulator with default configuration:

**Using npm:**
```bash
npm start
```

**Using startup scripts:**
```bash
# Windows
start.bat

# Linux/macOS
./start.sh
```

The startup scripts will automatically create a `.env` file from `.env.example` if it doesn't exist.

The emulator will start with:
- **LW3 Protocol Server**: Port 7107
- **Web UI**: http://localhost:8081

### Configuration

Copy the example configuration and customize:

```bash
cp .env.example .env
```

Edit `.env` to configure:

```env
# Device Identity
PRODUCT_NAME=TPN-MMU-X100
PART_NUMBER=91710013
SERIAL_NUMBER=EMULATOR
PACKAGE_VERSION=v0.0.0

# Network Configuration
LW3_HOST=0.0.0.0
LW3_PORT=7107

# Web UI Configuration
WEB_UI_ENABLED=true
WEB_UI_HOST=0.0.0.0
WEB_UI_PORT=8081

# Matrix Configuration
MATRIX_SIZE=3
```

## Web UI

Access the web control panel at http://localhost:8081

Features:
- **Layer Tabs**: Switch between VIDEO, AUDIO, USBICRON, USBHID
- **Input Cards**: View and control signal presence for all TX inputs
- **Output Cards**: View connection status for all RX outputs
- **Crosspoint Matrix**: Visual representation of all connections
- **Auto-Refresh**: Updates every 2 seconds

## REST API

### Get Device Status

```bash
GET /api/status
```

Returns device information including product name, part number, and matrix size.

### Get Layer Inputs

```bash
GET /api/layer/:layer/inputs
```

Returns all TX (input) nodes for the specified layer (VIDEO, AUDIO, USBICRON, USBHID).

### Get Layer Outputs

```bash
GET /api/layer/:layer/outputs
```

Returns all RX (output) nodes with connection information.

### Get Crosspoint Matrix

```bash
GET /api/layer/:layer/crosspoint
```

Returns the complete crosspoint matrix with inputs and outputs.

### Set Signal Present

```bash
PUT /api/layer/:layer/inputs/:alias/signal
Content-Type: application/json

{
  "signalPresent": true
}
```

Toggle signal present on a specific TX input.

## Development

Install all dependencies including dev dependencies:

```bash
npm install
```

Run with hot reload (auto-restart on file changes):

```bash
npm run dev
```

## Building for Production

Create a production distribution package and ZIP file:

```bash
npm run build
```

This creates:
- **`dist/` folder** - Ready-to-run distribution directory
- **`tpn-mmu-emulator-v1.0.0.zip`** - Compressed production package (~3.4 MB)

The package includes:
- Main emulator code
- Web UI files (HTML, CSS, JS)
- All production dependencies (node_modules)
- Configuration files (.env.example)
- Startup scripts (start.sh, start.bat)

The distribution package is ready for deployment and requires only Node.js >= 18.0.0.

### Deploying the Production Package

**Option 1: Using the ZIP file**
```bash
# Extract the ZIP file
unzip tpn-mmu-emulator-v1.0.0.zip -d /path/to/deployment

# Navigate to deployment directory
cd /path/to/deployment

# Run with startup script (recommended)
./start.sh          # Linux/macOS
start.bat           # Windows

# Or run directly
node main.js
```

**Option 2: Using the dist folder**
```bash
# Copy the dist folder to deployment location
cp -r dist /path/to/deployment

# Navigate and run
cd /path/to/deployment
./start.sh          # Linux/macOS
start.bat           # Windows
```

## Architecture

### Node Structure

Each media layer contains:
- **TX Nodes** (Transmitters): Format `{MAC}_S0` with properties:
  - `StreamAlias`: Display name (e.g., TX1_S0, TX2_S0, TX3_S0)
  - `SignalPresent`: Boolean indicating signal availability (default: `true`)
  - `Enabled`: Boolean indicating if the node is enabled

- **RX Nodes** (Receivers): Format `{MAC}_D0` with properties:
  - `StreamAlias`: Display name (e.g., RX1_D0, RX2_D0, RX3_D0)
  - `SignalPresent`: Boolean indicating signal availability
  - `SourceStream`: Connected TX node name
  - `SourceStreamAlias`: Connected TX display name

### Default Connections

On startup, each output (RX) is automatically connected to its corresponding input (TX):
- RX1 → TX1
- RX2 → TX2
- RX3 → TX3

This default routing can be changed via the Web UI or LW3 protocol commands.

### Cross-Point Switching

Each media layer supports XP switching using the LW3 protocol:

```
V1.MEDIA.<LAYER>.XP.switch(<SRC_STREAM_ALIAS>:<DEST_STREAM_ALIAS>)
```

Example:
```
V1.MEDIA.VIDEO.XP.switch(TX1_S0:RX1_D0)
```

This routes video input TX1 to output RX1.

### Signal Propagation

When a TX node's `SignalPresent` changes, the emulator automatically propagates the signal state to all connected RX nodes. This simulates real hardware behavior where outputs only have signal when connected to an active input.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Dependencies

- [lwnoodle](https://www.npmjs.com/package/lwnoodle) ^2.5.1 - LW3 protocol server
- [fastify](https://www.npmjs.com/package/fastify) ^4.29.1 - Web server framework
- [@fastify/static](https://www.npmjs.com/package/@fastify/static) ^6.12.0 - Static file serving
- [@fastify/cors](https://www.npmjs.com/package/@fastify/cors) ^8.5.0 - CORS support
- [dotenv](https://www.npmjs.com/package/dotenv) ^17.2.3 - Environment configuration

## License

ISC
