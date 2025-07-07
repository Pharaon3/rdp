#!/usr/bin/env python3
"""
Script to check relay server HTTP endpoints
"""

import requests
import sys
import json

def check_server(host, port):
    """Check relay server endpoints"""
    base_url = f"http://{host}:{port}"
    
    try:
        # Check health endpoint
        print(f"Checking health endpoint: {base_url}/health")
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"Health check successful:")
            print(f"  Status: {data.get('status')}")
            print(f"  Agents: {data.get('agents')}")
            print(f"  Clients: {data.get('clients')}")
            print(f"  Pending Commands: {data.get('pendingCommands')}")
        else:
            print(f"Health check failed: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"Failed to connect to server: {e}")
        
    try:
        # Check agents endpoint
        print(f"\nChecking agents endpoint: {base_url}/agents")
        response = requests.get(f"{base_url}/agents", timeout=5)
        if response.status_code == 200:
            agents = response.json()
            print(f"Agents endpoint successful:")
            for agent in agents:
                print(f"  Agent: {agent.get('id')} (connected: {agent.get('connected')})")
        else:
            print(f"Agents endpoint failed: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"Failed to connect to agents endpoint: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python check_server.py <relay_server_ip> [port]")
        sys.exit(1)
        
    host = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 3000
    
    check_server(host, port)

if __name__ == "__main__":
    main() 