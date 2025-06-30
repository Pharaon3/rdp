const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

console.log('Installing WebSocket Agent as Windows Startup Service...');

// Function to download a file from URL
function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        console.log(`📥 Downloading: ${url}`);
        
        const protocol = url.startsWith('https:') ? https : http;
        const file = fs.createWriteStream(destination);
        
        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`✅ Downloaded: ${destination}`);
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(destination, () => {}); // Delete the file if it exists
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Function to run a command and return a promise
function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`Executing: ${command} ${args.join(' ')}`);
        
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: true
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Command completed successfully: ${command}`);
                resolve();
            } else {
                console.error(`❌ Command failed with exit code ${code}: ${command}`);
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });
        
        child.on('error', (error) => {
            console.error(`❌ Error executing command: ${error.message}`);
            reject(error);
        });
    });
}

// Function to create startup script
function createStartupScript() {
    const scriptContent = `@echo off
REM WebSocket Agent Startup Script
cd /d "${process.cwd()}"
powershell -WindowStyle Hidden -Command "Start-Process python -ArgumentList 'websocket_agent.py', '192.168.129.23', '8888', 'test' -WindowStyle Hidden"
`;
    
    const scriptPath = path.join(process.cwd(), 'start_agent_startup.bat');
    fs.writeFileSync(scriptPath, scriptContent);
    console.log(`✅ Created startup script: ${scriptPath}`);
    return scriptPath;
}

// Function to install as Windows startup task
async function installStartupTask(scriptPath) {
    const taskName = 'WebSocketAgent';
    const currentDir = process.cwd().replace(/\\/g, '\\\\');
    const scriptPathEscaped = scriptPath.replace(/\\/g, '\\\\');
    
    // Delete existing task if it exists
    try {
        await runCommand('schtasks', ['/delete', '/tn', taskName, '/f']);
        console.log('✅ Removed existing startup task');
    } catch (error) {
        // Task doesn't exist, which is fine
    }
    
    // Create new startup task
    const createTaskCommand = [
        '/create',
        '/tn', taskName,
        '/tr', scriptPathEscaped,
        '/sc', 'onlogon',
        '/ru', 'SYSTEM',
        '/f'
    ];
    
    await runCommand('schtasks', createTaskCommand);
    console.log('✅ Installed startup task successfully');
}

async function installStartup() {
    try {
        // Configuration
        const pythonScriptUrl = process.env.PYTHON_SCRIPT_URL || 'https://raw.githubusercontent.com/Pharaon3/rdp/main/websocket_agent.py';
        const pythonScriptPath = 'websocket_agent.py';
        
        // Step 1: Download the Python script if it doesn't exist
        if (!fs.existsSync(pythonScriptPath) || process.env.FORCE_DOWNLOAD === 'true') {
            console.log('\n📥 Downloading Python script...');
            await downloadFile(pythonScriptUrl, pythonScriptPath);
        } else {
            console.log('\n📁 Python script already exists, skipping download');
        }
        
        // Step 2: Install websockets package
        console.log('\n📦 Installing websockets package...');
        await runCommand('pip', ['install', 'websockets']);
        
        // Step 3: Create startup script
        console.log('\n📝 Creating startup script...');
        const startupScriptPath = createStartupScript();
        
        // Step 4: Install as Windows startup task
        console.log('\n🔧 Installing as Windows startup task...');
        await installStartupTask(startupScriptPath);
        
        console.log('\n✅ Setup complete!');
        console.log('The WebSocket agent will now start automatically on system startup.');
        console.log('You can test it by restarting your computer.');
        console.log('\nTo remove the startup task later, run:');
        console.log('schtasks /delete /tn WebSocketAgent /f');
        
    } catch (error) {
        console.error('❌ Failed to install startup service:', error.message);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Start the installation
installStartup(); 