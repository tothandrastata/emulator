const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = './dist';

// Cross-platform helper functions
function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;

    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('============================================');
console.log('   Building TPN-MMU Emulator');
console.log('============================================');
console.log('');

// Step 1: Clean dist directory
console.log('[1/6] Cleaning existing dist directory...');
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });
console.log('      ✓ Done');

// Step 2: Copy main.js
console.log('[2/6] Copying main.js...');
fs.copyFileSync('./main.js', path.join(distDir, 'main.js'));
console.log('      ✓ Done');

// Step 3: Copy web UI files
console.log('[3/6] Copying web UI files...');
const webSrc = './web';
const webDest = path.join(distDir, 'web');
if (fs.existsSync(webSrc)) {
    copyDir(webSrc, webDest);
    console.log('      ✓ Done');
} else {
    console.log('      ⚠ Web directory not found, skipping');
}

// Step 4: Copy configuration and startup files
console.log('[4/6] Copying configuration and startup files...');
if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', path.join(distDir, '.env.example'));
}
if (fs.existsSync('.env')) {
    fs.copyFileSync('.env', path.join(distDir, '.env'));
}
if (fs.existsSync('start.sh')) {
    fs.copyFileSync('start.sh', path.join(distDir, 'start.sh'));
    // Make executable on Unix (ignore errors on Windows)
    try {
        fs.chmodSync(path.join(distDir, 'start.sh'), '755');
    } catch (e) {
        // Ignore chmod errors on Windows
    }
}
if (fs.existsSync('start.bat')) {
    fs.copyFileSync('start.bat', path.join(distDir, 'start.bat'));
}
console.log('      ✓ Done');

// Step 5: Create production package.json
console.log('[5/6] Creating package.json...');
const packageJson = {
    name: "tpn-mmu-emulator",
    version: "1.0.0",
    description: "TPN-MMU Emulator Server",
    main: "main.js",
    scripts: {
        start: "node main.js"
    },
    dependencies: {
        "lwnoodle": "^2.5.1",
        "dotenv": "^17.2.3",
        "fastify": "^4.29.1",
        "@fastify/static": "^6.12.0",
        "@fastify/cors": "^8.5.0"
    },
    engines: {
        node: ">=18.0.0"
    }
};
fs.writeFileSync(
    path.join(distDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
);
console.log('      ✓ Done');

// Step 6: Install production dependencies
console.log('[6/6] Installing production dependencies (this may take a minute)...');
try {
    execSync('npm install --omit=dev --no-audit --no-fund', {
        cwd: distDir,
        stdio: 'inherit'
    });
    console.log('      ✓ Done');
} catch (error) {
    console.error('      ❌ Failed to install dependencies:', error.message);
    process.exit(1);
}

console.log('');
console.log('============================================');
console.log('   Build Complete!');
console.log('============================================');
console.log('');
console.log(`📦 Distribution ready in: ${path.resolve(distDir)}`);
console.log('');
console.log('✅ Package includes:');
console.log('   - Main emulator code');
console.log('   - Web UI (HTML, CSS, JS)');
console.log('   - All dependencies (node_modules)');
console.log('   - Configuration files');
console.log('   - Startup scripts (start.sh, start.bat)');
console.log('');
console.log('🚀 To run the emulator:');
console.log('   Windows: cd dist && start.bat');
console.log('   Linux/Mac: cd dist && ./start.sh');
console.log('   Or directly: cd dist && node main.js');
console.log('');
console.log('📋 To deploy to embedded Linux:');
console.log('   1. Copy the entire "dist" folder to your device');
console.log('   2. Ensure Node.js >= 18.0.0 is installed');
console.log('   3. Run: node main.js');
console.log('');
console.log('🌐 Web UI will be accessible at:');
console.log('   http://localhost:8081');
console.log('');
console.log('🔌 LW3 protocol will be accessible at:');
console.log('   Port 7107');
console.log('');
console.log('============================================');
