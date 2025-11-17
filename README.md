# TPN_MMU Emulator

A Node.js-based emulator for TPN_MMU (TPN Matrix Management Unit) using the lwnoodle library.

## Description

This emulator simulates a TPN_MMU device that manages multiple media layers including VIDEO, AUDIO, USB (ICRON and HID), and RS232. It provides virtual transmitter (TX) and receiver (RX) nodes for testing and development purposes.

## Features

- Supports multiple media layers: VIDEO, AUDIO, USBICRON, USBHID, RS232
- 3 TX/RX node pairs per layer (MAIN_TX1-3_S0 and MAIN_RX1-3_D0)
- Cross-point (XP) switching functionality for routing streams
- Built on the lwnoodle server framework

## Development

Install all dependencies including dev dependencies:

```bash
npm install
```

Run with hot reload (auto-restart on file changes):

```bash
npm run dev
```

The emulator will start a lwnoodle server on `127.0.0.1` and initialize all media layer nodes.

## Production Deployment

Install only production dependencies (excludes dev tools like nodemon):

```bash
npm install --production
```

Run in production mode:

```bash
npm start
```

## Architecture

### Generic Nodes

- **TX Node**: Transmitter node with `SignalPresent` and `Enabled` properties
- **RX Node**: Receiver node with `SignalPresent` and `SourceStream` properties

### Cross-Point Switching

Each media layer supports XP switching with the following command format:

```
<SRC_STREAM_ID>:<DEST_STREAM_ID>
```

Example: `MAIN_TX1_S0:MAIN_RX1_D0`

## Dependencies

- [lwnoodle](https://www.npmjs.com/package/lwnoodle) - Lightweight WebSocket-based noodle server

