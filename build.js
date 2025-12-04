const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = './dist';

console.log('Starting build process...');

// Clean dist directory
if (fs.existsSync(distDir)) {
    console.log('Cleaning existing dist directory...');
    fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir);

// Copy main.js
console.log('Copying main.js...');
fs.copyFileSync('./main.js', path.join(distDir, 'main.js'));

// Create minimal package.json
console.log('Creating package.json...');
const packageJson = {
    name: "tpn-mmu-emulator",
    version: "1.0.0",
    description: "TPN_MMU Emulator Server",
    main: "main.js",
    scripts: {
        start: "node main.js"
    },
    dependencies: {
        "lwnoodle": "latest"
    }
};
fs.writeFileSync(
    path.join(distDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
);

// Install production dependencies
console.log('Installing production dependencies...');
try {
    execSync('npm install --production --omit=dev', {
        cwd: distDir,
        stdio: 'inherit'
    });
} catch (error) {
    console.error('Failed to install dependencies:', error.message);
    process.exit(1);
}

// Clean up unnecessary files to minimize size
console.log('Removing unnecessary files...');
const nodModulesPath = path.join(distDir, 'node_modules');

if (fs.existsSync(nodModulesPath)) {
    // Remove markdown files
    execSync('del /s /q *.md 2>nul || echo No .md files found', {
        cwd: nodModulesPath,
        shell: 'cmd.exe'
    });

    // Remove source map files
    execSync('del /s /q *.map 2>nul || echo No .map files found', {
        cwd: nodModulesPath,
        shell: 'cmd.exe'
    });

    // Remove TypeScript files
    execSync('del /s /q *.ts 2>nul || echo No .ts files found', {
        cwd: nodModulesPath,
        shell: 'cmd.exe'
    });
}

console.log('');
console.log('='.repeat(50));
console.log('Build complete!');
console.log('='.repeat(50));
console.log(`Distribution ready in: ${path.resolve(distDir)}`);
console.log('');
console.log('To run the emulator:');
console.log('  cd dist');
console.log('  node main.js');
console.log('');
console.log('To deploy to embedded Linux:');
console.log('  1. Copy the entire "dist" folder to your device');
console.log('  2. Ensure Node.js is installed on the device');
console.log('  3. Run: node main.js');
console.log('='.repeat(50));
