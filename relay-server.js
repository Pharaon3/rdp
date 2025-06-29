async function flushBuffer() {
    // Small delay to ensure message ordering
    await new Promise(resolve => setTimeout(resolve, 10));
}const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class RelayServer {
constructor(port = 8888) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    // Storage
    this.agents = new Map(); // agent_id -> WebSocket
    this.clients = new Map(); // client_id -> WebSocket  
    this.pendingCommands = new Map(); // command_id -> client_ws
    
    this.setupRoutes();
    this.setupWebSocket();
}

log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

broadcastAgentList() {
    const agentList = Array.from(this.agents.keys());
    const message = {
        type: 'agent_list_update',
        agents: agentList,
        timestamp: new Date().toISOString()
    };
    
    // Send to all connected clients
    for (const [clientId, clientWs] of this.clients.entries()) {
        if (clientWs.readyState === WebSocket.OPEN) {
            this.sendMessage(clientWs, message);
        }
    }
    
    this.log(`Broadcasted agent list update: ${agentList.length} agents`);
}

setupRoutes() {
    // Basic health check endpoint
    this.app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            agents: Array.from(this.agents.keys()),
            clients: this.clients.size,
            pendingCommands: this.pendingCommands.size,
            timestamp: new Date().toISOString()
        });
    });
    
    // Get list of connected agents
    this.app.get('/agents', (req, res) => {
        const agentList = Array.from(this.agents.keys()).map(agentId => ({
            id: agentId,
            connected: this.agents.get(agentId).readyState === WebSocket.OPEN
        }));
        res.json(agentList);
    });
    
    // Serve static files if needed
    this.app.use(express.static('public'));
}

setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
        this.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
        
        // Set up message handler
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(ws, message);
            } catch (error) {
                this.log(`Error parsing message: ${error.message}`);
                this.sendError(ws, 'Invalid JSON message');
            }
        });
        
        // Handle connection close
        ws.on('close', () => {
            this.handleDisconnection(ws);
        });
        
        // Handle errors
        ws.on('error', (error) => {
            this.log(`WebSocket error: ${error.message}`);
        });
        
        // Send welcome message
        this.sendMessage(ws, {
            type: 'welcome',
            message: 'Connected to relay server'
        });
    });
}

handleMessage(ws, message) {
    const { type } = message;
    
    switch (type) {
        case 'agent_register':
            this.handleAgentRegistration(ws, message);
            break;
            
        case 'client_register':
            this.handleClientRegistration(ws, message);
            break;
            
        case 'command':
            this.handleCommand(ws, message);
            break;
            
        case 'command_response':
            this.handleCommandResponse(ws, message);
            break;
            
        case 'ping':
            this.sendMessage(ws, { type: 'pong' });
            break;
            
        default:
            this.log(`Unknown message type: ${type}`);
            this.sendError(ws, `Unknown message type: ${type}`);
    }
}

handleAgentRegistration(ws, message) {
    const { agent_id } = message;
    
    if (!agent_id) {
        this.sendError(ws, 'agent_id is required');
        return;
    }
    
    // Store agent connection
    this.agents.set(agent_id, ws);
    ws.agent_id = agent_id;
    
    this.log(`Agent ${agent_id} registered`);
    
    // Send acknowledgment
    this.sendMessage(ws, {
        type: 'register_ack',
        status: 'success',
        agent_id: agent_id
    });
    
    this.broadcastAgentList();
}

handleClientRegistration(ws, message) {
    const client_id = message.client_id || uuidv4();
    
    // Store client connection
    this.clients.set(client_id, ws);
    ws.client_id = client_id;
    
    this.log(`Client ${client_id} registered`);
    
    // Send acknowledgment with available agents
    this.sendMessage(ws, {
        type: 'register_ack',
        status: 'success',
        client_id: client_id,
        available_agents: Array.from(this.agents.keys())
    });
}

