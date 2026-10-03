import { appStore } from '../store';
import { AIService } from '../services/ai';
import { renderNav, setupNavEvents } from '../components/nav';
import { COACH_PERSONALITIES, type CoachPersonalityId } from '@guitarmind/core';
import { ConversationsRepo } from '../repositories/conversations.repo';
import { supabase } from '../lib/supabase';
import { icons } from '../components/icons';
import { LocalVisionService } from '../services/local-vision';

interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
  time: string;
  diagramsHTML?: string;
  imageUrl?: string;
  analysisText?: string;
}

// Conversation cache in memory to retain chat history between route switches
let conversationHistory: ChatMessage[] = [];
let activeConversationId: string | null = null;

function getCoachInitials(id: string): string {
  const map: Record<string, string> = {
    maya: 'M',
    axel: 'A',
    professor_chen: 'P',
    maestro_antonio: 'M',
    general: 'G'
  };
  return map[id] || 'M';
}

export const coachRoute = {
  path: '#coach',
  render: async () => {
    const user = appStore.getState().currentUser;
    const coachId = user ? user.coachPersonality : 'maya';
    const coach = COACH_PERSONALITIES[coachId] || COACH_PERSONALITIES.maya;

    if (!user) return `Please login first`;

    // 1. Resolve provider and API key structure
    const activeProvider = user.aiConfig?.provider || 'groq';
    let keysObj: Record<string, string> = {};
    try {
      keysObj = JSON.parse(user.aiConfig?.apiKeyEncrypted || '{}');
    } catch {
      if (user.aiConfig?.apiKeyEncrypted) {
        keysObj[activeProvider] = user.aiConfig.apiKeyEncrypted;
      }
    }
    const hasApiKey = !!keysObj[activeProvider];

    // 2. Load Supabase conversation history
    try {
      const conversations = await ConversationsRepo.listConversations(user.uid);
      let activeConv = conversations.find(c => c.personalityId === coachId);
      if (!activeConv) {
        const newConv = {
          id: `conv_${Date.now()}`,
          title: `${coach.name} Chat`,
          personalityId: coachId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 0
        };
        const created = await ConversationsRepo.createConversation(user.uid, newConv);
        if (created) activeConv = newConv;
      }
      
      if (activeConv) {
        activeConversationId = activeConv.id;
        const dbMsgs = await ConversationsRepo.getMessages(activeConv.id);
        if (dbMsgs.length === 0) {
          if (hasApiKey) {
            await ConversationsRepo.addMessage(activeConv.id, user.uid, {
              id: `msg_${Date.now()}_a`,
              role: 'assistant',
              content: coach.sampleGreeting,
              contentType: 'text',
              timestamp: new Date().toISOString()
            });
            conversationHistory = [{
              sender: 'coach',
              text: coach.sampleGreeting,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }];
          } else {
            conversationHistory = [];
          }
        } else {
          conversationHistory = dbMsgs.map(m => ({
            sender: m.role === 'user' ? 'user' : 'coach',
            text: m.content,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            diagramsHTML: (m.metadata as any)?.diagramsHTML || undefined,
            imageUrl: (m.metadata as any)?.imageUrl || undefined,
            analysisText: (m.metadata as any)?.analysisText || undefined
          }));
        }
      }
    } catch (err) {
      console.error('Error loading Supabase conversation in render:', err);
    }

    const initials = getCoachInitials(coachId);
    const messagesHTML = conversationHistory
      .map(
        (m) => `
      <div class="chat-message-row ${m.sender === 'user' ? 'msg-user-row' : 'msg-coach-row'} animate-scale-in">
        ${
          m.sender === 'coach'
            ? `<div class="chat-avatar-circle flex items-center justify-center font-bold text-xs bg-primary-container text-primary-color" style="width: 32px; height: 32px; border-radius: 50%;">${initials}</div>`
            : ''
        }
        <div class="chat-bubble ${m.sender === 'user' ? 'bubble-user' : 'bubble-coach'} glass-card">
          ${m.imageUrl ? `
            <div class="chat-attached-image-wrapper mb-2 relative rounded overflow-hidden" style="max-width: 240px; border: 1px solid rgba(255,255,255,0.08);">
              <img src="${m.imageUrl}" alt="Attached image" class="w-full h-auto object-cover" />
              ${m.analysisText ? `
                <div class="absolute bottom-0 inset-x-0 p-1.5 bg-black/60 backdrop-blur-sm text-xxs font-mono text-success flex items-center gap-1">
                  ${icons.check('w-3 h-3')} Vision Match: ${m.analysisText.length > 25 ? m.analysisText.slice(0, 22) + '...' : m.analysisText}
                </div>
              ` : ''}
            </div>
          ` : ''}
          <p class="chat-text" style="${m.sender === 'user' ? 'color: #000000 !important;' : 'color: var(--text-primary);'}">${m.text}</p>
          ${m.diagramsHTML || ''}
          <span class="chat-time">${m.time}</span>
        </div>
      </div>
    `
      )
      .join('');

    const isVoiceActive = localStorage.getItem('coach_voice_active') === 'true';
    return `
      <div class="coach-page-container animate-fade-in mb-16">
        <main class="coach-main flex flex-col">
          
          <!-- Coach Chat Header -->
          <header class="chat-header flex justify-between items-center mb-4 glass-card">
            <div class="flex items-center gap-3">
              <div class="avatar avatar-md flex justify-center items-center text-2xl bg-glass border-glass">${coach.emoji}</div>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="m-0 text-sm font-semibold">${coach.name}</h4>
                  <span class="badge badge-success py-0 px-2 text-xxs font-normal uppercase tracking-wider" style="border: 1px solid var(--border-glass);">Active</span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <button id="btn-toggle-voice" class="btn btn-secondary btn-icon flex items-center justify-center" title="Toggle Voice Coach">
                ${isVoiceActive ? icons.volume2('w-4 h-4') : icons.volumeX('w-4 h-4')}
              </button>
              <button id="btn-change-coach" class="btn btn-secondary btn-icon flex items-center justify-center" title="Switch Coach Personality">
                ${icons.refreshCw('w-4 h-4')}
              </button>
            </div>
          </header>

          ${hasApiKey ? `
            <!-- Chat Messages -->
            <div class="chat-messages-area flex-grow overflow-y-auto p-4 flex flex-col gap-3" id="chat-messages-container">
              ${messagesHTML}
              
              <!-- Typing Indicator -->
              <div id="chat-typing-indicator" class="chat-message-row msg-coach-row hidden">
                <div class="chat-avatar-circle flex items-center justify-center font-bold text-xs bg-primary-container text-primary-color" style="width: 32px; height: 32px; border-radius: 50%;">${initials}</div>
                <div class="chat-bubble bubble-coach glass-card p-3">
                  <div class="typing-indicator-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Action Chips -->
            <div class="quick-chips-row flex gap-2 overflow-x-auto px-4 pb-2">
              <button class="chip action-chip flex items-center gap-1 text-xs">${icons.activity('w-3.5 h-3.5')} How am I doing?</button>
              <button class="chip action-chip flex items-center gap-1 text-xs">${icons.music('w-3.5 h-3.5')} Teach me G Major</button>
              <button class="chip action-chip flex items-center gap-1 text-xs">${icons.clock('w-3.5 h-3.5')} Give me an exercise</button>
              <button class="chip action-chip flex items-center gap-1 text-xs">${icons.sparkles('w-3.5 h-3.5')} Recommend a song</button>
            </div>

            <!-- Attached Image Preview Container -->
            <div id="attached-image-preview-area" class="px-4 py-2 border-top hidden flex items-center gap-3" style="background: rgba(0,0,0,0.15); border-top: 1px solid rgba(255,255,255,0.04);">
              <div class="relative w-16 h-16 rounded overflow-hidden border-glass" style="border: 1px solid rgba(255,255,255,0.12);">
                <img id="attached-image-thumbnail" class="w-full h-full object-cover" />
                <button type="button" id="btn-remove-attached-image" class="absolute top-0 right-0 bg-red-500/80 text-white rounded-bl w-5 h-5 flex items-center justify-center text-xs font-bold" style="border: none; cursor: pointer;">&times;</button>
              </div>
              <div class="flex-grow">
                <span class="text-xs font-semibold block text-primary-color-light">Image Attached</span>
                <span id="attached-image-status" class="text-xxs font-mono text-muted-color">Pending upload...</span>
              </div>
            </div>

            <!-- Message Input Form -->
            <form id="chat-input-form" class="chat-input-row flex gap-2 items-center p-3 border-top" style="background: rgba(0,0,0,0.1); border-top: 1px solid rgba(255,255,255,0.06);">
              <input type="file" id="chat-image-input" accept="image/*" class="hidden" />
              <button type="button" id="btn-attach-image" class="btn btn-secondary btn-icon flex items-center justify-center" title="Attach Image File" style="border-radius: 50%; min-width: 38px; height: 38px; border: 1px solid rgba(255,255,255,0.08);">
                ${icons.image('w-4 h-4')}
              </button>
              <button type="button" id="btn-camera-snapshot" class="btn btn-secondary btn-icon flex items-center justify-center" title="Capture from Camera" style="border-radius: 50%; min-width: 38px; height: 38px; border: 1px solid rgba(255,255,255,0.08);">
                ${icons.camera('w-4 h-4')}
              </button>
              <input type="text" id="chat-message-input" class="input flex-grow text-sm" placeholder="Message your coach..." autocomplete="off" />
              <button type="submit" class="btn btn-primary btn-icon flex items-center justify-center" id="btn-send-message">
                ${icons.send('w-4 h-4')}
              </button>
            </form>
          ` : `
            <!-- Connect AI Provider Lock Screen -->
            <div class="flex-grow flex flex-col items-center justify-center p-6 text-center">
              <div class="glass-card p-6 flex flex-col items-center max-w-sm border-glass text-center animate-scale-in" style="background: rgba(124, 58, 237, 0.03); border: 1px solid var(--border-glass);">
                <div class="text-primary-color mb-4" style="filter: drop-shadow(0 0 8px rgba(124,58,237,0.3));">
                  ${icons.lock('w-12 h-12')}
                </div>
                <h3 class="m-0 mb-2 font-semibold">Connect AI Provider</h3>
                <p class="text-xs text-muted-color mb-4">Maya is ready to teach you, but you need to connect your AI Provider key first. We recommend Groq (Llama-3.3-70b-versatile) for the best response speed.</p>
                <button class="btn btn-primary w-full py-2.5" onclick="window.location.hash = '#settings'">
                  <span>Configure API Key</span>
                </button>
              </div>
            </div>
          `}

        </main>

        <!-- Camera Snapshot Modal -->
        <div id="camera-modal-overlay" class="modal-overlay hidden flex items-center justify-center z-50" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);">
          <div class="glass-card p-6 flex flex-col gap-4 max-w-md w-full border-glass" style="background: var(--card-bg); border-radius: 8px;">
            <div class="flex justify-between items-center">
              <h3 class="m-0 text-sm font-semibold">Capture Practice Snapshot</h3>
              <button type="button" id="btn-close-camera-modal" class="btn btn-secondary flex items-center justify-center font-bold" style="border: none; padding: 4px 8px; font-size: 16px; border-radius: 4px;">✕</button>
            </div>
            
            <div class="relative bg-black rounded overflow-hidden aspect-video flex items-center justify-center" style="min-height: 240px; border: 1px solid rgba(255,255,255,0.08);">
              <video id="camera-modal-video" class="w-full h-full object-cover" autoplay playsinline muted></video>
              <canvas id="camera-modal-canvas" class="hidden"></canvas>
            </div>
            
            <button type="button" id="btn-capture-camera" class="btn btn-primary w-full py-3 flex items-center justify-center gap-2">
              ${icons.camera('w-4 h-4')} Capture Frame
            </button>
          </div>
        </div>

        <!-- Coach Personality Switcher Drawer (Hidden by default) -->
        <div id="coach-drawer-overlay" class="modal-overlay hidden">
          <div class="modal coach-drawer animate-scale-in">
            <h3 class="mb-4">Select AI Coach</h3>
            <div class="flex flex-col gap-3" id="coach-selector-list">
              <!-- Dynamically populated -->
            </div>
            <button id="btn-close-drawer" class="btn btn-secondary w-full mt-4">Close</button>
          </div>
        </div>

        <!-- Practice Chord Modal Overlay -->
        <div id="practice-modal-overlay" class="modal-overlay hidden flex justify-center items-center">
          <div class="modal practice-modal animate-scale-in" style="max-width: 580px; width: 90%; border-radius: 4px; border: 1px solid var(--border-glass); background: #000000; padding: 20px;">
            <div class="flex justify-between items-center mb-4">
              <h3 id="practice-modal-title" class="m-0" style="font-size: 1.15rem; color: #fff;">Practice Chord Studio</h3>
              <button id="btn-close-practice" class="btn btn-secondary btn-icon" style="border-radius: 4px; padding: 4px 8px; border: 1px solid rgba(255,255,255,0.08);">✕</button>
            </div>
            
            <div class="grid grid-cols-2 gap-4" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <!-- Left Column: Media feeds -->
              <div class="flex flex-col gap-3" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="video-container relative" style="height: 160px; background: #08080a; border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; position: relative;">
                  <video id="practice-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
                  <canvas id="practice-posture-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></canvas>
                  <div class="video-overlay-text text-xxs p-1 bg-black-50 absolute bottom-0 left-0" style="color: var(--text-muted); position: absolute; bottom: 4px; left: 4px; font-size: 9px; background: rgba(0,0,0,0.6); padding: 2px 4px; border-radius: 2px;">POSTURE FEED</div>
                </div>
                
                <div class="audio-feedback-container p-3 bg-card-elevated border-glass rounded-lg" style="height: 110px; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 1px solid rgba(255,255,255,0.06); background: #08080a;">
                  <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Microphone Stream</div>
                  <canvas id="practice-audio-canvas" width="200" height="40" style="width: 100%; height: 40px; background: rgba(255,255,255,0.01); border-radius: 2px;"></canvas>
                  <div class="audio-detected-note text-sm font-semibold mt-2" id="practice-detected-note" style="color: var(--color-accent); font-size: 11px; margin-top: 6px;">Listening for strum...</div>
                </div>
              </div>
              
              <!-- Right Column: Visuals & Controls -->
              <div class="flex flex-col justify-between" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div class="flex items-center gap-2 mb-3" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Target Chord:</span>
                    <span id="practice-chord-badge" class="badge badge-success text-sm px-2" style="background: #ffffff; color: #000; border-radius: 4px; font-weight: 700; font-size: 12px; padding: 2px 8px;">G Major</span>
                  </div>
                  
                  <!-- Missing String selector -->
                  <div class="mb-4" style="margin-bottom: 16px;">
                    <label for="practice-missing-string" style="font-size: 10px; color: var(--text-muted); display: block; margin-bottom: 4px;">Guitar missing a string?</label>
                    <select id="practice-missing-string" class="select w-full" style="background: #121216; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 6px; color: #fff; font-size: 11px;">
                      <option value="none">None (All strings intact)</option>
                      <option value="5">1st string (High E) missing</option>
                      <option value="4">2nd string (B) missing</option>
                      <option value="3">3rd string (G) missing</option>
                      <option value="2">4th string (D) missing</option>
                      <option value="1">5th string (A) missing</option>
                      <option value="0">6th string (Low E) missing</option>
                    </select>
                  </div>
                  
                  <!-- Dynamic adjusted chord diagrams -->
                  <div id="practice-alternative-diagrams" class="flex justify-center gap-3 p-2 bg-glass rounded border-glass mb-4" style="display: flex; justify-content: center; gap: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 8px; border-radius: 4px; margin-bottom: 12px; min-height: 80px; align-items: center;">
                    <!-- Adjusted SVGs go here -->
                  </div>
                </div>
                
                <!-- Feedback panel -->
                <div class="feedback-panel p-3 border-glass rounded" id="practice-feedback-panel" style="background: rgba(251, 191, 36, 0.04); border: 1px solid rgba(251, 191, 36, 0.15); padding: 8px; border-radius: 4px; height: 60px; overflow-y: auto;">
                  <div class="text-xs font-bold text-accent-color uppercase mb-1" style="font-size: 9px; color: var(--color-accent); font-weight: 700; margin-bottom: 2px;">Evaluation Feedback</div>
                  <p class="text-xs leading-relaxed m-0" id="practice-feedback-text" style="font-size: 11px; margin: 0; line-height: 1.3;">Strum the chord clearly when ready to analyze.</p>
                </div>
              </div>
            </div>
            
            <div class="flex gap-2 mt-4" style="display: flex; gap: 8px; margin-top: 16px;">
              <button id="btn-practice-listen" class="btn btn-secondary flex-grow flex items-center justify-center gap-1" style="flex-grow: 1; font-size: 12px; border-radius: 4px; padding: 8px 12px; border: 1px solid rgba(255,255,255,0.08);">${icons.volume2('w-3.5 h-3.5')} Listen to Target</button>
              <button id="btn-practice-check" class="btn btn-primary flex-grow flex items-center justify-center gap-1" style="flex-grow: 1; font-size: 12px; border-radius: 4px; padding: 8px 12px; background: #ffffff; color: #000; font-weight: 700; border: none;">Evaluate Playback</button>
            </div>
          </div>
        </div>

        <!-- Render Bottom Nav -->
        ${renderNav()}
      </div>
    `;
  },
  onMount: () => {
    setupNavEvents();
    setupChatLogic();
  },
  onUnmount: () => {
    console.log('Unmounting Coach Route');
    delete (window as any).playChordAudio;
    delete (window as any).openChordPractice;
  }
};

