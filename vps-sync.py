import os
import sys
import tarfile
import argparse
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

HOST = "200.97.164.97"
USER = "root"
PASS = "JaatRam@#9211"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))
REMOTE_DIR = "/var/www/yoyosmm"

EXCLUDE_DIRS = {
    'node_modules',
    '.next',
    '.git',
    '.cache',
    '__pycache__',
    'scratch'
}

EXCLUDE_EXTENSIONS = {
    '.tar.gz',
    '.zip',
    '.tgz',
    '.log',
    '.tmp'
}

def get_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=20)
    return ssh

def pull():
    print(f"Connecting to VPS ({HOST})...")
    ssh = get_ssh()
    print("Creating remote tarball of /var/www/yoyosmm...")
    ssh.exec_command("tar -czf /tmp/yoyosmm_pull.tar.gz --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='*.tar.gz' -C /var/www/yoyosmm .")
    
    sftp = ssh.open_sftp()
    local_archive = os.path.join(LOCAL_DIR, "temp_pull.tar.gz")
    print("Downloading source files to local workspace...")
    sftp.get("/tmp/yoyosmm_pull.tar.gz", local_archive)
    sftp.close()
    
    ssh.exec_command("rm -f /tmp/yoyosmm_pull.tar.gz")
    ssh.close()
    
    print("Extracting files...")
    with tarfile.open(local_archive, "r:gz") as tar:
        tar.extractall(path=LOCAL_DIR)
    
    try:
        os.remove(local_archive)
    except:
        pass
    print("✓ Successfully pulled latest changes from VPS!")

def push(rebuild=False):
    print(f"Connecting to VPS ({HOST})...")
    ssh = get_ssh()
    local_archive = os.path.join(LOCAL_DIR, "temp_push.tar.gz")
    
    print("Packing local files (excluding node_modules, .next, .git)...")
    with tarfile.open(local_archive, "w:gz") as tar:
        for root, dirs, files in os.walk(LOCAL_DIR):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                _, ext = os.path.splitext(file)
                if ext in EXCLUDE_EXTENSIONS or file.startswith("temp_"):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, LOCAL_DIR)
                tar.add(full_path, arcname=rel_path)
    
    print("Uploading archive to VPS...")
    sftp = ssh.open_sftp()
    sftp.put(local_archive, "/tmp/yoyosmm_push.tar.gz")
    sftp.close()
    
    try:
        os.remove(local_archive)
    except:
        pass
    
    print("Extracting files into /var/www/yoyosmm on VPS...")
    ssh.exec_command("tar -xzf /tmp/yoyosmm_push.tar.gz -C /var/www/yoyosmm/ && rm -f /tmp/yoyosmm_push.tar.gz")
    
    if rebuild:
        print("Running build & reloading PM2 on VPS...")
        stdin, stdout, stderr = ssh.exec_command("cd /var/www/yoyosmm && npm run build && pm2 reload yoyosmm")
        print(stdout.read().decode())
    else:
        print("Reloading PM2 service...")
        stdin, stdout, stderr = ssh.exec_command("pm2 reload yoyosmm")
        print(stdout.read().decode())
        
    ssh.close()
    print("✓ Deployment complete!")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="VPS File Sync & Deploy Helper")
    parser.add_argument("action", choices=["pull", "push"], help="Action to perform: 'pull' (download from VPS) or 'push' (upload to VPS)")
    parser.add_argument("--build", action="store_true", help="Rebuild Next.js app on VPS after push")
    args = parser.parse_args()
    
    if args.action == "pull":
        pull()
    elif args.action == "push":
        push(rebuild=args.build)
