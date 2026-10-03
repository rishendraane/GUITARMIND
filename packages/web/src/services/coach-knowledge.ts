/**
 * @module CoachKnowledgeService
 * High-fidelity interactive guitar intelligence and doubt clarification engine.
 * Provides rich, empathetic, and musically precise guidance across all guitar fundamentals,
 * techniques, troubleshooting, gear, theory, and personalized coaching.
 */

import type { CoachPersonalityId } from '@guitarmind/core';

export interface CoachReplyResult {
  reply: string;
  chordToDiagram?: string;
  suggestedAction?: {
    label: string;
    route: string;
  };
}

export class CoachKnowledgeService {
  /**
   * Clarifies user doubts and answers questions contextually based on user query and coach persona.
   */
  static getInteractiveResponse(
    userText: string,
    coachId: CoachPersonalityId = 'maya',
    userName: string = 'Guitarist',
    _userContext?: {
      level?: string;
      streak?: number;
      knownChords?: string[];
      weakChords?: string[];
    }
  ): CoachReplyResult {
    const textLower = userText.toLowerCase().trim();

    // 1. Natural Conversational Openers & Greetings
    if (/^(hey|hi|hello|yo|sup|greetings|good\s*(morning|afternoon|evening)|howdy)\b/i.test(textLower) || textLower === 'hey' || textLower === 'hi') {
      const greetings: Record<CoachPersonalityId, string> = {
        maya: `Hey ${userName}! Great to see you! 🌱 I'm right here with you. How are your hands feeling today? Are we learning a new chord, practicing transitions, or trying out a song?`,
        axel: `Hey ${userName}! What's cranking, rockstar? 🎸 Ready to plug in and build some finger speed today? What are we tearing into?`,
        professor_chen: `Greetings, ${userName}. It is good to see you at the instrument. Consistency is the true foundation of mastery. What musical concept or technical drill shall we refine today?`,
        maestro_antonio: `Benvenuto, ${userName}. Settle in with your instrument. Let us play with clarity and purpose today. What would you like to explore?`,
        general: `Welcome back, ${userName}. Let's get down to business. Are we tuning up, working on chord transitions, or running through practice drills?`
      };

      return {
        reply: greetings[coachId] || greetings.maya
      };
    }

    // 2. Sore Fingers / Calluses / Finger Pain
    if (textLower.includes('finger') && (textLower.includes('hurt') || textLower.includes('pain') || textLower.includes('sore') || textLower.includes('callus') || textLower.includes('sting'))) {
      let advice = `**Finger Soreness is a Badge of Honor! 🎸**\n\nEvery guitarist goes through this! Here is exactly what is happening and how to protect your hands:\n\n1. **Calluses take 2 to 3 weeks:** Your fingertips will gradually develop protective pads. Until then, keep your practice sessions to **15–20 minutes at a time**, 1 or 2 times a day, rather than one long marathon.\n2. **Don't use a "Death Grip":** Most beginners press twice as hard as necessary! Press a string just hard enough until it stops buzzing when picked—notice how little pressure is actually required.\n3. **Press close to the fret wire:** The closer your finger is to the metal fret (just behind it), the less force you need for a clean tone.\n4. **Never play with wet hands:** Practicing right after a shower or washing dishes softens your skin and can cause blisters.\n\nTake a 5-minute break whenever your fingers throb. You're building lasting guitar hands!`;

      if (coachId === 'axel') {
        advice = `**Oh yeah, the fingertip burn! 🤘**\n\nEvery great guitarist from Hendrix to Slash had sore fingers at the start! Here's the drill:\n- **Drop the death grip:** You only need enough pressure to ring the note out, not crush the wood.\n- **Fret right behind the metal fretwire:** Physics does the work for you!\n- **15-minute bursts:** Play 15 mins, rest 10. In two weeks, your fingertips will be like steel plates. Keep shredding!`;
      }

      return { reply: advice };
    }

    // 3. String Buzzing / Muted Notes / Unclear Sound
    if (textLower.includes('buzz') || textLower.includes('mute') || textLower.includes('muffled') || textLower.includes('dead note') || textLower.includes('thud') || textLower.includes('clean note')) {
      return {
        reply: `**Let's Fix That String Buzz! 🛠️**\n\nWhen a note sounds muffled or buzzes against the frets, 90% of the time it comes down to three micro-adjustments:\n\n1. **Finger Position (The Golden Rule):** Place your fingertip **directly behind the fret wire**, not in the middle of the fret and never on top of the metal. The closer you are to the fretwire, the cleaner the note rings.\n2. **Arch Your Knuckles:** Curl your fingers like you are holding a tennis ball or an apple. If your finger is flat, the fleshy pad will accidentally lean against and mute the string below it!\n3. **Thumb Behind the Neck:** Lower your fretting thumb to the middle of the back of the neck (roughly behind your second finger). This drops your wrist and creates instant clearance for your fingers.\n\n*Pro Drill:* Pluck each string of your chord one by one from 6th to 1st. Whenever you hear a buzz, adjust that single finger's arch and pick it again until it rings like a bell!`
      };
    }

    // 4. The Dreaded F Chord & Barre Chords
    if (textLower.includes('barre') || textLower.includes('bar chord') || textLower.includes('f chord') || textLower.includes('f major') || (textLower.includes('f') && textLower.includes('hard'))) {
      return {
        reply: `**Mastering the F Chord & Barre Chords 💪**\n\nThe F barre chord is the #1 hurdle every guitarist faces. Here is the secret technique that unlocks it:\n\n1. **Roll onto the Bony Edge:** Don't lay your index finger flat on its soft, fleshy underside. **Roll it slightly onto the outside edge (thumb-side)** where the bone is firmer.\n2. **Use Arm Weight, Not Thumb Pinching:** Don't squeeze the neck with your thumb like a vise grip! Instead, pull your fretting elbow and shoulder back gently toward your body—gravity and arm weight press the strings down effortlessly.\n3. **Place the Barre Finger Slightly High:** Make sure your index finger extends slightly above the top of the neck so the finger creases don't fall directly over the strings.\n4. **Start with the "Mini F" Cheat Code:**\n   - String 1 (High E): Fret 1 (Index)\n   - String 2 (B): Fret 1 (Index)\n   - String 3 (G): Fret 2 (Middle)\n   - String 4 (D): Fret 3 (Ring)\n   - Mute strings 5 & 6! Strum only the top 4 strings.\n\nOnce your hand feels comfortable with the Mini F, adding the full barre will feel 10x easier!`,
        chordToDiagram: 'F'
      };
    }

    // 5. Tuning the Guitar & Standard Tuning
    if (textLower.includes('tune') || textLower.includes('tuning') || textLower.includes('pitch') || textLower.includes('eadgbe')) {
      return {
        reply: `**Standard Guitar Tuning (E A D G B E) 🎯**\n\nFrom lowest pitch (thickest string) to highest pitch (thinnest string):\n- **String 6 (Thickest):** **E** (82.4 Hz)\n- **String 5:** **A** (110.0 Hz)\n- **String 4:** **D** (146.8 Hz)\n- **String 3:** **G** (196.0 Hz)\n- **String 2:** **B** (246.9 Hz)\n- **String 1 (Thinnest):** **E** (329.6 Hz)\n\n*Helpful Mnemonic:* **"Eddie Ate Dynamite, Good Bye Eddie"**\n\n**Golden Tuning Tip:** Always tune **up** to the pitch from below. If a string is sharp (too high), tune it slightly lower first, then tighten up to the note to lock the peg gear securely.\n\nWould you like to open our built-in interactive tuner now?`,
        suggestedAction: {
          label: 'Open Guitar Tuner',
          route: '#tuner'
        }
      };
    }

    // 6. How to Hold a Pick & Strumming Techniques
    if (textLower.includes('pick') || textLower.includes('strum') || textLower.includes('strumming') || textLower.includes('plectrum')) {
      return {
        reply: `**How to Hold a Pick & Strum with Fluid Rhythm 🎸**\n\n1. **The Proper Grip:**\n   - Rest the pick on the side of your index finger's first knuckle.\n   - Clamp your thumb firmly on top, making a cross or "+" shape.\n   - Only **3 to 5 millimeters** of the pointed tip should stick out beyond your thumb.\n2. **Relax Your Wrist:**\n   - Your strumming motion should come from the **wrist**, not your whole stiff forearm! Think of the motion of gently shaking water droplets off your fingertips.\n3. **Angle the Pick:**\n   - Tilt the pick at about a **30-45 degree angle** relative to the strings so it slices across them smoothly rather than catching flat on each string.\n4. **Universal 4/4 Strumming Pattern:**\n   - **Down - Down - Up - [pause] - Up - Down - Up**\n   - Practice keeping your hand constantly moving up and down to the beat like a metronome pendulum, even when you miss the strings on purpose!`,
        suggestedAction: {
          label: 'Practice in Studio',
          route: '#practice'
        }
      };
    }

    // 7. Pentatonic Scale & Soloing / Lead Guitar
    if (textLower.includes('scale') || textLower.includes('pentatonic') || textLower.includes('solo') || textLower.includes('lead guitar') || textLower.includes('improv')) {
      return {
        reply: `**The A Minor Pentatonic Scale (The Gateway to Soloing!) ⚡**\n\nThis is the most famous scale in rock, blues, and pop history! Here is **Box 1** at the 5th fret:\n\n\`\`\`\ne|---------------------5-8-|\nB|-----------------5-8-----|\nG|-------------5-7---------|\nD|---------5-7-------------|\nA|-----5-7-----------------|\nE|-5-8---------------------|\n\`\`\`\n\n**Finger Rules:**\n- Any note on the **5th fret** is played with finger **1 (Index)**.\n- Any note on the **7th fret** is played with finger **3 (Ring)**.\n- Any note on the **8th fret** is played with finger **4 (Pinky)**.\n\n*Practice Routine:* Play it slowly up and down at 60 BPM with alternate picking (Down-Up-Down-Up). Once your fingers memorize this shape, you can solo over almost any blues or rock backing track in A minor!`
      };
    }

    // 8. What is a Capo & How to Use It
    if (textLower.includes('capo') || textLower.includes('transpose')) {
      return {
        reply: `**What is a Capo and Why is it Awesome? 🗜️**\n\nA capo is a clamp you place across the guitar neck to shorten the vibrating length of the strings. Here is what it does for you:\n\n1. **Raises the Pitch:** Clamping at Fret 1 raises every string by 1 semitone (half step). At Fret 2, a full whole step.\n2. **Keep Your Favorite Easy Chord Shapes:** If a song is in the key of Ab (which usually requires painful barre chords), you can put a capo on Fret 1 and play standard open **G, C, and D** chord shapes!\n3. **Match Your Vocal Range:** If a song feels too low for your singing voice, move the capo up 2 or 3 frets until it fits your vocal sweet spot comfortably.\n\n*Pro Tip:* Place the capo directly behind the fret wire (straight, not crooked) to prevent your strings from being pulled out of tune!`
      };
    }

    // 9. Chord Transitions & Switching Fast
    if (textLower.includes('switch') || textLower.includes('transition') || textLower.includes('change chord') || textLower.includes('slow') || textLower.includes('fast')) {
      return {
        reply: `**How to Switch Chords Fast and Smoothly ⏱️**\n\nStruggling to switch chords in time with the song? Here are the 3 exercises that fix slow transitions:\n\n1. **Find Anchor Fingers:** Many chord pairs share common fingers! For example, when switching between **C Major** and **Am**, your 1st and 2nd fingers stay in the exact same spot—only your 3rd finger moves! Don't lift your whole hand off the neck.\n2. **The 1-Minute Chord Change Drill:**\n   - Pick two chords (e.g. G and C).\n   - Set a timer for 60 seconds.\n   - Switch back and forth as many times as you can, counting only clean transitions.\n   - Track your score daily. When you hit 30 changes in a minute, you're song-ready!\n3. **Land Fingers Simultaneously:** Beginners place fingers one-by-one (1, then 2, then 3). Practice forming the chord shape in the air just above the fretboard and dropping all fingers down together onto the wood.`
      };
    }

    // 10. Song Recommendations
    if (textLower.includes('song') || textLower.includes('recommend') || textLower.includes('what should i play') || textLower.includes('learn a song')) {
      return {
        reply: `**Top Recommended Songs for Every Learning Stage 🎶**\n\n**Beginner (2 to 3 Chords):**\n- **"Horse with No Name" - America:** Uses only **Em** and **F#m11/E** (2 fingers!). Excellent for steady strumming.\n- **"Knockin' on Heaven's Door" - Bob Dylan:** Classic **G - D - Am**, then **G - D - C**.\n- **"Three Little Birds" - Bob Marley:** Upbeat reggae groove with **A - D - E**.\n\n**Intermediate (Fingerstyle & Dynamics):**\n- **"House of the Rising Sun" - The Animals:** Iconic 6/8 arpeggio picking with **Am - C - D - F - E**.\n- **"Wonderwall" - Oasis:** Keeps pinky and ring fingers anchored on strings 1 & 2 throughout **Em7 - G - Dsus4 - A7sus4**.\n- **"Blackbird" - The Beatles:** Beautiful two-finger acoustic picking across the fretboard.\n\nWould you like to transcribe or generate any of these songs right now in our Song Studio?`,
        suggestedAction: {
          label: 'Open Song Transcriber',
          route: '#youtube'
        }
      };
    }

    // 11. Music Theory / How Chords are Built
    if (textLower.includes('theory') || textLower.includes('triad') || textLower.includes('major vs minor') || textLower.includes('circle of fifths') || textLower.includes('how chords work')) {
      return {
        reply: `**Guitar Music Theory Simplified: How Chords are Made 🎼**\n\nYou don't need years of classical study to understand guitar harmony! It boils down to 3 notes called a **Triad**:\n\n1. **Major Chords (Happy / Bright):**\n   - Formula: **Root + Major 3rd (4 semitones) + Perfect 5th (7 semitones)**\n   - Example: C Major = C (Root) + E (3rd) + G (5th)\n2. **Minor Chords (Sad / Melancholic):**\n   - Formula: **Root + Minor 3rd (3 semitones) + Perfect 5th (7 semitones)**\n   - The only difference between Major and Minor is that the 3rd note is **one fret lower**!\n   - Example: A Major has C#, while A Minor lowers it to C natural.\n3. **The 7th Chord (Blues / Soul):**\n   - Adds a flattened 7th note on top of a major triad. Creates that unmistakable bluesy tension wanting to resolve home!`
      };
    }

    // 12. App Features Guidance
    if (textLower.includes('how do i transcribe') || textLower.includes('transcriber') || textLower.includes('upload song') || textLower.includes('exact notes')) {
      return {
        reply: `**How to Use the AI Song & Tab Transcriber 🎧**\n\nOur Transcriber tool lets you take any song and extract the exact guitar notes, chords, and tabs:\n\n1. Head over to **Song Transcriber** (\`#youtube\`).\n2. You have two options:\n   - **Paste a Link:** Paste any YouTube or audio web link.\n   - **Upload Audio File:** Drag-and-drop your MP3, WAV, or M4A file from your computer.\n3. Click **"Transcribe Notes"** — our engine analyzes the audio frequencies, detects pitch onsets, and builds the full guitar tab.\n4. Click **Play** on the interactive synthesizer to hear the notes sounded out and watch the animated fretboard light up in real time!`,
        suggestedAction: {
          label: 'Open Song Transcriber',
          route: '#youtube'
        }
      };
    }

    // 13. General Contextual Fallback Tailored to Persona
    const personaFallbacks: Record<CoachPersonalityId, string> = {
      maya: `That is an interesting thought, ${userName}! 🌿 Guitar playing is an ongoing journey of muscle memory and ear training. Could you tell me a little more about what you're working on right now—are you focusing on learning a specific chord, rhythm strumming, or playing through a song?`,
      axel: `Right on, ${userName}! 🎸 Look, guitar is all about getting those fingers moving without overthinking. Are we tackling a heavy riff, power chords, or dialing in your pick speed today? Lay it on me!`,
      professor_chen: `A valid consideration, ${userName}. In guitar pedagogy, technical precision precedes expressive freedom. Clarify for me: are you inquiring regarding fretboard geometry, harmonic analysis, or specific motor mechanics?`,
      maestro_antonio: `I hear you, ${userName}. Take your time. When we practice with intention, every barrier becomes a stepping stone. What part of the instrument or song is giving you resistance right now?`,
      general: `Patience and steady practice win every time, ${userName}. Let us slow down the tempo and isolate the technique. What specifically would you like to work through?`
    };

    return {
      reply: personaFallbacks[coachId] || personaFallbacks.maya
    };
  }
}
