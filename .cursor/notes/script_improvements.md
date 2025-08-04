# Script Improvements and Process Management

## run_invoke_ai_web.sh Enhancements

### PID Tracking and Signal Forwarding

**Implementation Date**: 2025-01-03

Enhanced the main startup script with proper process lifecycle management:

#### Key Features

- **PID Tracking**: Captures and stores process IDs of all background services
- **Signal Handling**: Traps SIGTERM, SIGINT, and SIGQUIT signals
- **Graceful Shutdown**: Attempts graceful termination before force-killing processes
- **Process Monitoring**: Verifies process status before attempting to kill

#### Technical Implementation

```bash
# Array to store PIDs
PIDS=()

# Capture PID after starting service
nohup service_command &
SERVICE_PID=$!
PIDS+=($SERVICE_PID)

# Signal trap for cleanup
trap cleanup SIGTERM SIGINT SIGQUIT
```

#### Services Managed

1. **Civitai Model Loader** (Python FastAPI)

   - Port: 8081 (configurable via CIVIT_MODEL_LOADER_PORT)
   - Command: `python /civit_model_loader/main.py --port ${CIVIT_MODEL_LOADER_PORT}`

2. **InvokeAI Web Interface**
   - Command: `invokeai-web --root "${INVOKE_AI_DIR}"`

#### Cleanup Process

1. **Signal Reception**: Catches termination signals
2. **Graceful Shutdown**: Sends SIGTERM to each tracked PID
3. **Wait Period**: 2-second grace period for clean shutdown
4. **Force Kill**: SIGKILL for any remaining processes
5. **Exit**: Clean script termination

#### Benefits

- **Container Safety**: Proper cleanup when container stops
- **Development Friendly**: Ctrl+C cleanly stops all services
- **Process Hygiene**: No orphaned background processes
- **Logging**: Clear feedback about process lifecycle

#### Usage

The script now provides user feedback:

```
Started Civitai Model Loader with PID: 12345
Started InvokeAI web interface with PID: 12346
All services started. PIDs: 12345 12346
Use Ctrl+C to stop all services gracefully
```

This enhancement ensures reliable service management in both development and production Docker environments.