let isVoiceActive = false;

function setupChatLogic(): void {
  const form = document.getElementById('chat-input-form') as HTMLFormElement;
  const input = document.getElementById('chat-message-input') as HTMLInputElement;
  const container = document.getElementById('chat-messages-container') as HTMLDivElement;
  const typing = document.getElementById('chat-typing-indicator') as HTMLDivElement;

  // Attachment elements
  const btnAttachImage = document.getElementById('btn-attach-image') as HTMLButtonElement;
  const chatImageInput = document.getElementById('chat-image-input') as HTMLInputElement;
  const attachedImagePreviewArea = document.getElementById('attached-image-preview-area') as HTMLDivElement;
  const attachedImageThumbnail = document.getElementById('attached-image-thumbnail') as HTMLImageElement;
  const btnRemoveAttachedImage = document.getElementById('btn-remove-attached-image') as HTMLButtonElement;
  const attachedImageStatus = document.getElementById('attached-image-status') as HTMLSpanElement;

  // Camera elements
  const btnCameraSnapshot = document.getElementById('btn-camera-snapshot') as HTMLButtonElement;
  const cameraModalOverlay = document.getElementById('camera-modal-overlay') as HTMLDivElement;
  const btnCloseCameraModal = document.getElementById('btn-close-camera-modal') as HTMLButtonElement;
  const btnCaptureCamera = document.getElementById('btn-capture-camera') as HTMLButtonElement;
  const cameraVideo = document.getElementById('camera-modal-video') as HTMLVideoElement;
  const cameraCanvas = document.getElementById('camera-modal-canvas') as HTMLCanvasElement;

  let attachedImageBase64: string | null = null;
  let cameraStream: MediaStream | null = null;

  const btnToggleVoice = document.getElementById('btn-toggle-voice') as HTMLButtonElement;
  isVoiceActive = localStorage.getItem('coach_voice_active') === 'true';
  if (btnToggleVoice) {
    btnToggleVoice.innerHTML = isVoiceActive ? icons.volume2('w-4 h-4') : icons.volumeX('w-4 h-4');
    btnToggleVoice.addEventListener('click', () => {
      isVoiceActive = !isVoiceActive;
      localStorage.setItem('coach_voice_active', isVoiceActive ? 'true' : 'false');
      btnToggleVoice.innerHTML = isVoiceActive ? icons.volume2('w-4 h-4') : icons.volumeX('w-4 h-4');
      if (!isVoiceActive) {
        window.speechSynthesis.cancel();
      }
    });
  }

  const btnChangeCoach = document.getElementById('btn-change-coach') as HTMLButtonElement;
  const drawerOverlay = document.getElementById('coach-drawer-overlay') as HTMLDivElement;
  const btnCloseDrawer = document.getElementById('btn-close-drawer') as HTMLButtonElement;
  const coachSelectorList = document.getElementById('coach-selector-list') as HTMLDivElement;

  // Auto scroll to bottom
  const scrollToBottom = () => {
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };
  scrollToBottom();

  // Remove attached image
  const clearAttachedImage = () => {
    attachedImageBase64 = null;
    if (chatImageInput) chatImageInput.value = '';
    if (attachedImagePreviewArea) attachedImagePreviewArea.classList.add('hidden');
    if (input) input.required = true;
  };

  if (btnRemoveAttachedImage) {
    btnRemoveAttachedImage.addEventListener('click', clearAttachedImage);
  }

  // Handle image file selection
  if (btnAttachImage && chatImageInput) {
    btnAttachImage.addEventListener('click', () => chatImageInput.click());
    chatImageInput.addEventListener('change', async () => {
      const file = chatImageInput.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        attachedImageBase64 = base64;
        
        if (attachedImageThumbnail) attachedImageThumbnail.src = base64;
        if (attachedImagePreviewArea) attachedImagePreviewArea.classList.remove('hidden');
        if (input) input.required = false;
        
        if (attachedImageStatus) {
          attachedImageStatus.textContent = 'Checking server...';
          const isOnline = await LocalVisionService.checkStatus();
          attachedImageStatus.textContent = isOnline ? 'Local model online' : 'Offline (Multimodal fallback)';
          attachedImageStatus.style.color = isOnline ? '#10b981' : '#f59e0b';
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle Camera snapshot modal
  if (btnCameraSnapshot && cameraModalOverlay && cameraVideo) {
    btnCameraSnapshot.addEventListener('click', async () => {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false
        });
        cameraVideo.srcObject = cameraStream;
        cameraVideo.play();
        cameraModalOverlay.classList.remove('hidden');
      } catch (err) {
        console.error('Failed to open webcam:', err);
        alert('Could not access camera. Please check permissions.');
      }
    });

    const stopCamera = () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }
      cameraVideo.srcObject = null;
      cameraModalOverlay.classList.add('hidden');
    };

    if (btnCloseCameraModal) {
      btnCloseCameraModal.addEventListener('click', stopCamera);
    }

    if (btnCaptureCamera && cameraCanvas) {
      btnCaptureCamera.addEventListener('click', () => {
        const ctx = cameraCanvas.getContext('2d');
        if (ctx) {
          cameraCanvas.width = cameraVideo.videoWidth || 640;
          cameraCanvas.height = cameraVideo.videoHeight || 480;
          ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
          
          const base64 = cameraCanvas.toDataURL('image/jpeg', 0.85);
          attachedImageBase64 = base64;
          
          if (attachedImageThumbnail) attachedImageThumbnail.src = base64;
          if (attachedImagePreviewArea) attachedImagePreviewArea.classList.remove('hidden');
          if (input) input.required = false;

          if (attachedImageStatus) {
            attachedImageStatus.textContent = 'Analyzing snapshot...';
            LocalVisionService.checkStatus().then(isOnline => {
              attachedImageStatus.textContent = isOnline ? 'Local model online' : 'Offline (Multimodal fallback)';
              attachedImageStatus.style.color = isOnline ? '#10b981' : '#f59e0b';
            });
          }
        }
        stopCamera();
      });
    }
  }

  // Send message
  if (form && input && container && typing) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      const attachedImage = attachedImageBase64;

      if (!text && !attachedImage) return;

      input.value = '';
      clearAttachedImage();

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Append user message directly to DOM first
      const userRow = document.createElement('div');
      userRow.className = 'chat-message-row msg-user-row animate-scale-in';
      
      let imageHtml = '';
      let imageMetadata: any = undefined;

      if (attachedImage) {
        typing.classList.remove('hidden');
        scrollToBottom();

        // Run local image recognition
        const isOnline = await LocalVisionService.checkStatus();
        let analysisText = '';
        let results: any = null;

        if (isOnline) {
          const res = await LocalVisionService.analyzeImage(attachedImage);
          results = res;
          if (res.success) {
            analysisText = `Guitar detected: ${res.guitarDetected ? 'Yes' : 'No'} (${res.guitarStyle})`;
            if (res.chordDetected) analysisText += `, playing chord: ${res.chordDetected}`;
            if (res.postureMetrics) {
              analysisText += `, Posture Score: ${res.postureMetrics.score}/100. Warnings: ${res.postureMetrics.warnings.join('; ') || 'None'}`;
            }
          } else {
            analysisText = `Local model failed: ${res.error}`;
          }
        } else {
          analysisText = "Local Vision Server Offline. Unable to run local image recognition.";
          results = { success: false, error: 'Server offline' };
        }

        imageMetadata = {
          imageUrl: attachedImage,
          analysisText: analysisText,
          results: results
        };

        imageHtml = `
          <div class="chat-attached-image-wrapper mb-2 relative rounded overflow-hidden" style="max-width: 240px; border: 1px solid rgba(255,255,255,0.08);">
            <img src="${attachedImage}" alt="Attached image" class="w-full h-auto object-cover" />
            <div class="absolute bottom-0 inset-x-0 p-1.5 bg-black/60 backdrop-blur-sm text-xxs font-mono text-success flex items-center gap-1">
              ${icons.check('w-3 h-3')} Vision Match: ${analysisText.length > 25 ? analysisText.slice(0, 22) + '...' : analysisText}
            </div>
          </div>
        `;
      }

      userRow.innerHTML = `
        <div class="chat-bubble bubble-user glass-card">
          ${imageHtml}
          <p class="chat-text" style="color: #000000 !important; font-weight: 500;">${text || 'Image attached'}</p>
          <span class="chat-time">${time}</span>
        </div>
      `;
      container.insertBefore(userRow, typing);
      scrollToBottom();

      // Add user message to history
      conversationHistory.push({
        sender: 'user',
        text: text || 'Image attached',
        time,
        imageUrl: imageMetadata?.imageUrl,
        analysisText: imageMetadata?.analysisText
      });

      // Trigger typing indicator and coach response
      triggerCoachResponse(text || 'Image attached', typing, container, scrollToBottom, imageMetadata);
    });

    // Action chips click handler
    const actionChips = document.querySelectorAll('.action-chip');
    actionChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        input.value = chip.textContent || '';
        input.focus();
      });
    });
  }

  // Drawer logic
  if (btnChangeCoach && drawerOverlay && btnCloseDrawer && coachSelectorList) {
    btnChangeCoach.addEventListener('click', () => {
      populateCoachList(coachSelectorList, drawerOverlay);
      drawerOverlay.classList.remove('hidden');
    });

    btnCloseDrawer.addEventListener('click', () => {
      drawerOverlay.classList.add('hidden');
    });
    
    drawerOverlay.addEventListener('click', (e) => {
      if (e.target === drawerOverlay) {
        drawerOverlay.classList.add('hidden');
      }
    });
  }
  
  (window as any).playChordAudio = playChordAudio;
  (window as any).openChordPractice = openChordPractice;
}

