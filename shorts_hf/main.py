
import os
import re
import time
import uuid
import urllib.request
import subprocess
import glob
import json
import requests
import cv2
import numpy as np
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="YoYo Shorts & Reframe Studio")

# Self-update yt-dlp at startup to bypass YouTube security restrictions
try:
    print("Updating yt-dlp to the latest version...")
    import subprocess
    subprocess.run(["pip", "install", "-U", "yt-dlp", "bgutil-ytdlp-pot-provider"], capture_output=True, text=True, timeout=30)
    print("yt-dlp updated successfully.")
except Exception as e:
    print("Failed to self-update yt-dlp at startup:", e)


API_SECRET = "yoyosmm_shorts_secret_abc123"

# Serve the downloads directory statically
os.makedirs("downloads", exist_ok=True)
app.mount("/download", StaticFiles(directory="downloads"), name="download")

def parse_time_to_seconds(time_str: str) -> int:
    try:
        parts = list(map(int, time_str.split(':')))
        if len(parts) == 1:
            return parts[0]
        elif len(parts) == 2:
            return parts[0] * 60 + parts[1]
        elif len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        return int(float(time_str))
    except Exception:
        raise ValueError("Invalid time format. Use seconds (e.g. 90) or MM:SS (e.g. 01:30)")

def download_google_drive(url: str, output_path: str) -> bool:
    """Download public files from Google Drive using direct URL parsing."""
    file_id = None
    match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
    if match:
        file_id = match.group(1)
    else:
        match = re.search(r'id=([a-zA-Z0-9_-]+)', url)
        if match:
            file_id = match.group(1)
            
    if not file_id:
        return False
        
    download_url = f"https://docs.google.com/uc?export=download&confirm=t&id={file_id}"
    try:
        opener = urllib.request.build_opener()
        opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')]
        urllib.request.install_opener(opener)
        urllib.request.urlretrieve(download_url, output_path)
        return True
    except Exception as e:
        print("Google Drive Direct Download Failed:", e)
        return False

