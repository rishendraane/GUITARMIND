#!/usr/bin/env python3
"""
GuitarMind AI Training Script
Pulls the base model and creates a fine-tuned guitar coaching model via Ollama.

Usage:
    py scripts/train_model.py
"""

import subprocess
import sys
import time
import urllib.request
import json
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
MODELFILE = SCRIPTS_DIR / "Modelfile"
MODEL_NAME = "guitarmind-ai"
BASE_MODEL = "llama3.2"
OLLAMA_BASE = "http://localhost:11434"

def check_ollama():
    """Verify Ollama is running."""
    try:
        with urllib.request.urlopen(f"{OLLAMA_BASE}/api/tags", timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False

def start_ollama():
    """Try to launch Ollama server."""
    print("[Ollama] Starting Ollama server in background...")
    import os
    if sys.platform == "win32":
        subprocess.Popen(
            ["ollama", "serve"],
            creationflags=subprocess.CREATE_NO_WINDOW,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    else:
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    for _ in range(15):
        time.sleep(2)
        if check_ollama():
            print("[Ollama] Server ready!")
            return True
    return False

def run(cmd: list[str], desc: str = "") -> int:
    """Run a command and stream output."""
    print(f"\n>>> {desc or ' '.join(cmd)}")
    result = subprocess.run(cmd, check=False)
    return result.returncode

def get_available_models() -> list[str]:
    """Get list of locally available models."""
    try:
        with urllib.request.urlopen(f"{OLLAMA_BASE}/api/tags", timeout=5) as resp:
            data = json.loads(resp.read())
            return [m["name"] for m in (data.get("models") or [])]
    except Exception:
        return []

def main():
    print("=" * 60)
    print("  GuitarMind AI — Local Model Training")
    print("=" * 60)

    # 1. Ensure Ollama is running
    if not check_ollama():
        print("[Ollama] Not running. Attempting to start...")
        if not start_ollama():
            print("\n[ERROR] Cannot connect to Ollama.")
            print("Please open a separate terminal and run: ollama serve")
            print("Then re-run this script.")
            sys.exit(1)

    print("[Ollama] ✓ Connected to Ollama")

    # 2. Pull base model if not already present
    available = get_available_models()
    base_present = any(m.startswith(BASE_MODEL) for m in available)

    if base_present:
        print(f"[Ollama] ✓ Base model '{BASE_MODEL}' already present")
    else:
        print(f"\n[Ollama] Pulling base model '{BASE_MODEL}'...")
        print("         (This is a ~2 GB download, may take a few minutes)")
        code = run(["ollama", "pull", BASE_MODEL], f"Pulling {BASE_MODEL}")
        if code != 0:
            print(f"[ERROR] Failed to pull {BASE_MODEL}. Check internet connection.")
            sys.exit(1)
        print(f"[Ollama] ✓ '{BASE_MODEL}' downloaded successfully")

    # 3. Build the GuitarMind custom model
    print(f"\n[Training] Building '{MODEL_NAME}' from Modelfile...")
    if not MODELFILE.exists():
        print(f"[ERROR] Modelfile not found at {MODELFILE}")
        sys.exit(1)

    code = run(
        ["ollama", "create", MODEL_NAME, "-f", str(MODELFILE)],
        f"Creating {MODEL_NAME}"
    )
    if code != 0:
        print(f"[ERROR] Failed to create '{MODEL_NAME}' model.")
        sys.exit(1)

    print(f"\n[Training] ✓ Model '{MODEL_NAME}' created successfully!")

    # 4. Quick smoke test
    print(f"\n[Test] Running smoke test on '{MODEL_NAME}'...")
    code = run(
        ["ollama", "run", MODEL_NAME, "What is a C major chord? (one sentence answer)"],
        "Smoke test"
    )
    if code == 0:
        print(f"\n[Test] ✓ Smoke test passed!")
    else:
        print(f"\n[Test] ⚠ Smoke test failed (but model may still work fine)")

    # 5. Verify model appears in list
    models_after = get_available_models()
    gm_model = [m for m in models_after if MODEL_NAME in m]

    print("\n" + "=" * 60)
    print("  Training Complete!")
    print("=" * 60)
    print(f"  Model:   {MODEL_NAME}")
    print(f"  Status:  {'✓ Listed in Ollama' if gm_model else '⚠ Not found in list (check above errors)'}")
    print(f"\n  The GuitarMind app will automatically use '{MODEL_NAME}'")
    print(f"  when Ollama is running (no API key needed).")
    print(f"\n  To use manually: ollama run {MODEL_NAME}")
    print("=" * 60)

if __name__ == "__main__":
    main()
