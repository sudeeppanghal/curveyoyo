FROM python:3.9-slim

# Install system dependencies (ffmpeg, curl, and OpenGL/Glib libraries for OpenCV headless)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set up user permissions for Hugging Face container environment
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy and install python requirements
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application script
COPY --chown=user main.py .

# Create downloads folder for static output files
RUN mkdir -p downloads

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
