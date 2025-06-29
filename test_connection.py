#!/usr/bin/env python3
"""
Simple test script to verify WebSocket connections
"""

import asyncio
import websockets
import json
import sys

async def test_websocket_connection(host, port):
    """Test basic WebSocket connection"""
    uri = f"ws://{host}:{port}"
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri}")
            
            # Wait for welcome message
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"Received: {data}")
            except asyncio.TimeoutError:
                print("No welcome message received within 5 seconds")
            
            # Test ping
            ping_msg = {'type': 'ping'}
            await websocket.send(json.dumps(ping_msg))
            print("Sent ping")
            
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"Ping response: {data}")
            except asyncio.TimeoutError:
                print("No ping response received within 5 seconds")
                
    except Exception as e:
        print(f"Connection failed: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_connection.py <relay_server_ip> [port]")
        sys.exit(1)
        
    host = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8888
    
    asyncio.run(test_websocket_connection(host, port))

if __name__ == "__main__":
    main() 