handleCommand(ws, message) {
    const { agent_id, command, command_id } = message;
    
    if (!agent_id || !command) {
        this.sendError(ws, 'agent_id and command are required');
        return;
    }
    
    // Use client-provided command_id or generate one
    const finalCommandId = command_id || uuidv4();
    
    // Check if agent is connected
    const agentWs = this.agents.get(agent_id);
    if (!agentWs) {
        this.log(`Agent ${agent_id} not found. Available agents: ${Array.from(this.agents.keys()).join(', ')}`);
        this.sendError(ws, `Agent ${agent_id} is not available`);
        return;
    }
    
    if (agentWs.readyState !== WebSocket.OPEN) {
        this.log(`Agent ${agent_id} WebSocket not open. State: ${agentWs.readyState}`);
        this.sendError(ws, `Agent ${agent_id} is not available`);
        return;
    }
    
    // Store the client connection for this command
    this.pendingCommands.set(finalCommandId, ws);
    
    // Forward command to agent
    const commandMessage = {
        type: 'command',
        command_id: finalCommandId,
        command: command,
        timestamp: new Date().toISOString()
    };
    
    try {
        this.sendMessage(agentWs, commandMessage);
        this.log(`Command ${finalCommandId} forwarded to agent ${agent_id}: ${command}`);
        
        // Set timeout for command response
        setTimeout(() => {
            if (this.pendingCommands.has(finalCommandId)) {
                this.pendingCommands.delete(finalCommandId);
                this.log(`Command ${finalCommandId} timed out for agent ${agent_id}`);
                this.sendError(ws, `Command timeout for agent ${agent_id}`);
            }
        }, 30000); // 30 second timeout
        
    } catch (error) {
        this.pendingCommands.delete(finalCommandId);
        this.log(`Failed to send command to agent ${agent_id}: ${error.message}`);
        this.sendError(ws, `Failed to send command to agent ${agent_id}`);
    }
}

handleCommandResponse(ws, message) {
    const { command_id } = message;
    
    if (!command_id) {
        this.log('Received command response without command_id');
        return;
    }
    
    // Find the client waiting for this response
    const clientWs = this.pendingCommands.get(command_id);
    if (!clientWs) {
        this.log(`No pending client for command ${command_id}`);
        return;
    }
    
    // Forward response to client
    try {
        this.sendMessage(clientWs, message);
        this.log(`Response for command ${command_id} forwarded to client`);
    } catch (error) {
        this.log(`Error forwarding response: ${error.message}`);
    } finally {
        // Clean up pending command
        this.pendingCommands.delete(command_id);
    }
}

handleDisconnection(ws) {
    // Clean up agent
    if (ws.agent_id) {
        this.agents.delete(ws.agent_id);
        this.log(`Agent ${ws.agent_id} disconnected`);
    }
    
    // Clean up client
    if (ws.client_id) {
        this.clients.delete(ws.client_id);
        this.log(`Client ${ws.client_id} disconnected`);
    }
    
    // Clean up pending commands for this client
    const commandsToDelete = [];
    for (const [command_id, client_ws] of this.pendingCommands.entries()) {
        if (client_ws === ws) {
            commandsToDelete.push(command_id);
        }
    }
    
    commandsToDelete.forEach(command_id => {
        this.pendingCommands.delete(command_id);
    });
    
    if (commandsToDelete.length > 0) {
        this.log(`Cleaned up ${commandsToDelete.length} pending commands`);
    }
    
    // Broadcast updated agent list if an agent disconnected
    if (ws.agent_id) {
        this.broadcastAgentList();
    }
}

sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

sendError(ws, errorMessage) {
    this.sendMessage(ws, {
        type: 'error',
        message: errorMessage,
        timestamp: new Date().toISOString()
    });
}

start() {
    this.server.listen(this.port, () => {
        this.log(`Relay server started on port ${this.port}`);
        this.log(`WebSocket endpoint: ws://localhost:${this.port}`);
        this.log(`HTTP endpoint: http://localhost:${this.port}`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        this.log('Shutting down server...');
        this.server.close(() => {
            process.exit(0);
        });
    });
}
}

// Start the server
const server = new RelayServer(process.env.PORT || 8888);
server.start();