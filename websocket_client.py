#!/usr/bin/env python3
"""
WebSocket Client - Sends commands to agents through the Node.js relay server
Fixed version with proper response handling
"""

import asyncio
import websockets
import json
import sys
import uuid
from datetime import datetime

class WebSocketClient:
    def __init__(self, relay_host, relay_port=3000):
        self.relay_host = relay_host
        self.relay_port = relay_port
        self.client_id = str(uuid.uuid4())[:8]
        self.websocket = None
        self.available_agents = []
        self.pending_responses = {}  # command_id -> Future
        self.message_handler_task = None
        
    def log(self, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")
    
    async def send_message(self, message):
        """Send message to relay server"""
        if self.websocket:
            try:
                # Check if websocket is open using the correct method
                if hasattr(self.websocket, 'closed'):
                    is_open = not self.websocket.closed
                elif hasattr(self.websocket, 'open'):
                    is_open = self.websocket.open
                else:
                    # For websockets library, we can try to send and catch exceptions
                    is_open = True
                
                if is_open:
                    await self.websocket.send(json.dumps(message))
                else:
                    self.log("WebSocket is not open, cannot send message")
            except Exception as e:
                self.log(f"Error sending message: {e}")
        else:
            self.log("No WebSocket connection available")
    
    async def handle_message(self, message_data):
        """Handle incoming messages from relay server"""
        try:
            message = json.loads(message_data)
            message_type = message.get('type')
            
            if message_type == 'welcome':
                self.log("Connected to relay server")
                
            elif message_type == 'register_ack':
                if message.get('status') == 'success':
                    self.available_agents = message.get('available_agents', [])
                    self.log(f"Registered as client {self.client_id}")
                    if self.available_agents:
                        self.log(f"Available agents: {', '.join(self.available_agents)}")
                    else:
                        self.log("No agents currently available")
                        
            elif message_type == 'agent_list_update':
                self.available_agents = message.get('agents', [])
                self.log(f"Agent list updated: {', '.join(self.available_agents) if self.available_agents else 'No agents'}")
                        
            elif message_type == 'command_response':
                command_id = message.get('command_id')
                agent_id = message.get('agent_id')
                command = message.get('command')
                result = message.get('result')
                current_dir = message.get('current_dir')
                
                print(f"\n--- Response from agent {agent_id} (cmd_id: {command_id}) ---")
                print(f"Command: {command}")
                print(f"Current directory: {current_dir}")
                print(f"Result:\n{result}")
                print("--- End of response ---")
                
                # Signal that we received the response
                if command_id and command_id in self.pending_responses:
                    print(f"Completing pending response for command {command_id}")
                    future = self.pending_responses[command_id]
                    if not future.done():
                        future.set_result(message)
                    del self.pending_responses[command_id]
                else:
                    print(f"Warning: No pending response found for command_id {command_id}")
                    print(f"Pending responses: {list(self.pending_responses.keys())}")
                    # If no command_id match, complete any pending response (fallback)
                    if self.pending_responses:
                        command_id_fallback = list(self.pending_responses.keys())[0]
                        print(f"Using fallback completion for {command_id_fallback}")
                        future = self.pending_responses[command_id_fallback]
                        if not future.done():
                            future.set_result(message)
                        del self.pending_responses[command_id_fallback]
                
            elif message_type == 'error':
                error_msg = message.get('message')
                print(f"Error: {error_msg}")
                
                # Check if this error is for a pending command
                # Since errors might not have command_id, we'll complete the most recent pending command
                if self.pending_responses:
                    # Get the most recent pending response
                    command_id = list(self.pending_responses.keys())[-1]
                    future = self.pending_responses[command_id]
                    if not future.done():
                        future.set_exception(Exception(error_msg))
                    del self.pending_responses[command_id]
                
        except Exception as e:
            self.log(f"Error handling message: {e}")
    
    async def send_command_and_wait(self, agent_id, command):
        """Send a command to a specific agent and wait for response"""
        command_id = str(uuid.uuid4())
        command_msg = {
            'type': 'command',
            'agent_id': agent_id,
            'command': command,
            'command_id': command_id  # Include command_id in the message
        }
        
        # Create a future for this command
        response_future = asyncio.Future()
        self.pending_responses[command_id] = response_future
        
        print(f"Sending command to agent {agent_id}: {command} (ID: {command_id})")
        await self.send_message(command_msg)
        print(f"Waiting for response... (pending: {len(self.pending_responses)})")
        
        try:
            # Wait for response with timeout
            response = await asyncio.wait_for(response_future, timeout=30.0)
            return True
        except asyncio.TimeoutError:
            print("Timeout: No response received within 30 seconds")
            if command_id in self.pending_responses:
                del self.pending_responses[command_id]
            return False
        except Exception as e:
            print(f"Command failed: {e}")
            if command_id in self.pending_responses:
                del self.pending_responses[command_id]
            return False
    
    async def get_user_input(self):
        """Get user input asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, input, "remote> ")
    
    async def interactive_mode(self):
        """Run in interactive mode with proper response handling"""
        print(f"Connected to relay server at {self.relay_host}:{self.relay_port}")
        print("Enter commands in the format: <agent_id> <command>")
        print("Special commands:")
        print("  list - show available agents")
        print("  quit - exit the client")
        print("Example: myserver01 cd /tmp\n")
        
        while True:
            try:
                # Get user input
                user_input = await self.get_user_input()
                user_input = user_input.strip()
                
                if user_input.lower() in ['quit', 'exit', 'q']:
                    break
                elif user_input.lower() == 'list':
                    if self.available_agents:
                        print(f"Available agents: {', '.join(self.available_agents)}")
                    else:
                        print("No agents currently available")
                    continue
                    
                if not user_input:
                    continue
                    
                # Parse input
                parts = user_input.split(' ', 1)
                if len(parts) < 2:
                    print("Usage: <agent_id> <command>")
                    continue
                    
                agent_id, command = parts
                
                # Send command and wait for response
                await self.send_command_and_wait(agent_id, command)
                
            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
            except Exception as e:
                print(f"Error: {e}")
    
    async def single_command_mode(self, agent_id, command):
        """Send a single command and wait for response"""
        success = await self.send_command_and_wait(agent_id, command)
        return success
    
    async def handle_messages_continuously(self):
        """Handle incoming messages continuously"""
        try:
            async for message in self.websocket:
                await self.handle_message(message)
        except websockets.exceptions.ConnectionClosed:
            self.log("Connection closed")
        except Exception as e:
            self.log(f"Message handling error: {e}")
    
    async def connect_and_run(self, agent_id=None, command=None):
        """Connect to relay server and run client"""
        uri = f"ws://{self.relay_host}:{self.relay_port}"
        
        try:
            async with websockets.connect(uri) as websocket:
                self.websocket = websocket
                
                # Register as client
                register_msg = {
                    'type': 'client_register',
                    'client_id': self.client_id
                }
                
                await self.send_message(register_msg)
                
                # Start message handler task
                self.message_handler_task = asyncio.create_task(
                    self.handle_messages_continuously()
                )
                
                # Wait a bit for registration
                await asyncio.sleep(0.5)
                
                if agent_id and command:
                    # Single command mode
                    await self.single_command_mode(agent_id, command)
                else:
                    # Interactive mode
                    await self.interactive_mode()
                
                # Cancel message handler
                if self.message_handler_task:
                    self.message_handler_task.cancel()
                    try:
                        await self.message_handler_task
                    except asyncio.CancelledError:
                        pass
                
        except Exception as e:
            self.log(f"Connection error: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python websocket_client.py <relay_server_ip> [relay_port] [agent_id] [command]")
        print("  If agent_id and command are provided, runs in single command mode")
        print("  Otherwise, runs in interactive mode")
        sys.exit(1)
        
    relay_host = sys.argv[1]
    relay_port = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 3000
    
    # Check if we have agent_id and command for single command mode
    if len(sys.argv) >= 4:
        agent_id = sys.argv[2] if not sys.argv[2].isdigit() else sys.argv[3]
        command = ' '.join(sys.argv[3:] if not sys.argv[2].isdigit() else sys.argv[4:])
        relay_port = int(sys.argv[2]) if sys.argv[2].isdigit() else 3000
    else:
        agent_id = None
        command = None
    
    client = WebSocketClient(relay_host, relay_port)
    
    # Install websockets if not available
    try:
        import websockets
    except ImportError:
        print("Please install websockets: pip install websockets")
        sys.exit(1)
    
    # Run the client
    asyncio.run(client.connect_and_run(agent_id, command))

if __name__ == "__main__":
    main()