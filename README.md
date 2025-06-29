# WebSocket Relay System

A WebSocket-based relay system that allows remote command execution through a central relay server.

## Components

- **relay-server.js**: Node.js relay server that handles WebSocket connections
- **websocket_agent.py**: Python agent that connects to the relay and executes commands
- **websocket_client.py**: Python client that sends commands to agents through the relay

## Setup

### Prerequisites

1. **Node.js** (for relay server)
   ```bash
   npm install express ws uuid
   ```

2. **Python** (for agent and client)
   ```bash
   pip install websockets requests
   ```

### Running the System

0. **Install websockets in python**:
    ```bash
    pip install websockets
    ```

1. **Start the relay server**:
   ```bash
   node relay-server.js
   ```

2. **Start an agent** (on the target machine):
   ```bash
   python websocket_agent.py <relay_server_ip> [port] [agent_id]
   ```

3. **Start the client**:
   ```bash
   python websocket_client.py <relay_server_ip> [port]
   ```

## Usage

### Client Commands

- `list` - Show available agents
- `quit` - Exit the client
- `<agent_id> <command>` - Execute command on specific agent

Example:
```
remote> list
Available agents: agent1, agent2

remote> agent1 dir
remote> agent1 cd /tmp
remote> agent1 pwd
```

## Troubleshooting

### Issue: "No agents are connected" when running `list`

**Possible causes:**
1. Agent hasn't connected yet
2. Agent connection failed
3. Timing issue with registration

**Debugging steps:**
1. Check if relay server is running:
   ```bash
   python check_server.py <relay_server_ip>
   ```

2. Test WebSocket connection:
   ```bash
   python test_connection.py <relay_server_ip>
   ```

3. Check relay server logs for agent registration messages

4. Ensure agent is running and connected:
   - Look for "Agent X registered" in relay server logs
   - Check agent logs for connection success

### Issue: Commands timeout

**Possible causes:**
1. Agent not receiving commands
2. Agent not sending responses
3. WebSocket connection issues

**Debugging steps:**
1. Check relay server logs for command forwarding
2. Check agent logs for command reception
3. Verify WebSocket state in both agent and client

### Common Solutions

1. **Restart all components** in this order:
   - Relay server
   - Agent
   - Client

2. **Check network connectivity**:
   - Ensure relay server is accessible from agent and client
   - Check firewall settings

3. **Verify agent ID**:
   - Use the same agent ID consistently
   - Check for typos in agent ID when sending commands

## Debugging Tools

- `check_server.py` - Check relay server HTTP endpoints
- `test_connection.py` - Test basic WebSocket connectivity

## Logs

The system provides detailed logging:
- Relay server logs show connections, registrations, and command flow
- Agent logs show command execution and responses
- Client logs show command sending and response reception

Check these logs when troubleshooting issues. 