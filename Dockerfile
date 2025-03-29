# Use a lightweight Python base image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV HF_HOME="/tmp/huggingface/cache"
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES="-1"  # Force CPU mode for compatibility

# Create Hugging Face cache directory with proper permissions
RUN mkdir -p /tmp/huggingface/cache && \
    chmod -R 777 /tmp/huggingface/cache && \
    apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create models directory if it doesn't exist
RUN mkdir -p models

# Ensure permissions for application files
RUN chmod -R 755 /app

# Expose application port (Hugging Face Spaces uses port 7860)
EXPOSE 7860

# Create a script to run the application
RUN echo '#!/bin/bash\n\
# Check if model files exist\n\
if [ ! -f "models/mobilenetv2_ham10000_finetuned_74.h5" ] || [ ! -f "models/efficientnetb0_skin_cancer_model_final_69.keras" ]; then\n\
  echo "Warning: Model files not found. Please ensure models are uploaded to the models directory."\n\
fi\n\
\n\
# Run the Flask application\n\
flask run --host=0.0.0.0 --port=7860\n\
' > /app/start.sh && chmod +x /app/start.sh

# Run the Flask application
CMD ["/app/start.sh"]
