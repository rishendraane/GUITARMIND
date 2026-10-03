/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  const ensureCollection = (data) => {
    try {
      const existing = dao.findCollectionByNameOrId(data.name);
      if (existing) {
        existing.listRule = "";
        existing.viewRule = "";
        existing.createRule = "";
        existing.updateRule = "";
        existing.deleteRule = "";
        dao.saveCollection(existing);
        console.log("[Migration 3] Updated rules for: " + data.name);
        return;
      }
    } catch(e) {}

    try {
      const c = new Collection({
        name: data.name,
        type: "base",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        schema: data.schema || []
      });
      dao.saveCollection(c);
      console.log("[Migration 3] Successfully created: " + data.name);
    } catch(err) {
      console.log("[Migration 3] Error creating " + data.name + ": " + err);
    }
  };

  ensureCollection({
    name: "users_profile",
    schema: [
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

  ensureCollection({
    name: "ai_conversations",
    schema: [
      { name: "user_id", type: "text", required: true },
      { name: "coach_id", type: "text" },
      { name: "title", type: "text" },
      { name: "created_at", type: "text" },
      { name: "updated_at", type: "text" },
    ]
  });

  ensureCollection({
    name: "ai_messages",
    schema: [
      { name: "conversation_id", type: "text", required: true },
      { name: "role", type: "text" },
      { name: "content", type: "text" },
      { name: "sender", type: "text" },
      { name: "content_type", type: "text" },
      { name: "metadata", type: "json" },
      { name: "timestamp", type: "text" },
    ]
  });

  ensureCollection({
    name: "practice_sessions",
    schema: [
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

  ensureCollection({
    name: "chord_mastery",
    schema: [
      { name: "user_id", type: "text", required: true },
      { name: "chord_name", type: "text" },
      { name: "mastery_score", type: "number" },
      { name: "times_practiced", type: "number" },
      { name: "last_practiced", type: "text" },
    ]
  });

  ensureCollection({
    name: "vision_analysis",
    schema: [
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

  ensureCollection({
    name: "user_memories",
    schema: [
      { name: "user_id", type: "text", required: true },
      { name: "memory_type", type: "text" },
      { name: "content", type: "text" },
      { name: "relevance_score", type: "number" },
      { name: "created_at", type: "text" },
    ]
  });

  ensureCollection({
    name: "roadmap_progress",
    schema: [
      { name: "user_id", type: "text", required: true },
      { name: "roadmap_id", type: "text" },
      { name: "stages", type: "json" },
      { name: "current_stage", type: "number" },
      { name: "updated_at", type: "text" },
    ]
  });

  ensureCollection({
    name: "songs",
    schema: [
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

  ensureCollection({
    name: "practice_calendar",
    schema: [
      { name: "user_id", type: "text", required: true },
      { name: "date", type: "text" },
      { name: "scheduled_duration", type: "number" },
      { name: "actual_duration", type: "number" },
      { name: "focus_areas", type: "json" },
      { name: "completed", type: "bool" },
      { name: "notes", type: "text" },
    ]
  });

  ensureCollection({
    name: "analytics_events",
    schema: [
      { name: "user_id", type: "text", required: true },
      { name: "event_name", type: "text" },
      { name: "event_data", type: "json" },
      { name: "created_at", type: "text" },
    ]
  });
}, (db) => {});