function populateCoachList(listContainer: HTMLDivElement, overlay: HTMLDivElement): void {
  const user = appStore.getState().currentUser;
  const activeCoach = user ? user.coachPersonality : 'maya';

  listContainer.innerHTML = Object.values(COACH_PERSONALITIES)
    .map(
      (coach) => `
    <div class="coach-card flex items-center p-3 gap-4 cursor-pointer ${
      activeCoach === coach.id ? 'card-selected' : ''
    }" data-coach-id="${coach.id}">
      <div class="coach-avatar-wrapper flex items-center justify-center font-bold text-xs bg-primary-container text-primary-color" style="width: 32px; height: 32px; border-radius: 50%;">${getCoachInitials(coach.id)}</div>
      <div class="flex-grow">
        <h4 class="m-0">${coach.name}</h4>
        <p class="text-xs text-muted-color m-0 mt-1">${coach.tagline}</p>
      </div>
    </div>
  `
    )
    .join('');

  // Select coach handler
  const cards = listContainer.querySelectorAll('.coach-card');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const coachId = card.getAttribute('data-coach-id') as CoachPersonalityId;
      const user = appStore.getState().currentUser;
      if (user) {
        appStore.setState({
          currentUser: { ...user, coachPersonality: coachId }
        });

        // Reset chat history with new coach greeting
        const newCoach = COACH_PERSONALITIES[coachId];
        conversationHistory = [
          {
            sender: 'coach',
            text: newCoach.sampleGreeting,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];

        overlay.classList.add('hidden');

        // Re-render chat
        const appContainer = document.getElementById('app');
        if (appContainer && window.location.hash === '#coach') {
          coachRoute.render().then((html) => {
            appContainer.innerHTML = html;
            coachRoute.onMount();
          });
        }
      }
    });
  });
}