def extract_transcript(url: str, job_id: str) -> str:
    """Extract YouTube automatic captions/subtitles as parsed SRT transcript text."""
    sub_base = f"sub_{job_id}"
    try:
        ytdlp_cmd = [
            "yt-dlp",
            "--write-auto-subs",
            "--skip-download",
            "--sub-format", "srt",
            "--extractor-args", "youtube:player_client=tv,web_embedded",
            "--impersonate", "chrome",
            "-o", sub_base,
            url
        ]
        subprocess.run(ytdlp_cmd, capture_output=True, text=True, timeout=20)
        
        srt_files = glob.glob(f"{sub_base}.*.srt")
        if not srt_files:
            return ""
            
        srt_file = srt_files[0]
        with open(srt_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        transcript = []
        current_time = "00:00"
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if "-->" in line:
                match = re.search(r'(\d{2}:\d{2}):\d{2}', line)
                if match:
                    current_time = match.group(1)
            elif not line.isdigit():
                clean_text = re.sub(r'<[^>]+>', '', line).strip()
                if clean_text:
                    transcript.append(f"[{current_time}] {clean_text}")
                    
        # Cleanup subtitle files
        for f in glob.glob(f"{sub_base}.*"):
            try:
                os.remove(f)
            except Exception:
                pass
                
        return "\n".join(transcript[:1500]) # Limit length for model context
    except Exception as e:
        print("Failed to extract transcript:", e)
        return ""

def get_engaging_segments(transcript: str, gemini_key: str):
    """Query Gemini to analyze transcripts and extract the top 3 most engaging shorts."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
    prompt = f"""
You are a viral social media video editor. I will give you a video transcript with timestamps.
Analyze the transcript and identify the top 3 most engaging, self-contained segments that would make great TikTok/YouTube Shorts.
For each segment, provide:
1. Start time in format MM:SS or HH:MM:SS
2. Duration of the clip in seconds (must be between 25 and 58 seconds)
3. A viral, attention-grabbing short title.

Transcript:
{transcript}

Respond ONLY with a JSON array in this format:
[
  {{"start": "01:20", "duration": 30, "title": "Viral Hook Title"}}
]
Do not include any markdown backticks or extra text, just the raw JSON array.
"""
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }]
    }
    try:
        res = requests.post(url, json=payload, timeout=25)
        if res.status_code == 200:
            content = res.json()
            text = content['candidates'][0]['content']['parts'][0]['text'].strip()
            text = re.sub(r'^```json\s*', '', text)
            text = re.sub(r'\s*```$', '', text)
            return json.loads(text)
    except Exception as e:
        print("Gemini API call failed:", e)
    return None

def auto_reframe_video(input_path: str, aspect_ratio: str, auto_reframe: bool) -> str:
    """Crop video with smooth AI Face-tracking (reframe) using OpenCV Haar Cascades."""
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise Exception("Failed to open input video file")
        
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    
    # Determine target dimensions
    if aspect_ratio == "9:16":
        target_w = int(height * 9 / 16)
        target_w = (target_w // 2) * 2 # Ensure even
        target_h = height
    elif aspect_ratio == "1:1":
        target_w = height
        target_h = height
    else: # 16:9 Landscape - no cropping needed
        cap.release()
        return None

    # Handle portrait source video boundaries
    if target_w > width:
        target_w = width
        if aspect_ratio == "9:16":
            target_h = int(width * 16 / 9)
            target_h = (target_h // 2) * 2
            if target_h > height:
                target_h = height
        else:
            target_h = width

    temp_video = f"temp_render_{uuid.uuid4()}.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_video, fourcc, fps, (target_w, target_h))
    
    # Load OpenCV Face Cascade
    face_cascade = None
    if auto_reframe:
        try:
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        except Exception as e:
            print("Failed to load Face Cascade:", e)
            
    smooth_x = (width - target_w) // 2
    alpha = 0.12 # Smooth camera panning factor
    
    frame_idx = 0
    last_face_x = smooth_x + (target_w // 2)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        target_x = (width - target_w) // 2
        
        # Track face every 5 frames to keep processing fast
        if auto_reframe and face_cascade is not None and frame_idx % 5 == 0:
            small_frame = cv2.resize(frame, (320, 240))
            gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))
            
            if len(faces) > 0:
                largest_face = max(faces, key=lambda f: f[2] * f[3])
                (fx, fy, fw, fh) = largest_face
                face_center_x = int((fx + fw / 2) * (width / 320.0))
                last_face_x = face_center_x
                
            target_x = last_face_x - (target_w // 2)
            
        # Interpolate coordinates smoothly
        smooth_x = int(alpha * target_x + (1 - alpha) * smooth_x)
        smooth_x = max(0, min(width - target_w, smooth_x))
        
        start_y = (height - target_h) // 2
        cropped_frame = frame[start_y:start_y+target_h, smooth_x:smooth_x+target_w]
        out.write(cropped_frame)
        frame_idx += 1
        
    cap.release()
    out.release()
    return temp_video

def cleanup_old_files():
    """Delete files in the downloads directory that are older than 15 minutes."""
    now = time.time()
    for filename in os.listdir("downloads"):
        filepath = os.path.join("downloads", filename)
        if os.path.isfile(filepath):
            if now - os.path.getmtime(filepath) > 900:
                try:
                    os.remove(filepath)
                    print(f"Deleted expired clip: {filename}")
                except Exception as e:
                    print(f"Failed to delete {filename}: {e}")

# Advanced UI HTML
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YoYo Shorts & Reframe Studio</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
        }
        body {
            background: linear-gradient(135deg, #090d16 0%, #111827 50%, #2e1065 100%);
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: rgba(17, 24, 39, 0.55);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 28px;
            width: 100%;
            max-width: 1000px;
            padding: 40px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
            display: grid;
            grid-template-columns: 1fr;
            gap: 35px;
        }
        @media(min-width: 768px) {
            .container {
                grid-template-columns: 1fr 1fr;
            }
        }
        .header {
            grid-column: 1 / -1;
            text-align: center;
            margin-bottom: 5px;
        }
        .header h1 {
            font-size: 2.8rem;
            font-weight: 800;
            background: linear-gradient(to right, #8b5cf6, #d946ef, #ff007f);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 12px;
        }
        .header p {
            color: #94a3b8;
            font-size: 1.15rem;
        }
        .form-section {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .form-group label {
            font-weight: 600;
            font-size: 0.85rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1.5px;
        }
        .form-group input, .form-group select {
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 14px;
            padding: 15px 18px;
            color: #f8fafc;
            font-size: 1rem;
            outline: none;
            transition: all 0.3s ease;
        }
        .form-group input:focus, .form-group select:focus {
            border-color: #d946ef;
            box-shadow: 0 0 12px rgba(217, 70, 239, 0.25);
        }
        .mode-selector {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 5px;
        }
        .mode-btn {
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px;
            color: #cbd5e1;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
            transition: all 0.3s ease;
        }
        .mode-btn.active {
            background: rgba(139, 92, 246, 0.2);
            border-color: #8b5cf6;
            color: #fff;
        }
        .toggle-group {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 15px 18px;
        }
        .toggle-group label {
            font-weight: 600;
            font-size: 0.95rem;
            color: #cbd5e1;
        }
        .switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 26px;
        }
        .switch input { 
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #334155;
            transition: .4s;
            border-radius: 34px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider:before {
            transform: translateX(24px);
        }
        input:checked + .slider {
            background-color: #8b5cf6;
        }
        .btn-submit {
            background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #ff007f 100%);
            border: none;
            border-radius: 14px;
            padding: 18px;
            color: white;
            font-size: 1.15rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(217, 70, 239, 0.3);
            margin-top: 10px;
        }
        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(217, 70, 239, 0.55);
        }
        .btn-submit:disabled {
            background: #475569;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .preview-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(15, 23, 42, 0.4);
            border: 1px dashed rgba(255, 255, 255, 0.12);
            border-radius: 20px;
            padding: 25px;
            min-height: 440px;
            position: relative;
        }
        .preview-placeholder {
            text-align: center;
            color: #64748b;
        }
        .preview-placeholder svg {
            width: 54px;
            height: 54px;
            margin-bottom: 15px;
            stroke: #475569;
        }
        .video-container {
            display: none;
            width: 100%;
            flex-direction: column;
            gap: 20px;
        }
        .video-container video {
            width: 100%;
            max-height: 380px;
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: #000;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
        }
        .shorts-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
            width: 100%;
        }
        .short-item {
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }
        .short-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .short-title {
            font-weight: 600;
            color: #fff;
            font-size: 0.95rem;
        }
        .short-meta {
            font-size: 0.8rem;
            color: #94a3b8;
        }
        .btn-download-sm {
            background: #10b981;
            color: white;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.85rem;
            transition: all 0.3s ease;
        }
        .btn-download-sm:hover {
            background: #059669;
        }
        .btn-download {
            background: #10b981;
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.3s ease;
            text-align: center;
            display: inline-block;
            width: 100%;
        }
        .btn-download:hover {
            background: #059669;
        }
        .status-box {
            margin-top: 15px;
            padding: 14px;
            border-radius: 10px;
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.15);
            color: #f87171;
            display: none;
            font-size: 0.9rem;
            width: 100%;
            line-height: 1.4;
        }
        .loader {
            display: none;
            flex-direction: column;
            align-items: center;
            gap: 18px;
        }
        .spinner {
            width: 55px;
            height: 55px;
            border: 5px solid rgba(255, 255, 255, 0.08);
            border-top-color: #d946ef;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .progress-text {
            color: #cbd5e1;
            font-size: 0.95rem;
            font-weight: 500;
            text-align: center;
            max-width: 250px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>YoYo Reframe Studio</h1>
            <p>Direct download, crop, or let AI generate multiple vertical shorts from horizontal videos</p>
        </div>
        
        <div class="form-section">
            <label style="font-weight: 600; font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">Studio Mode</label>
            <div class="mode-selector">
                <div class="mode-btn active" id="mode-manual" onclick="setMode('manual')">Manual Crop</div>
                <div class="mode-btn" id="mode-auto" onclick="setMode('auto')">AI Auto Shorts</div>
            </div>

            <div class="form-group">
                <label for="url">Video Link</label>
                <input type="text" id="url" placeholder="YouTube, Drive, FB, Insta, TikTok URL..." required>
            </div>
            
            <div id="manual-inputs" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label for="start">Start Time</label>
                    <input type="text" id="start" placeholder="e.g. 01:20 or 80">
                </div>
                <div class="form-group">
                    <label for="duration">Duration (Sec)</label>
                    <input type="number" id="duration" placeholder="e.g. 30" min="5" max="60" value="30">
                </div>
            </div>

            <div id="auto-inputs" style="display: none;" class="form-group">
                <label for="gemini-key">Gemini API Key</label>
                <input type="password" id="gemini-key" placeholder="Enter Gemini key to find moments...">
            </div>

            <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                <div class="form-group">
                    <label for="aspect">Aspect Ratio</label>
                    <select id="aspect">
                        <option value="9:16">Vertical (9:16) - Shorts/Reels</option>
                        <option value="1:1">Square (1:1) - Post/Feed</option>
                        <option value="16:9">Landscape (16:9) - Standard Trim</option>
                    </select>
                </div>
            </div>

            <div class="toggle-group">
                <label for="reframe">Smooth AI Face-Tracking</label>
                <label class="switch">
                    <input type="checkbox" id="reframe" checked>
                    <span class="slider"></span>
                </label>
            </div>

            <div class="form-group">
                <label for="secret">Access Secret</label>
                <input type="password" id="secret" placeholder="Enter API secret..." required>
            </div>
            
            <button class="btn-submit" id="btn-submit" onclick="startConversion()">Process Video</button>
            <div class="status-box" id="status-box"></div>
        </div>

        <div class="preview-section">
            <div class="preview-placeholder" id="preview-placeholder">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <p>Output Video Preview</p>
            </div>

            <div class="loader" id="loader">
                <div class="spinner"></div>
                <div class="progress-text" id="progress-text">Analyzing & downloading stream...</div>
            </div>

            <!-- Manual Single Video Output -->
            <div class="video-container" id="video-container">
                <video id="output-video" controls autoplay loop muted></video>
                <a href="#" class="btn-download" id="btn-download" download>Download Output Clip</a>
            </div>

            <!-- Auto AI Multi Video List Output -->
            <div class="video-container" id="auto-results-container">
                <h3 style="font-weight: 600; margin-bottom: 15px; background: linear-gradient(to right, #8b5cf6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">AI Generated Shorts</h3>
                <div class="shorts-list" id="shorts-list"></div>
            </div>
        </div>
    </div>

    <script>
        let currentMode = 'manual';

        function setMode(mode) {
            currentMode = mode;
            document.getElementById('mode-manual').classList.toggle('active', mode === 'manual');
            document.getElementById('mode-auto').classList.toggle('active', mode === 'auto');
            document.getElementById('manual-inputs').style.display = mode === 'manual' ? 'grid' : 'none';
            document.getElementById('auto-inputs').style.display = mode === 'auto' ? 'block' : 'none';
        }

        async function startConversion() {
            const urlVal = document.getElementById('url').value.trim();
            const aspectVal = document.getElementById('aspect').value;
            const reframeVal = document.getElementById('reframe').checked;
            const secVal = document.getElementById('secret').value.trim();

            const statusBox = document.getElementById('status-box');
            const submitBtn = document.getElementById('btn-submit');
            const placeholder = document.getElementById('preview-placeholder');
            const loader = document.getElementById('loader');
            const progressText = document.getElementById('progress-text');
            const videoContainer = document.getElementById('video-container');
            const autoResultsContainer = document.getElementById('auto-results-container');
            const videoPlayer = document.getElementById('output-video');
            const downloadBtn = document.getElementById('btn-download');

            statusBox.style.display = 'none';
            videoContainer.style.display = 'none';
            autoResultsContainer.style.display = 'none';
            placeholder.style.display = 'none';
            loader.style.display = 'flex';
            submitBtn.disabled = true;

            if(!urlVal || !secVal) {
                showError("Please enter video link and access secret.");
                return;
            }

            if (currentMode === 'manual') {
                const startVal = document.getElementById('start').value.trim();
                const durVal = document.getElementById('duration').value.trim();
                if (!startVal || !durVal) {
                    showError("Please enter start time and duration.");
                    return;
                }

                progressText.innerText = "Processing video stream. Running face tracking reframer (takes ~15-45 seconds)...";

                try {
                    const apiPath = `/crop?url=${encodeURIComponent(urlVal)}&start=${encodeURIComponent(startVal)}&duration=${durVal}&aspect=${aspectVal}&reframe=${reframeVal}&secret=${encodeURIComponent(secVal)}`;
                    const response = await fetch(apiPath);
                    const data = await response.json();

                    if (data && data.success) {
                        loader.style.display = 'none';
                        videoContainer.style.display = 'flex';
                        videoPlayer.src = data.downloadUrl;
                        downloadBtn.href = data.downloadUrl;
                        videoPlayer.load();
                    } else {
                        showError(data.error || "An error occurred during video processing.");
                    }
                } catch (err) {
                    showError("Connection failed. Make sure the secret key is correct.");
                }
            } else {
                // AI Auto Shorts Mode
                const geminiKey = document.getElementById('gemini-key').value.trim();
                if (!geminiKey) {
                    showError("Please enter your Gemini API Key to run transcription analysis.");
                    return;
                }

                progressText.innerText = "Extracting video transcript, prompting Gemini, and reframing multiple shorts. This takes ~45-90 seconds...";

                try {
                    const apiPath = `/auto-shorts?url=${encodeURIComponent(urlVal)}&gemini_key=${encodeURIComponent(geminiKey)}&aspect=${aspectVal}&reframe=${reframeVal}&secret=${encodeURIComponent(secVal)}`;
                    const response = await fetch(apiPath);
                    const data = await response.json();

                    if (data && data.success) {
                        loader.style.display = 'none';
                        autoResultsContainer.style.display = 'flex';
                        const listDiv = document.getElementById('shorts-list');
                        listDiv.innerHTML = '';

                        data.shorts.forEach(short => {
                            const item = document.createElement('div');
                            item.className = 'short-item';
                            item.innerHTML = `
                                <div class="short-info">
                                    <div class="short-title">${short.title}</div>
                                    <div class="short-meta">Start: ${short.start} | Duration: ${short.duration}s</div>
                                </div>
                                <a href="${short.downloadUrl}" class="btn-download-sm" target="_blank" download>Download</a>
                            `;
                            listDiv.appendChild(item);
                        });
                    } else {
                        showError(data.error || "Failed to generate AI shorts. Verify the video has subtitles.");
                    }
                } catch (err) {
                    showError("Connection failed or request timed out.");
                }
            }
        }

        function showError(msg) {
            const statusBox = document.getElementById('status-box');
            const submitBtn = document.getElementById('btn-submit');
            const placeholder = document.getElementById('preview-placeholder');
            const loader = document.getElementById('loader');
            
            loader.style.display = 'none';
            placeholder.style.display = 'flex';
            submitBtn.disabled = false;
            
            statusBox.innerText = msg;
            statusBox.style.display = 'block';
        }
    </script>
</body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
def get_home_page():
    return HTML_TEMPLATE

@app.get("/crop")
def crop_video(
    background_tasks: BackgroundTasks,
    url: str = Query(..., description="The URL of the video (YouTube, Drive, FB, etc.)"),
    start: str = Query(..., description="Start time (seconds, MM:SS, or HH:MM:SS)"),
    duration: int = Query(..., description="Duration of the clip in seconds"),
    aspect: str = Query("9:16", description="Target aspect ratio: 9:16, 1:1, or 16:9"),
    reframe: bool = Query(True, description="Enable AI face-tracking auto-reframe"),
    secret: str = Query(..., description="API Access Secret")
):
    if secret != API_SECRET:
        return JSONResponse(status_code=401, content={"success": False, "error": "Unauthorized API secret"})

    background_tasks.add_task(cleanup_old_files)

    try:
        start_seconds = parse_time_to_seconds(start)
        end_seconds = start_seconds + duration
    except ValueError as e:
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})

    job_id = str(uuid.uuid4())
    temp_input = f"raw_input_{job_id}.mp4"
    output_filename = f"reframe_{job_id}.mp4"
    output_filepath = os.path.join("downloads", output_filename)

    # 1. Download video
    download_success = False
    
    # Check if Google Drive link
    if "drive.google.com" in url or "/file/d/" in url:
        print(f"Google Drive link detected. Initiating direct file download for job {job_id}")
        download_success = download_google_drive(url, temp_input)
    
    # Fallback to yt-dlp for YouTube/FB/TikTok/Insta/etc.
    ytdlp_err_output = ""
    if not download_success:
        try:
            print(f"yt-dlp download initiated for section *{start_seconds}-{end_seconds} for job {job_id}")
            ytdlp_cmd = [
                "yt-dlp",
                "-f", "best[ext=mp4]/best",
                "--download-sections", f"*{start_seconds}-{end_seconds}",
                "--force-keyframes-at-cuts",
                "--extractor-args", "youtube:player_client=tv,web_embedded",
                "--impersonate", "chrome",
                "-o", temp_input,
                url
            ]
            ytdlp_result = subprocess.run(ytdlp_cmd, capture_output=True, text=True)
            if ytdlp_result.returncode == 0:
                download_success = True
            else:
                ytdlp_err_output = ytdlp_result.stderr
                print("yt-dlp Error output:", ytdlp_result.stderr)
        except Exception as e:
            ytdlp_err_output = str(e)
            print("yt-dlp Exception:", e)

    # Fallback to direct HTTP download (for direct raw mp4 link files)
    if not download_success:
        try:
            print(f"Fallback direct HTTP download initiated for job {job_id}")
            opener = urllib.request.build_opener()
            opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')]
            urllib.request.install_opener(opener)
            urllib.request.urlretrieve(url, temp_input)
            download_success = True
        except Exception as e:
            print("Direct HTTP Fallback Download Failed:", e)

    if not download_success or not os.path.exists(temp_input):
        return JSONResponse(status_code=400, content={"success": False, "error": f"Failed to download the video. yt-dlp error: {ytdlp_err_output}"})

    try:
        # 2. Process Video Cropping / Face-tracking Reframe
        print(f"Processing reframe for job {job_id}. Aspect: {aspect}, Reframe: {reframe}")
        
        if aspect == "16:9":
            ffmpeg_cmd = [
                "ffmpeg", "-y",
                "-i", temp_input,
                "-ss", "0",
                "-t", str(duration),
                "-c:v", "libx264",
                "-preset", "superfast",
                "-c:a", "aac",
                output_filepath
            ]
            subprocess.run(ffmpeg_cmd)
        else:
            temp_video = auto_reframe_video(temp_input, aspect, reframe)
            
            if temp_video and os.path.exists(temp_video):
                ffmpeg_cmd = [
                    "ffmpeg", "-y",
                    "-i", temp_video,
                    "-i", temp_input,
                    "-map", "0:v",
                    "-map", "1:a?",
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-shortest",
                    output_filepath
                ]
                subprocess.run(ffmpeg_cmd)
                try:
                    os.remove(temp_video)
                except Exception:
                    pass
            else:
                print("OpenCV processing skipped/failed, falling back to FFmpeg center-crop")
                ffmpeg_cmd = [
                    "ffmpeg", "-y",
                    "-i", temp_input,
                    "-vf", f"crop=ih*9/16:ih" if aspect == "9:16" else "crop=ih:ih",
                    "-c:v", "libx264",
                    "-preset", "superfast",
                    "-c:a", "aac",
                    output_filepath
                ]
                subprocess.run(ffmpeg_cmd)

        if not os.path.exists(output_filepath):
            raise Exception("Failed to compile cropped output video file.")

        download_url = f"https://jaatram-yoyo-shorts.hf.space/download/{output_filename}"
        return {
            "success": True,
            "jobId": job_id,
            "downloadUrl": download_url
        }

    except Exception as error:
        return {"success": False, "error": str(error)}

    finally:
        if os.path.exists(temp_input):
            try:
                os.remove(temp_input)
            except Exception:
                pass

@app.get("/auto-shorts")
def auto_shorts(
    background_tasks: BackgroundTasks,
    url: str = Query(..., description="The URL of the video"),
    gemini_key: str = Query(..., description="Gemini API Key"),
    aspect: str = Query("9:16", description="Target aspect ratio: 9:16, 1:1, or 16:9"),
    reframe: bool = Query(True, description="Enable AI face-tracking auto-reframe"),
    secret: str = Query(..., description="API Access Secret")
):
    if secret != API_SECRET:
        return JSONResponse(status_code=401, content={"success": False, "error": "Unauthorized API secret"})

    background_tasks.add_task(cleanup_old_files)
    
    # 1. Try to extract transcript from YouTube
    job_id = str(uuid.uuid4())
    transcript = None
    try:
        transcript = extract_transcript(url, job_id)
    except Exception as e:
        print(f"Transcript extraction failed: {e}")
        
    segments = []
    use_fallback = False
    
    if transcript and gemini_key:
        try:
            segments = get_engaging_segments(transcript, gemini_key)
        except Exception as e:
            print(f"Gemini moments analysis failed: {e}")
            
    if not segments:
        use_fallback = True
        print("No transcript or Gemini analysis available. Falling back to rule-based time segmenter.")
        
    # 3. Download the full video once, slice, and reframe
    results = []
    temp_full = f"temp_full_{job_id}.mp4"
    try:
        print(f"Downloading full video for auto-shorts job {job_id} URL: {url}")
        ytdlp_cmd = [
            "yt-dlp",
            "-f", "best[ext=mp4]/best",
            "--extractor-args", "youtube:player_client=tv,web_embedded",
            "--impersonate", "chrome",
            "-o", temp_full,
            url
        ]
        ytdlp_res = subprocess.run(ytdlp_cmd, timeout=120)
        
        if not os.path.exists(temp_full):
            raise Exception("Failed to download video stream.")
            
        # Time-based segmentation fallback if Gemini wasn't used or failed
        if use_fallback:
            try:
                cap = cv2.VideoCapture(temp_full)
                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                duration_sec = frame_count / fps if fps > 0 else 180
                cap.release()
            except Exception:
                duration_sec = 180
            
            print(f"Fallback segmenter: video duration is {duration_sec}s")
            
            if duration_sec <= 90:
                clip_len = max(5, int(duration_sec / 3.2))
                segments = [
                    {"start": "0", "duration": clip_len, "title": "Hook Segment"},
                    {"start": str(int(duration_sec * 0.35)), "duration": clip_len, "title": "Core Segment"},
                    {"start": str(int(duration_sec * 0.7)), "duration": clip_len, "title": "Key Highlight"}
                ]
            else:
                segments = [
                    {"start": str(int(duration_sec * 0.1)), "duration": 30, "title": "Viral Hook"},
                    {"start": str(int(duration_sec * 0.45)), "duration": 30, "title": "Mid-Video Value"},
                    {"start": str(int(duration_sec * 0.8)), "duration": 30, "title": "Climax Highlight"}
                ]
            
        for idx, seg in enumerate(segments):
            start_time = seg.get("start", "00:00")
            duration = int(seg.get("duration", 30))
            title = seg.get("title", f"Short Part {idx+1}")
            
            try:
                start_sec = parse_time_to_seconds(start_time)
            except Exception:
                continue
            
            # Slice temp_full to a temporary clip
            temp_clip = f"temp_clip_{job_id}_{idx}.mp4"
            slice_cmd = [
                "ffmpeg", "-y",
                "-ss", str(start_sec),
                "-i", temp_full,
                "-t", str(duration),
                "-c", "copy",
                temp_clip
            ]
            subprocess.run(slice_cmd)
            
            if os.path.exists(temp_clip):
                out_filename = f"auto_{job_id}_{idx}.mp4"
                out_filepath = os.path.join("downloads", out_filename)
                
                # Apply Face Tracking / Cropping
                if aspect != "16:9":
                    temp_video = auto_reframe_video(temp_clip, aspect, reframe)
                    if temp_video and os.path.exists(temp_video):
                        merge_cmd = [
                            "ffmpeg", "-y",
                            "-i", temp_video,
                            "-i", temp_clip,
                            "-map", "0:v",
                            "-map", "1:a?",
                            "-c:v", "copy",
                            "-c:a", "aac",
                            "-shortest",
                            out_filepath
                        ]
                        subprocess.run(merge_cmd)
                        try:
                            os.remove(temp_video)
                        except Exception:
                            pass
                    else:
                        # Fallback crop
                        ffmpeg_cmd = [
                            "ffmpeg", "-y",
                            "-i", temp_clip,
                            "-vf", "crop=ih*9/16:ih" if aspect == "9:16" else "crop=ih:ih",
                            "-c:v", "libx264",
                            "-preset", "superfast",
                            "-c:a", "aac",
                            out_filepath
                        ]
                        subprocess.run(ffmpeg_cmd)
                else:
                    os.rename(temp_clip, out_filepath)
                    
                if os.path.exists(temp_clip):
                    try:
                        os.remove(temp_clip)
                    except Exception:
                        pass
                    
                if os.path.exists(out_filepath):
                    results.append({
                        "title": title,
                        "start": start_time,
                        "duration": duration,
                        "downloadUrl": f"https://jaatram-yoyo-shorts.hf.space/download/{out_filename}"
                    })
                    
        return {
            "success": True,
            "shorts": results
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}
        
    finally:
        if os.path.exists(temp_full):
            try:
                os.remove(temp_full)
            except Exception:
                pass


