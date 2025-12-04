# TPN_MMU Emulator - Deployment Guide

## Building the Distribution

To create a minimal production distribution:

```bash
npm run build
```

This will create a `dist` folder containing:
- `main.js` - Your application
- `package.json` - Minimal package file with only production dependencies
- `node_modules/` - Only production dependencies (no dev dependencies)

The build script automatically removes unnecessary files like:
- Documentation (*.md files)
- Source maps (*.map files)
- TypeScript source files (*.ts files)

## Deploying to Embedded Linux

### Prerequisites on Target Device
- Node.js runtime (version 16 or higher recommended)
- Network connectivity

### Deployment Steps

1. **Transfer the dist folder** to your embedded Linux device:
   ```bash
   scp -r dist/ user@device:/path/to/installation/
   ```

2. **SSH into the device**:
   ```bash
   ssh user@device
   ```

3. **Navigate to the installation directory**:
   ```bash
   cd /path/to/installation/dist
   ```

4. **Run the emulator**:
   ```bash
   node main.js
   ```

### Running as a Service (systemd)

Create a systemd service file `/etc/systemd/system/tpn-mmu-emulator.service`:

```ini
[Unit]
Description=TPN_MMU Emulator Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/installation/dist
ExecStart=/usr/bin/node main.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable tpn-mmu-emulator
sudo systemctl start tpn-mmu-emulator
sudo systemctl status tpn-mmu-emulator
```

### Checking Logs
```bash
sudo journalctl -u tpn-mmu-emulator -f
```

## Distribution Size

The minimal distribution typically includes:
- Main application: ~2 KB
- lwnoodle + dependencies: varies based on the library

Total size is significantly smaller than a full development environment.

## Network Access

The emulator binds to:
- **Address**: 0.0.0.0 (all interfaces)
- **Port**: 6107

Make sure this port is accessible on your network.

## Troubleshooting

### Port Already in Use
If port 6107 is already in use, modify `main.js` and change the port in `serverConfig`.

### Node.js Not Found
Ensure Node.js is installed on the embedded device:
```bash
node --version
```

### Permission Denied
Ports below 1024 require root privileges. Port 6107 should work without root, but if you encounter permission issues:
```bash
sudo node main.js
```
