FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create volume mount point for models
RUN mkdir -p /workspace/models

# Expose port
EXPOSE 8080

# Set environment variables
ENV MOUNT_DIR=/workspace
ENV PORT=8080

# Run the application in reload mode for local debugging
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]