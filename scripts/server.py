#!/usr/bin/env python3
"""
GuitarMind Backend Server
Uses PocketBase (free, self-hosted, SQLite) as the database backend.
Also serves the local vision/OpenCV server on the same process.

Usage:
    py scripts/server.py

PocketBase runs on :8090
Vision API runs on :5000
"""

import os
import sys
import subprocess
import platform
import urllib.request
import zipfile
import json
import threading
import io
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
ROOT_DIR = SCRIPTS_DIR.parent
PB_DIR = ROOT_DIR / "pocketbase"
PB_DATA_DIR = PB_DIR / "pb_data"
PB_HOOKS_DIR = PB_DIR / "pb_hooks"
PB_MIGRATIONS_DIR = PB_DIR / "pb_migrations"

PB_VERSION = "0.22.18"
SYSTEM = platform.system().lower()
ARCH = "amd64" if platform.machine() in ("AMD64", "x86_64") else "arm64"

def pb_exe_name():
    if SYSTEM == "windows":
        return "pocketbase.exe"
    return "pocketbase"

PB_EXE = PB_DIR / pb_exe_name()

def download_pocketbase():
    """Download PocketBase binary if not present."""
    if PB_EXE.exists():
        print(f"[PocketBase] Already downloaded: {PB_EXE}")
        return

    PB_DIR.mkdir(parents=True, exist_ok=True)

    if SYSTEM == "windows":
        fname = f"pocketbase_{PB_VERSION}_windows_{ARCH}.zip"
    elif SYSTEM == "darwin":
        fname = f"pocketbase_{PB_VERSION}_darwin_{ARCH}.zip"
    else:
        fname = f"pocketbase_{PB_VERSION}_linux_{ARCH}.zip"

    url = f"https://github.com/pocketbase/pocketbase/releases/download/v{PB_VERSION}/{fname}"
    print(f"[PocketBase] Downloading {url} ...")

    try:
        with urllib.request.urlopen(url, timeout=60) as resp:
            data = resp.read()

        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            for name in zf.namelist():
                if name.endswith(pb_exe_name()):
                    target = PB_DIR / pb_exe_name()
                    with zf.open(name) as src, open(target, "wb") as dst:
                        dst.write(src.read())
                    if SYSTEM != "windows":
                        os.chmod(target, 0o755)
                    print(f"[PocketBase] Extracted to {target}")
                    return
        print("[PocketBase] ERROR: Could not find binary in zip.")
    except Exception as e:
        print(f"[PocketBase] Download failed: {e}")
        print("[PocketBase] Please download manually from https://pocketbase.io/docs/ and place in pocketbase/")
        sys.exit(1)