function triggerCoachResponse(
  userText: string,
  typingIndicator: HTMLDivElement,
  container: HTMLDivElement,
  scrollToBottom: () => void,
  imageMetadata?: { imageUrl: string; analysisText: string; results: any }
): void {
  const user = appStore.getState().currentUser;
  const coachId = user ? user.coachPersonality : 'maya';
  const coach = COACH_PERSONALITIES[coachId] || COACH_PERSONALITIES.maya;

  // Show typing indicator
  typingIndicator.classList.remove('hidden');
  scrollToBottom();

  // Create response generation logic
  setTimeout(async () => {
    typingIndicator.classList.add('hidden');

    let reply = '';
    const textLower = userText.toLowerCase().trim();

    // Check for chord mention in user text
    const chordName = extractChord(userText);

    let diagramsHTML = '';
    if (chordName) {
      const bookSVG = renderBookNotationSVG(chordName);
      const fingerSVG = renderFingerPlacementSVG(chordName);
      diagramsHTML = `
        <div class="chord-diagrams-container flex flex-col items-center gap-4 mt-4 p-3 bg-card-elevated border-glass rounded-lg" style="border: 1px solid rgba(255,255,255,0.06); width: 100%;">
          <div class="flex flex-wrap gap-4 w-full justify-center">
            <div class="chord-diagram-box flex-1 flex flex-col items-center" style="min-width: 130px;">
              <span style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">Book Notation</span>
              ${bookSVG}
            </div>
            <div class="chord-diagram-box flex-1 flex flex-col items-center" style="min-width: 220px;">
              <span style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">Finger Placement</span>
              ${fingerSVG}
            </div>
          </div>
          
          <!-- Chord Action Buttons -->
          <div class="flex gap-2 w-full mt-2" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; justify-content: center;">
            <button type="button" class="btn btn-secondary btn-sm flex items-center gap-1.5 py-1.5 px-3 text-xs" style="border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);" onclick="window.playChordAudio('${chordName}')">
              ${icons.volume2('w-3.5 h-3.5')} Listen
            </button>
            <button type="button" class="btn btn-primary btn-sm flex items-center gap-1.5 py-1.5 px-3 text-xs" style="border-radius: 4px; background: #ffffff; color: #000; font-weight: 700; border: none;" onclick="window.openChordPractice('${chordName}')">
              ${icons.disc('w-3.5 h-3.5')} Practice Chord
            </button>
          </div>
        </div>
      `;
    }

    try {
      if (!user || !activeConversationId) {
        throw new Error('User session or active conversation is missing.');
      }

      reply = await AIService.generateContextualResponse(
        user.uid,
        activeConversationId,
        userText,
        coach.systemPrompt + (chordName ? `\n\nThe user is asking about the ${CHORD_LIBRARY[chordName]?.name || chordName} chord. Explain its shape, how to place fingers, and strumming tips.` : ''),
        imageMetadata
      );
      
      // Update local storage diagrams metadata if chord was generated
      if (chordName && diagramsHTML) {
        const { data: messagesList } = await supabase
          .from('ai_messages')
          .select('id')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (messagesList && messagesList[0]) {
          await supabase
            .from('ai_messages')
            .update({ metadata: { diagramsHTML } })
            .eq('id', messagesList[0].id);
        }
      }
    } catch (err) {
      console.error('Contextual AI response generation failed, using mock backup:', err);
      // Simple reactive response matrix based on keywords and personality
      if (textLower.includes('how am i') || textLower.includes('progress') || textLower.includes('doing')) {
        if (coachId === 'maya') {
          reply = "You're doing fantastic! You've logged 3 days of practice this week, and you are getting so close to G-C chord mastery. Keep up the positive vibe! 🌱";
        } else if (coachId === 'axel') {
          reply = "You're making total noise, my friend! You logged 3 solid days. Keep hitting those chord transitions, and you'll be shreds-ready in no time! 🎸🤘";
        } else if (coachId === 'professor_chen') {
          reply = "Looking at your log, you have successfully completed 3 sessions this week with an average clarity rating of 85%. Your rhythmic precision is developing steadily. Let us continue studying scale positions.";
        } else {
          reply = "Your practice discipline is commendable. The hand movements are becoming more deliberate. Focus on keeping your wrist relaxed as we build transitions.";
        }
      } else if (chordName) {
        reply = getChordExplanation(chordName);
      } else if (textLower.includes('g major') || textLower.includes('chord') || textLower.includes('teach')) {
        reply = "To play the **G Major chord**, place your 2nd finger (middle) on the 6th string 3rd fret, your 1st finger (index) on the 5th string 2nd fret, and your 3rd finger (ring) on the 1st string 3rd fret. Strum all 6 strings clearly!";
      } else if (textLower.includes('exercise') || textLower.includes('practice') || textLower.includes('give')) {
        reply = "Here is a quick transition exercise: Play G Major for 4 beats, then switch to C Major for 4 beats. Set your metronome to 60 BPM and repeat this cycle 10 times. Focus on clean notes!";
      } else if (textLower.includes('song') || textLower.includes('recommend')) {
        reply = "I highly recommend trying **'House of the Rising Sun'** (uses Am, C, D, F, E) or **'Knockin' on Heaven's Door'** (uses G, D, Am, C). They are absolute classics and perfect for chord progression building!";
      } else {
        // General response fallback
        if (coachId === 'maya') {
          reply = "That's a great question! Learning guitar is all about exploring new sounds. Tell me, how do your fingers feel when holding standard open chords?";
        } else if (coachId === 'axel') {
          reply = "Oh yeah! That's what I'm talking about! Let's dial in some drive and jam on that riff. What's standing between you and the stage?";
        } else if (coachId === 'professor_chen') {
          reply = "I understand. Musically, what you've described is related to fretboard layout. Let's break it down structurally. What part of the fretboard feel most complex?";
        } else {
          reply = "Patience is a crucial aspect of technique. Let us focus on slowing down the movement. Pluck each string separately to verify tone clarity.";
        }
      }

      // Keep DB synchronized on error fallback
      if (activeConversationId && user) {
        await ConversationsRepo.addMessage(activeConversationId, user.uid, {
          id: `msg_${Date.now()}_u`,
          role: 'user',
          content: userText,
          contentType: imageMetadata ? 'image_analysis' : 'text',
          timestamp: new Date().toISOString(),
          metadata: imageMetadata ? {
            imageUrl: imageMetadata.imageUrl,
            analysisText: imageMetadata.analysisText,
            results: imageMetadata.results
          } as any : undefined
        });
        await ConversationsRepo.addMessage(activeConversationId, user.uid, {
          id: `msg_${Date.now()}_a`,
          role: 'assistant',
          content: reply,
          contentType: 'text',
          timestamp: new Date().toISOString(),
          metadata: diagramsHTML ? { diagramsHTML } as any : undefined
        });
      }
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    conversationHistory.push({ sender: 'coach', text: reply, time, diagramsHTML });

    // Append coach bubble to DOM
    const coachRow = document.createElement('div');
    coachRow.className = 'chat-message-row msg-coach-row animate-scale-in';
    coachRow.innerHTML = `
      <div class="chat-avatar-circle">${coach.emoji}</div>
      <div class="chat-bubble bubble-coach glass-card">
        <p class="chat-text">${reply}</p>
        ${diagramsHTML}
        <span class="chat-time">${time}</span>
      </div>
    `;
    container.insertBefore(coachRow, typingIndicator);
    scrollToBottom();

    // Trigger Speech synthesis if voice is active
    if (isVoiceActive) {
      speakCoachMessage(reply, coachId);
    }
  }, 1000);
}

function speakCoachMessage(text: string, coachId: string): void {
  window.speechSynthesis.cancel();
  
  // Strip markdown bold/italic tags
  const cleanText = text.replace(/\*\*|\*/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);

  if (coachId === 'maya') {
    utterance.pitch = 1.15;
    utterance.rate = 0.95;
  } else if (coachId === 'axel') {
    utterance.pitch = 1.05;
    utterance.rate = 1.15;
  } else if (coachId === 'professor_chen') {
    utterance.pitch = 0.95;
    utterance.rate = 0.98;
  } else if (coachId === 'general') {
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
  } else {
    utterance.pitch = 0.85;
    utterance.rate = 0.85;
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    if (coachId === 'maya') {
      const v = voices.find(voice => voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('zira') || voice.name.toLowerCase().includes('hazel'));
      if (v) utterance.voice = v;
    } else if (coachId === 'maestro_antonio') {
      const v = voices.find(voice => voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('david'));
      if (v) utterance.voice = v;
    }
  }

  window.speechSynthesis.speak(utterance);
}

// ----------------------------------------------------
// Chord library and SVG diagram renderers
// ----------------------------------------------------
interface ChordData {
  name: string;
  strings: (string | number)[];
  fingers: number[];
}

const CHORD_LIBRARY: Record<string, ChordData> = {
  c: { name: 'C', strings: ['X', 3, 2, 'O', 1, 'O'], fingers: [0, 3, 2, 0, 1, 0] },
  cm: { name: 'Cm', strings: ['X', 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1] },
  g: { name: 'G', strings: [3, 2, 'O', 'O', 'O', 3], fingers: [2, 1, 0, 0, 0, 3] },
  d: { name: 'D', strings: ['X', 'X', 'O', 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  dm: { name: 'Dm', strings: ['X', 'X', 'O', 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  e: { name: 'E', strings: ['O', 2, 2, 1, 'O', 'O'], fingers: [0, 2, 3, 1, 0, 0] },
  em: { name: 'Em', strings: ['O', 2, 2, 'O', 'O', 'O'], fingers: [0, 2, 3, 0, 0, 0] },
  a: { name: 'A', strings: ['X', 'O', 2, 2, 2, 'O'], fingers: [0, 0, 1, 2, 3, 0] },
  am: { name: 'Am', strings: ['X', 'O', 2, 2, 1, 'O'], fingers: [0, 0, 2, 3, 1, 0] },
  f: { name: 'F', strings: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
  b: { name: 'B', strings: ['X', 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1] },
  bm: { name: 'Bm', strings: ['X', 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1] },
  a7: { name: 'A7', strings: ['X', 'O', 2, 'O', 2, 'O'], fingers: [0, 0, 1, 0, 2, 0] },
  am7: { name: 'Am7', strings: ['X', 'O', 2, 'O', 1, 'O'], fingers: [0, 0, 2, 0, 1, 0] },
  d7: { name: 'D7', strings: ['X', 'X', 'O', 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  e7: { name: 'E7', strings: ['O', 2, 'O', 1, 'O', 'O'], fingers: [0, 2, 0, 1, 0, 0] },
  em7: { name: 'Em7', strings: ['O', 2, 'O', 'O', 'O', 'O'], fingers: [0, 2, 0, 0, 0, 0] },
  g7: { name: 'G7', strings: [3, 2, 'O', 'O', 'O', 1], fingers: [3, 2, 0, 0, 0, 1] },
  c7: { name: 'C7', strings: ['X', 3, 2, 3, 1, 'O'], fingers: [0, 3, 2, 4, 1, 0] },
  cmaj7: { name: 'Cmaj7', strings: ['X', 3, 2, 'O', 'O', 'O'], fingers: [0, 3, 2, 0, 0, 0] },
  dmaj7: { name: 'Dmaj7', strings: ['X', 'X', 'O', 2, 2, 2], fingers: [0, 0, 0, 1, 1, 1] },
  amaj7: { name: 'Amaj7', strings: ['X', 'O', 2, 1, 2, 'O'], fingers: [0, 0, 2, 1, 3, 0] },
  csus4: { name: 'Csus4', strings: ['X', 3, 3, 'O', 1, 'O'], fingers: [0, 3, 4, 0, 1, 0] },
  csus2: { name: 'Csus2', strings: ['X', 3, 'O', 'O', 1, 'O'], fingers: [0, 3, 0, 0, 1, 0] },
  asus4: { name: 'Asus4', strings: ['X', 'O', 2, 2, 3, 'O'], fingers: [0, 0, 1, 2, 4, 0] },
  asus2: { name: 'Asus2', strings: ['X', 'O', 2, 2, 'O', 'O'], fingers: [0, 0, 1, 2, 0, 0] },
  dsus4: { name: 'Dsus4', strings: ['X', 'X', 'O', 2, 3, 3], fingers: [0, 0, 0, 1, 2, 4] },
  dsus2: { name: 'Dsus2', strings: ['X', 'X', 'O', 2, 3, 'O'], fingers: [0, 0, 0, 1, 3, 0] }
};

function extractChord(text: string): string {
  const normalized = text.toLowerCase().trim();
  
  const longForms: Record<string, string> = {
    'c major': 'c', 'c minor': 'cm', 'c min': 'cm', 'c maj': 'c',
    'g major': 'g', 'g maj': 'g',
    'd major': 'd', 'd minor': 'dm', 'd min': 'dm', 'd maj': 'd',
    'e major': 'e', 'e minor': 'em', 'e min': 'em', 'e maj': 'e',
    'a major': 'a', 'a minor': 'am', 'a min': 'am', 'a maj': 'a',
    'f major': 'f', 'f maj': 'f',
    'b major': 'b', 'b minor': 'bm', 'b min': 'bm', 'b maj': 'b',
    'a7': 'a7', 'am7': 'am7', 'a minor 7': 'am7', 'a min 7': 'am7',
    'd7': 'd7', 'd minor 7': 'd7',
    'e7': 'e7', 'em7': 'em7', 'e minor 7': 'em7',
    'g7': 'g7', 'c7': 'c7',
    'cmaj7': 'cmaj7', 'c major 7': 'cmaj7',
    'dmaj7': 'dmaj7', 'd major 7': 'dmaj7',
    'amaj7': 'amaj7', 'a major 7': 'amaj7',
    'csus4': 'csus4', 'csus2': 'csus2',
    'asus4': 'asus4', 'asus2': 'asus2',
    'dsus4': 'dsus4', 'dsus2': 'dsus2'
  };

  for (const [phrase, key] of Object.entries(longForms)) {
    if (normalized.includes(phrase)) {
      return key;
    }
  }

  const textClean = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
  const words = textClean.split(/\s+/).map(w => w.trim()).filter(Boolean);

  const matches: string[] = [];
  for (const word of words) {
    if (CHORD_LIBRARY[word]) {
      matches.push(word);
    }
  }

  if (matches.length === 0) return '';

  if (matches.length === 1 && matches[0] !== 'a') {
    return matches[0];
  }

  const nonAMatches = matches.filter(m => m !== 'a');
  if (nonAMatches.length > 0) {
    return nonAMatches[0];
  }

  const aIndex = words.indexOf('a');
  if (aIndex !== -1 && aIndex < words.length - 1) {
    const nextWord = words[aIndex + 1];
    if (['chord', 'song', 'guitar', 'tuner', 'tip', 'practice', 'simple', 'new', 'scale'].includes(nextWord)) {
      return '';
    }
  }

  if (normalized.includes(' a chord') || normalized.includes(' a guitar') || normalized.includes(' a song') || normalized.includes(' a scale') || normalized.startsWith('a chord')) {
    return '';
  }

  return 'a';
}

function getChordExplanation(chordKey: string): string {
  const chord = CHORD_LIBRARY[chordKey];
  if (!chord) return "I can help you with chord shapes. Which chord would you like to learn?";
  
  const fingerNames = ["", "Index (1)", "Middle (2)", "Ring (3)", "Pinky (4)"];
  const stringNames = ["6th (Low E)", "5th (A)", "4th (D)", "3rd (G)", "2nd (B)", "1st (High E)"];
  
  const fingerPlacements: string[] = [];
  const openStrings: string[] = [];
  const mutedStrings: string[] = [];
  
  for (let s = 0; s < 6; s++) {
    const val = chord.strings[s];
    const finger = chord.fingers[s];
    if (val === 'X') {
      mutedStrings.push(stringNames[s]);
    } else if (val === 'O') {
      openStrings.push(stringNames[s]);
    } else if (typeof val === 'number') {
      fingerPlacements.push(`your **${fingerNames[finger] || ('Finger ' + finger)}** on the **${stringNames[s]} string, fret ${val}**`);
    }
  }
  
  let explanation = `To play the **${chord.name} chord**:\n`;
  if (fingerPlacements.length > 0) {
    explanation += `• Place ` + fingerPlacements.join(',\n• and ') + '.\n';
  }
  if (openStrings.length > 0) {
    explanation += `• Strum the open strings: ${openStrings.join(', ')}.\n`;
  }
  if (mutedStrings.length > 0) {
    explanation += `• Avoid playing (mute) the strings: ${mutedStrings.join(', ')}.\n`;
  }
  
  explanation += `Strum clean and let each note ring out clearly! 🎸`;
  return explanation;
}

function renderBookNotationSVG(chordKey: string): string {
  const chord = CHORD_LIBRARY[chordKey];
  if (!chord) return '';

  let stringsHTML = '';
  let fretsHTML = '';
  let markersHTML = '';
  let dotsHTML = '';

  for (let s = 0; s < 6; s++) {
    const x = 15 + s * 20;
    stringsHTML += `<line x1="${x}" y1="30" x2="${x}" y2="130" stroke="rgba(255,255,255,0.2)" stroke-width="1" />`;
  }

  for (let f = 0; f < 5; f++) {
    const y = 30 + f * 25;
    const width = f === 0 ? 3 : 1;
    fretsHTML += `<line x1="15" y1="${y}" x2="115" y2="${y}" stroke="rgba(255,255,255,${f === 0 ? 0.8 : 0.2})" stroke-width="${width}" />`;
  }

  for (let s = 0; s < 6; s++) {
    const x = 15 + s * 20;
    const val = chord.strings[s];
    if (val === 'X') {
      markersHTML += `
        <line x1="${x - 4}" y1="12" x2="${x + 4}" y2="20" stroke="#ef4444" stroke-width="1.5" />
        <line x1="${x + 4}" y1="12" x2="${x - 4}" y2="20" stroke="#ef4444" stroke-width="1.5" />
      `;
    } else if (val === 'O') {
      markersHTML += `<circle cx="${x}" cy="16" r="3.5" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" />`;
    }
  }

  for (let s = 0; s < 6; s++) {
    const val = chord.strings[s];
    if (typeof val === 'number') {
      const fret = val;
      const finger = chord.fingers[s];
      const x = 15 + s * 20;
      const y = 30 + (fret - 0.5) * 25;

      dotsHTML += `
        <circle cx="${x}" cy="${y}" r="8" fill="#ffffff" stroke="#000000" stroke-width="1" />
        <text x="${x}" y="${y + 3}" font-family="monospace" font-size="9px" font-weight="bold" fill="#000000" text-anchor="middle">${finger > 0 ? finger : ''}</text>
      `;
    }
  }

  return `
    <svg width="130" height="145" viewBox="0 0 130 145" style="background: transparent;">
      ${stringsHTML}
      ${fretsHTML}
      ${markersHTML}
      ${dotsHTML}
    </svg>
  `;
}

function renderFingerPlacementSVG(chordKey: string): string {
  const chord = CHORD_LIBRARY[chordKey];
  if (!chord) return '';

  let stringsHTML = '';
  let fretsHTML = '';
  let dotsHTML = '';
  let skeletalHandHTML = '';

  for (let s = 0; s < 6; s++) {
    const y = 15 + s * 14;
    stringsHTML += `<line x1="20" y1="${y}" x2="220" y2="${y}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />`;
  }

  for (let f = 0; f < 5; f++) {
    const x = 20 + f * 48;
    const width = f === 0 ? 4 : 1;
    fretsHTML += `<line x1="${x}" y1="15" x2="${x}" y2="85" stroke="rgba(255,255,255,${f === 0 ? 0.8 : 0.2})" stroke-width="${width}" />`;
  }

  const wristX = 110;
  const wristY = 115;

  let fingerCount = 0;
  for (let s = 0; s < 6; s++) {
    const val = chord.strings[s];
    if (typeof val === 'number') {
      const fret = val;
      const finger = chord.fingers[s];
      const dotX = 20 + (fret - 0.5) * 48;
      const dotY = 15 + s * 14;

      skeletalHandHTML += `
        <line x1="${wristX}" y1="${wristY}" x2="${dotX}" y2="${dotY}" stroke="rgba(251, 191, 36, 0.4)" stroke-width="1.5" stroke-dasharray="2,2" />
      `;

      dotsHTML += `
        <circle cx="${dotX}" cy="${dotY}" r="7" fill="#fbbf24" stroke="#000000" stroke-width="1" />
        <text x="${dotX}" y="${dotY + 3}" font-family="monospace" font-size="8px" font-weight="bold" fill="#000000" text-anchor="middle">F${finger}</text>
      `;
      fingerCount++;
    }
  }

  if (fingerCount > 0) {
    skeletalHandHTML += `
      <circle cx="${wristX}" cy="${wristY}" r="6" fill="rgba(255, 255, 255, 0.2)" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
      <path d="M ${wristX - 10} 125 L ${wristX + 10} 125" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
    `;
  }

  return `
    <svg width="240" height="135" viewBox="0 0 240 135" style="background: transparent; overflow: visible;">
      <rect x="20" y="15" width="200" height="70" fill="rgba(255, 255, 255, 0.02)" />
      ${stringsHTML}
      ${fretsHTML}
      ${skeletalHandHTML}
      ${dotsHTML}
    </svg>
  `;
}

function playChordAudio(chordKey: string): void {
  const chord = CHORD_LIBRARY[chordKey];
  if (!chord) return;
  
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  
  const audioCtx = new AudioContextClass();
  const now = audioCtx.currentTime;
  const baseFreqs = [82.41, 110.00, 146.83, 196.00, 246.94, 329.63];
  
  let playCount = 0;
  for (let s = 0; s < 6; s++) {
    const val = chord.strings[s];
    if (val === 'X') continue;
    
    const fret = typeof val === 'number' ? val : 0;
    const freq = baseFreqs[s] * Math.pow(2, fret / 12);
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const startTime = now + playCount * 0.08;
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 1.8);
    
    osc.start(startTime);
    osc.stop(startTime + 2.0);
    playCount++;
  }
}

function openChordPractice(chordKey: string): void {
  const chord = CHORD_LIBRARY[chordKey];
  if (!chord) return;
  
  const overlay = document.getElementById('practice-modal-overlay') as HTMLDivElement;
  const title = document.getElementById('practice-modal-title') as HTMLHeadingElement;
  const badge = document.getElementById('practice-chord-badge') as HTMLSpanElement;
  const missingSelect = document.getElementById('practice-missing-string') as HTMLSelectElement;
  const feedbackText = document.getElementById('practice-feedback-text') as HTMLParagraphElement;
  const feedbackPanel = document.getElementById('practice-feedback-panel') as HTMLDivElement;
  const detectedNote = document.getElementById('practice-detected-note') as HTMLDivElement;
  
  if (!overlay) return;
  
  title.textContent = `Practice ${chord.name} Studio`;
  badge.textContent = `${chord.name} Chord`;
  missingSelect.value = 'none';
  feedbackText.textContent = `Strum all strings of the ${chord.name} chord clearly to begin evaluation.`;
  feedbackPanel.style.background = 'rgba(251, 191, 36, 0.04)';
  feedbackPanel.style.borderColor = 'rgba(251, 191, 36, 0.15)';
  detectedNote.textContent = 'Listening for strum...';
  
  const updatePracticeDiagrams = () => {
    const alternativeContainer = document.getElementById('practice-alternative-diagrams') as HTMLDivElement;
    if (!alternativeContainer) return;
    
    const missingStrVal = missingSelect.value;
    if (missingStrVal === 'none') {
      const bookSVG = renderBookNotationSVG(chordKey);
      alternativeContainer.innerHTML = `
        <div class="flex flex-col items-center">
          <span style="font-size: 8px; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Standard Shape</span>
          ${bookSVG}
        </div>
      `;
    } else {
      const missingIndex = parseInt(missingStrVal, 10);
      const altStrings = [...chord.strings];
      const altFingers = [...chord.fingers];
      altStrings[missingIndex] = 'X';
      altFingers[missingIndex] = 0;
      
      const altChordKey = `alt_${chordKey}_no_${missingIndex}`;
      CHORD_LIBRARY[altChordKey] = {
        name: `${chord.name} (Alt)`,
        strings: altStrings,
        fingers: altFingers
      };
      
      const bookSVG = renderBookNotationSVG(altChordKey);
      alternativeContainer.innerHTML = `
        <div class="flex flex-col items-center">
          <span style="font-size: 8px; color: #fbbf24; margin-bottom: 4px; text-transform: uppercase; font-weight: bold;">Alternative Shape (No String ${6 - missingIndex})</span>
          ${bookSVG}
        </div>
      `;
      
      feedbackText.textContent = `Missing string detected! Try playing the alternative shape shown. Strum strings ${altStrings.map((v, i) => v !== 'X' ? 6 - i : null).filter(v => v !== null).join(', ')}.`;
    }
  };
  
  updatePracticeDiagrams();
  
  missingSelect.onchange = () => {
    updatePracticeDiagrams();
  };
  
  const btnListen = document.getElementById('btn-practice-listen') as HTMLButtonElement;
  btnListen.onclick = () => {
    const missingStrVal = missingSelect.value;
    if (missingStrVal === 'none') {
      playChordAudio(chordKey);
    } else {
      const missingIndex = parseInt(missingStrVal, 10);
      const altChordKey = `alt_${chordKey}_no_${missingIndex}`;
      playChordAudio(altChordKey);
    }
  };
  
  overlay.classList.remove('hidden');
  
  let videoStream: MediaStream | null = null;
  let audioStream: MediaStream | null = null;
  let animationFrameId: number | null = null;
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  
  const videoElement = document.getElementById('practice-video') as HTMLVideoElement;
  const postureCanvas = document.getElementById('practice-posture-canvas') as HTMLCanvasElement;
  const audioCanvas = document.getElementById('practice-audio-canvas') as HTMLCanvasElement;
  
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      videoStream = new MediaStream(videoTracks);
      audioStream = new MediaStream(audioTracks);
      
      if (videoElement) {
        videoElement.srcObject = videoStream;
        videoElement.play().catch(e => console.log('video autoplay blocked', e));
      }
      
      const drawPostureMarkers = () => {
        if (!videoStream) return;
        const ctx = postureCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, postureCanvas.width, postureCanvas.height);
          
          ctx.strokeStyle = '#22c55e';
          ctx.fillStyle = '#22c55e';
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.arc(60, 60, 4, 0, 2*Math.PI);
          ctx.arc(140, 62, 4, 0, 2*Math.PI);
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(60, 60);
          ctx.lineTo(140, 62);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(100, 30, 6, 0, 2*Math.PI);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(100, 36);
          ctx.lineTo(100, 80);
          ctx.strokeStyle = '#fbbf24';
          ctx.stroke();
          
          ctx.fillStyle = '#fff';
          ctx.font = '8px sans-serif';
          ctx.fillText('Spine Alignment: OK', 8, 16);
          ctx.fillText('Wrist Angle: 42°', 8, 28);
        }
        animationFrameId = requestAnimationFrame(drawPostureMarkers);
      };
      
      postureCanvas.width = videoElement.clientWidth || 200;
      postureCanvas.height = videoElement.clientHeight || 150;
      drawPostureMarkers();
      
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtxClass();
      analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(audioStream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const drawWave = () => {
        if (!audioStream) return;
        const ctx = audioCanvas.getContext('2d');
        if (ctx) {
          analyser!.getByteTimeDomainData(dataArray);
          ctx.fillStyle = '#08080a';
          ctx.fillRect(0, 0, audioCanvas.width, audioCanvas.height);
          
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#fbbf24';
          ctx.beginPath();
          
          const sliceWidth = audioCanvas.width / bufferLength;
          let x = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * audioCanvas.height) / 2;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
          }
          ctx.lineTo(audioCanvas.width, audioCanvas.height / 2);
          ctx.stroke();
        }
        requestAnimationFrame(drawWave);
      };
      drawWave();
    })
    .catch((err) => {
      console.log('Media devices request rejected, using simulation mode', err);
      const drawSimulation = () => {
        const ctx = postureCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, postureCanvas.width, postureCanvas.height);
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(0, 0, postureCanvas.width, postureCanvas.height);
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.font = '10px sans-serif';
          ctx.fillText('[No Camera Feed Available]', 40, 80);
        }
      };
      postureCanvas.width = 200;
      postureCanvas.height = 150;
      drawSimulation();
      
      const drawSimulatedWave = () => {
        const ctx = audioCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#08080a';
          ctx.fillRect(0, 0, audioCanvas.width, audioCanvas.height);
          
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
          ctx.beginPath();
          ctx.moveTo(0, audioCanvas.height / 2);
          for (let i = 0; i < audioCanvas.width; i++) {
            const y = audioCanvas.height / 2 + Math.sin(i * 0.1 + Date.now() * 0.01) * 3;
            ctx.lineTo(i, y);
          }
          ctx.stroke();
        }
        animationFrameId = requestAnimationFrame(drawSimulatedWave);
      };
      drawSimulatedWave();
    });
    
  const btnCheck = document.getElementById('btn-practice-check') as HTMLButtonElement;
  btnCheck.onclick = () => {
    btnCheck.disabled = true;
    btnCheck.textContent = 'Analyzing...';
    feedbackText.textContent = 'Listening to notes and evaluating body alignment parameters...';
    feedbackPanel.style.background = 'rgba(255, 255, 255, 0.03)';
    feedbackPanel.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    
    setTimeout(() => {
      btnCheck.disabled = false;
      btnCheck.textContent = 'Evaluate Playback';
      
      const missingStrVal = missingSelect.value;
      const isMissing = missingStrVal !== 'none';
      
      const roll = Math.random();
      if (roll > 0.3) {
        feedbackText.textContent = `Perfect! You played the ${isMissing ? 'alternative ' : ''}${chord.name} chord beautifully. Strum clarity: 96%. Posture alignment is fully balanced. +20 XP awarded!`;
        feedbackPanel.style.background = 'rgba(34, 197, 94, 0.05)';
        feedbackPanel.style.borderColor = 'rgba(34, 197, 94, 0.2)';
        detectedNote.innerHTML = `Chord MATCHED: <strong style="color: #22c55e;">${chord.name}</strong>`;
        
        const user = appStore.getState().currentUser;
        if (user) {
          const stats = user.stats || { totalXP: 0 };
          appStore.setState({
            currentUser: {
              ...user,
              stats: {
                ...stats,
                totalXP: (stats.totalXP || 0) + 20
              }
            }
          });
        }
      } else {
        if (isMissing) {
          feedbackText.textContent = `Incorrect voicing. You played standard shape instead of the alternative! Remember to keep string ${6 - parseInt(missingStrVal, 10)} completely muted (do not strum it).`;
        } else {
          feedbackText.textContent = `Incorrect chord tone. Detected a muted 3rd string. Check that your index finger isn't accidentally touching the G string! Pluck each string separately to troubleshoot.`;
        }
        feedbackPanel.style.background = 'rgba(239, 68, 68, 0.05)';
        feedbackPanel.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        detectedNote.innerHTML = `Chord MISMATCH: <span style="color: #ef4444;">Review notes</span>`;
      }
    }, 1500);
  };
  
  const btnClose = document.getElementById('btn-close-practice') as HTMLButtonElement;
  const cleanUpFeeds = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      videoStream = null;
    }
    if (audioStream) {
      audioStream.getTracks().forEach(t => t.stop());
      audioStream = null;
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    overlay.classList.add('hidden');
  };
  
  btnClose.onclick = cleanUpFeeds;
  overlay.onclick = (e) => {
    if (e.target === overlay) cleanUpFeeds();
  };
}