def write_pb_hooks():
    """Write PocketBase JS hooks that create initial collections and seed data."""
    PB_HOOKS_DIR.mkdir(parents=True, exist_ok=True)
    PB_MIGRATIONS_DIR.mkdir(parents=True, exist_ok=True)

    # Write migration to create all GuitarMind collections
    migration_content = """/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // --- users_profile ---
  const usersProfile = new Collection({
    name: "users_profile",
    type: "base",
    fields: [
      { name: "user_id", type: "text", required: true },
      { name: "name", type: "text" },
      { name: "email", type: "email" },
      { name: "avatar_url", type: "url" },
      { name: "skill_level", type: "text" },
      { name: "guitar_type", type: "text" },
      { name: "years_playing", type: "number" },
      { name: "favorite_genres", type: "json" },
      { name: "favorite_artists", type: "json" },
      { name: "target_songs", type: "json" },
      { name: "learning_goals", type: "json" },
      { name: "xp", type: "number" },
      { name: "streak", type: "number" },
      { name: "preferred_coach", type: "text" },
      { name: "ai_config", type: "json" },
      { name: "onboarding_complete", type: "bool" },
      { name: "created_at", type: "text" },
      { name: "updated_at", type: "text" },
    ]
  });
  try { app.save(usersProfile); } catch(e) { console.log("users_profile exists"); }

  // --- ai_conversations ---
  const aiConversations = new Collection({
    name: "ai_conversations",
    type: "base",
    fields: [
      { name: "user_id", type: "text", required: true },
      { name: "coach_id", type: "text" },
      { name: "title", type: "text" },
      { name: "created_at", type: "text" },
      { name: "updated_at", type: "text" },
    ]
  });
  try { app.save(aiConversations); } catch(e) { console.log("ai_conversations exists"); }

  // --- ai_messages ---
  const aiMessages = new Collection({
    name: "ai_messages",
    type: "base",
    fields: [
      { name: "conversation_id", type: "text", required: true },
      { name: "role", type: "text" },
      { name: "content", type: "text" },
      { name: "sender", type: "text" },
      { name: "content_type", type: "text" },
      { name: "metadata", type: "json" },
      { name: "timestamp", type: "text" },
    ]
  });
  try { app.save(aiMessages); } catch(e) { console.log("ai_messages exists"); }

  // --- practice_sessions ---
  const practiceSessions = new Collection({
    name: "practice_sessions",
    type: "base",
    fields: [
      { name: "user_id", type: "text", required: true },
      { name: "type", type: "text" },
      { name: "duration", type: "number" },
      { name: "score", type: "number" },
      { name: "bpm", type: "number" },
      { name: "notes_hit", type: "number" },
      { name: "notes_missed", type: "number" },
      { name: "song_id", type: "text" },
      { name: "chord_progression", type: "json" },
      { name: "started_at", type: "text" },
      { name: "ended_at", type: "text" },
    ]
  });
  try { app.save(practiceSessions); } catch(e) { console.log("practice_sessions exists"); }

  // --- chord_mastery ---
  const chordMastery = new Collection({
    name: "chord_mastery",
    type: "base",
    fields: [
      { name: "user_id", type: "text", required: true },
      { name: "chord_name", type: "text" },
      { name: "mastery_score", type: "number" },
      { name: "times_practiced", type: "number" },
      { name: "last_practiced", type: "text" },
    ]
  });
  try { app.save(chordMastery); } catch(e) { console.log("chord_mastery exists"); }

  // --- vision_analysis ---
  const visionAnalysis = new Collection({
    name: "vision_analysis",
    type: "base",
    fields: [
      { name: "user_id", type: "text", required: true },
      { name: "analysis_type", type: "text" },
      { name: "posture_data", type: "json" },
      { name: "fret_data", type: "json" },
      { name: "score", type: "number" },
      { name: "feedback", type: "text" },
      { name: "image_url", type: "text" },
      { name: "analyzed_at", type: "text" },
    ]
  });
  try { app.save(visionAnalysis); } catch(e) { console.log("vision_analysis exists"); }

  // --- user_memories ---
  const userMemories = new Collection({
    name: "user_memories",
    type: "base",
    fields: [
      { name: "user_id", type: "text", required: true },
      { name: "memory_type", type: "text" },
      { name: "content", type: "text" },
      { name: "relevance_score", type: "number" },
      { name: "created_at", type: "text" },
    ]
  });
  try { app.save(userMemories); } catch(e) { console.log("user_memories exists"); }

  // --- roadmap_progress ---
  const roadmapProgress = new Collection({
    name: "roadmap_progress",
    type: "base",
    fields: [
      { name: "user_id", type: "text", required: true },
      { name: "roadmap_id", type: "text" },
      { name: "stages", type: "json" },
      { name: "current_stage", type: "number" },
      { name: "updated_at", type: "text" },
    ]
  });
  try { app.save(roadmapProgress); } catch(e) { console.log("roadmap_progress exists"); }

  // --- songs ---
  const songs = new Collection({
    name: "songs",
    type: "base",
    fields: [
      { name: "user_id", type: "text", required: true },
      { name: "title", type: "text" },
      { name: "artist", type: "text" },
      { name: "genre", type: "text" },
      { name: "difficulty", type: "text" },
      { name: "tabs", type: "text" },
      { name: "chords", type: "json" },
      { name: "status", type: "text" },
      { name: "progress_percent", type: "number" },
      { name: "youtube_url", type: "text" },
      { name: "created_at", type: "text" },
    ]
  });
  try { app.save(songs); } catch(e) { console.log("songs exists"); }

  // --- practice_calendar ---
  const practiceCalendar = new Collection({
    name: "practice_calendar",
    type: "base",
    fields: [
      { name: "user_id", type: "text", required: true },
      { name: "date", type: "text" },
      { name: "scheduled_duration", type: "number" },
      { name: "actual_duration", type: "number" },
      { name: "focus_areas", type: "json" },
      { name: "completed", type: "bool" },
      { name: "notes", type: "text" },
    ]
  });
  try { app.save(practiceCalendar); } catch(e) { console.log("practice_calendar exists"); }

}, (app) => {
  // reverse migration — optional
});
"""

    migration_file = PB_MIGRATIONS_DIR / "1_initial_schema.js"
    if not migration_file.exists():
        migration_file.write_text(migration_content, encoding="utf-8")
        print(f"[PocketBase] Migration written to {migration_file}")

def start_pocketbase():
    """Start the PocketBase server."""
    write_pb_hooks()
    cmd = [
        str(PB_EXE),
        "serve",
        "--http=0.0.0.0:8090",
        f"--dir={PB_DATA_DIR}",
        f"--migrationsDir={PB_MIGRATIONS_DIR}",
        f"--hooksDir={PB_HOOKS_DIR}",
        "--automigrate",
    ]
    print(f"[PocketBase] Starting: {' '.join(str(c) for c in cmd)}")
    proc = subprocess.Popen(cmd, cwd=str(ROOT_DIR))
    return proc

def start_vision_server():
    """Start the Flask vision server."""
    vision_script = SCRIPTS_DIR / "vision_server.py"
    if not vision_script.exists():
        print("[Vision] vision_server.py not found, skipping.")
        return None
    cmd = [sys.executable, str(vision_script)]
    print("[Vision] Starting vision server on :5000 ...")
    proc = subprocess.Popen(cmd, cwd=str(ROOT_DIR))
    return proc

def main():
    print("=" * 60)
    print("  GuitarMind Backend Server")
    print("  PocketBase (DB) on :8090")
    print("  Vision API      on :5000")
    print("=" * 60)

    download_pocketbase()
    pb_proc = start_pocketbase()
    vis_proc = start_vision_server()

    print("\n[Ready] Backend is running. Press Ctrl+C to stop.\n")
    try:
        pb_proc.wait()
    except KeyboardInterrupt:
        print("\n[Shutdown] Stopping servers...")
        pb_proc.terminate()
        if vis_proc:
            vis_proc.terminate()

if __name__ == "__main__":
    main()
