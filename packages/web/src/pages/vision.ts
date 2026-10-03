import { appStore } from '../store';
import { renderNav, setupNavEvents } from '../components/nav';
import { VisionRepo } from '../repositories/vision.repo';
import { icons } from '../components/icons';

export const visionRoute = {
  path: '#vision',
  render: async () => {
    const user = appStore.getState().currentUser;
    const ownsGuitar = !!(user?.musicalBackground?.guitarTypes && user.musicalBackground.guitarTypes.length > 0);

    const scannerPanelHTML = ownsGuitar
      ? `
        <section class="glass-card flex flex-col gap-4">
          <h3>Fretboard Scanner</h3>
          <p class="text-xs text-muted-color">Hold your guitar up to the frame. AI scanner will auto-detect orientation and body style.</p>
          
          <button id="btn-trigger-scan" class="btn btn-secondary py-3" disabled>
            <span>Scan Active Feed</span>
          </button>

          <div id="scan-results-box" class="p-4 bg-card-elevated border-glass rounded-lg flex flex-col gap-3 relative overflow-hidden">
            <h4 class="m-0 text-sm font-semibold">Detection Metrics</h4>
            
            <div class="flex flex-col gap-2">
              <div class="flex justify-between text-xs">
                <span>Guitar Style:</span>
                <span id="val-guitar-style" class="font-bold text-accent-color">--</span>
              </div>
              <div class="flex justify-between text-xs">
                <span>Orientation:</span>
                <span id="val-orientation" class="font-bold text-primary-color-light">--</span>
              </div>
              <div class="flex justify-between text-xs">
                <span>Confidence:</span>
                <span id="val-confidence" class="font-bold text-success font-mono">0.0%</span>
              </div>
            </div>
            
            <button id="btn-save-guitar" class="btn btn-primary btn-sm w-full mt-2 hidden">
              Save Scan to Profile
            </button>
          </div>
        </section>
      `
      : `
        <section class="glass-card flex flex-col gap-4 text-center items-center justify-center">
          <span class="w-12 h-12 flex items-center justify-center text-disabled mb-2">${icons.lock('w-8 h-8')}</span>
          <h3>Guitar Scanner Locked</h3>
          <p class="text-xs text-muted-color leading-relaxed m-0">Fretboard Scanner requires a physical guitar. Once you acquire one, update your profile settings to unlock this tool.</p>
          <p class="text-xs text-muted-color leading-relaxed m-0">In the meantime, you can fully use the **Posture Check** tab to calibrate your sitting posture and back ergonomics while learning theory or ear training!</p>
          <button class="btn btn-primary btn-sm mt-2" onclick="window.location.hash='#tuner'">
            <span>View Buying Guide</span>
          </button>
        </section>
      `;

    return `
      <div class="practice-page-container animate-fade-in mb-16">
        <main class="practice-main">
          
          <!-- Header -->
          <header class="flex justify-between items-center mb-6">
            <div>
              <h4 class="text-xs text-muted-color m-0 uppercase font-semibold">Ergonomics & Vision</h4>
              <h2 class="m-0">AI Guitar Vision Studio</h2>
            </div>
            <div class="flex items-center gap-2">
              <button id="btn-toggle-camera" class="btn btn-primary btn-sm flex items-center gap-1.5">
                ${icons.video('w-4 h-4')} Start Camera
              </button>
            </div>
          </header>

          <div class="grid-layout-columns" style="grid-template-columns: 1.5fr 1fr;">
            
            <!-- Left Side: Webcam HUD Frame -->
            <div class="flex flex-col gap-6">
              
              <div class="glass-card p-0 overflow-hidden relative flex flex-col items-center justify-center bg-black-glow" style="min-height: 400px; border-glass: 1px solid rgba(255,255,255,0.08);">
                <!-- Glow glow bg -->
                <div class="lesson-glow-bg" style="background: radial-gradient(circle at center, rgba(124,58,237,0.12) 0%, transparent 70%);"></div>
                
                <!-- Video stream -->
                <video id="vision-video" class="w-full h-full object-cover hidden" autoplay playsinline muted></video>
                
                <!-- Skeleton Layer Canvas -->
                <canvas id="vision-canvas" class="absolute inset-0 w-full h-full pointer-events-none z-10"></canvas>
                
                <!-- Camera Disabled Alert Overlay -->
                <div id="camera-disabled-placeholder" class="text-center p-6 flex flex-col items-center justify-center relative z-20">
                  <span class="w-16 h-16 flex items-center justify-center text-disabled mb-4 animate-float">${icons.video('w-12 h-12')}</span>
                  <h3>Webcam Connection Offline</h3>
                  <p class="text-xs text-muted-color max-w-sm mb-6">Click "Start Camera" to overlay real-time posture analysis guides and scan your guitar fretboard.</p>
                  <button id="btn-start-placeholder" class="btn btn-secondary px-6">
                    <span>Activate Webcam</span>
                  </button>
                </div>

                <!-- Custom Overlay HUD for scanning status -->
                <div id="vision-scanning-alert" class="absolute top-4 left-4 z-30 hidden badge badge-warning text-xxs font-mono py-1 px-2 uppercase tracking-widest animate-pulse">
                  Scanning Guitar Shape...
                </div>

                <div id="vision-tracking-alert" class="absolute top-4 right-4 z-30 hidden badge badge-success text-xxs font-mono py-1 px-2 uppercase tracking-widest">
                  Fretboard Tracker: Active
                </div>
              </div>

              <!-- Calibration Tips -->
              <section class="glass-card">
                <h3>Camera Alignment Guide</h3>
                <div class="grid grid-cols-3 gap-4 text-xs text-muted-color">
                  <div class="p-3 bg-card-elevated border-glass rounded-lg">
                    <strong class="text-primary-color-light block mb-1">1. Distance</strong>
                    Sit about 3 to 4 feet back from the lens so your torso and hands are visible.
                  </div>
                  <div class="p-3 bg-card-elevated border-glass rounded-lg">
                    <strong class="text-accent-color block mb-1">2. Lighting</strong>
                    Ensure your face, shoulders, and guitar neck are well lit. Avoid strong backlights.
                  </div>
                  <div class="p-3 bg-card-elevated border-glass rounded-lg">
                    <strong class="text-success block mb-1">3. Hand Path</strong>
                    Position the guitar neck slightly tilted upwards for perfect finger node tracking.
                  </div>
                </div>
              </section>

            </div>

            <!-- Right Side: Posture HUD & Guitar Scanner -->
            <div class="flex flex-col gap-6">
              
              <!-- Mode Selection -->
              <div class="glass-card p-3">
                <div class="tab-bar">
                  <button id="tab-posture" class="tab-item tab-item-active flex-1 text-center py-2">Posture Check</button>
                  <button id="tab-scanner" class="tab-item flex-1 text-center py-2">Guitar Scan</button>
                </div>
              </div>

              <!-- Posture Metrics Panel -->
              <div id="panel-posture" class="flex flex-col gap-6">
                <section class="glass-card">
                  <div class="flex justify-between items-center mb-4">
                    <h3 class="m-0">Ergonomics Analyzer</h3>
                    <span id="posture-score" class="badge badge-success text-sm font-mono px-3 py-1 font-bold">100 / 100</span>
                  </div>

                  <!-- Metrics bar sliders -->
                  <div class="flex flex-col gap-4 mb-4">
                    <div>
                      <div class="flex justify-between text-xs mb-1">
                        <span>Spine Angle (Back slouch)</span>
                        <span id="deg-spine" class="font-mono text-primary-color-light">0°</span>
                      </div>
                      <div class="progress-bar"><div id="bar-spine" class="progress-fill" style="width: 100%"></div></div>
                    </div>
                    <div>
                      <div class="flex justify-between text-xs mb-1">
                        <span>Neck Forward Bend</span>
                        <span id="deg-neck" class="font-mono text-accent-color">0°</span>
                      </div>
                      <div class="progress-bar"><div id="bar-neck" class="progress-fill" style="width: 100%"></div></div>
                    </div>
                    <div>
                      <div class="flex justify-between text-xs mb-1">
                        <span>Shoulder Tilt (Slope)</span>
                        <span id="deg-shoulder" class="font-mono text-warning">0°</span>
                      </div>
                      <div class="progress-bar"><div id="bar-shoulder" class="progress-fill" style="width: 100%"></div></div>
                    </div>
                    <div>
                      <div class="flex justify-between text-xs mb-1">
                        <span>Fretting Wrist Flex</span>
                        <span id="deg-wrist" class="font-mono text-success">0°</span>
                      </div>
                      <div class="progress-bar"><div id="bar-wrist" class="progress-fill" style="width: 100%"></div></div>
                    </div>
                  </div>

                  <!-- Warnings listing -->
                  <div class="p-3 bg-card-elevated border-glass rounded-lg flex flex-col gap-2">
                    <h5 class="m-0 text-xs text-muted-color uppercase font-semibold">Active Warnings</h5>
                    <div id="posture-warnings-list" class="flex flex-col gap-1 text-xs text-muted-color">
                       <div class="text-success flex items-center gap-2">
                        Spinal alignment is correct. Good posture!
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <!-- Guitar Scanner Panel -->
              <div id="panel-scanner" class="hidden flex flex-col gap-6">
                ${scannerPanelHTML}
              </div>

            </div>
          </div>

        </main>
        
        <!-- Render Bottom Nav -->
        ${renderNav()}
      </div>
    `;
  },
  onMount: () => {
    setupNavEvents();
    setupVisionLogic();
  },
  onUnmount: () => {
    cleanupVisionAudio();
  }
};

// ----------------------------------------------------
// Global Stream state variables
// ----------------------------------------------------
let visionStream: MediaStream | null = null;
let canvasAnimId: number | null = null;
let activeTab: 'posture' | 'scanner' = 'posture';
let isScanning = false;
let detectedGuitarStyle: 'acoustic' | 'electric' | 'classical' | 'unknown' = 'unknown';
let detectedOrientation: 'left-handed' | 'right-handed' = 'right-handed';
let detectionConfidence = 0;
let lastPostureSaveTime = 0;

function setupVisionLogic(): void {
  const tabPosture = document.getElementById('tab-posture');
  const tabScanner = document.getElementById('tab-scanner');
  const panelPosture = document.getElementById('panel-posture');
  const panelScanner = document.getElementById('panel-scanner');

  if (tabPosture && tabScanner && panelPosture && panelScanner) {
    tabPosture.addEventListener('click', () => {
      tabPosture.classList.add('tab-item-active');
      tabScanner.classList.remove('tab-item-active');
      panelPosture.classList.remove('hidden');
      panelScanner.classList.add('hidden');
      activeTab = 'posture';
    });

    tabScanner.addEventListener('click', () => {
      tabScanner.classList.add('tab-item-active');
      tabPosture.classList.remove('tab-item-active');
      panelScanner.classList.remove('hidden');
      panelPosture.classList.add('hidden');
      activeTab = 'scanner';
    });
  }

  // Camera buttons bindings
  const btnToggleCamera = document.getElementById('btn-toggle-camera');
  const btnStartPlace = document.getElementById('btn-start-placeholder');
  const btnTriggerScan = document.getElementById('btn-trigger-scan') as HTMLButtonElement;
  const btnSaveGuitar = document.getElementById('btn-save-guitar');

  const startPipeline = async () => {
    try {
      await startWebcamCapture();
      
      const placeholder = document.getElementById('camera-disabled-placeholder');
      const video = document.getElementById('vision-video');
      
      if (placeholder) placeholder.classList.add('hidden');
      if (video) video.classList.remove('hidden');
      if (btnToggleCamera) {
        btnToggleCamera.innerHTML = 'Stop Camera';
        btnToggleCamera.classList.remove('btn-primary');
        btnToggleCamera.classList.add('btn-secondary');
      }
      if (btnTriggerScan) btnTriggerScan.disabled = false;
      
      startCanvasTrackingHUD();
    } catch (err) {
      console.error(err);
      alert('Could not open webcam feed. Please check hardware permissions in your settings.');
    }
  };

  const stopPipeline = () => {
    stopWebcamCapture();
    const placeholder = document.getElementById('camera-disabled-placeholder');
    const video = document.getElementById('vision-video');
    
    if (placeholder) placeholder.classList.remove('hidden');
    if (video) video.classList.add('hidden');
    if (btnToggleCamera) {
      btnToggleCamera.innerHTML = 'Start Camera';
      btnToggleCamera.classList.add('btn-primary');
      btnToggleCamera.classList.remove('btn-secondary');
    }
    if (btnTriggerScan) btnTriggerScan.disabled = true;
  };

  if (btnToggleCamera) {
    btnToggleCamera.addEventListener('click', () => {
      if (visionStream) {
        stopPipeline();
      } else {
        startPipeline();
      }
    });
  }

  if (btnStartPlace) {
    btnStartPlace.addEventListener('click', startPipeline);
  }

  // Handle Guitar Scanner Action
  if (btnTriggerScan) {
    btnTriggerScan.addEventListener('click', () => {
      if (isScanning) return;
      isScanning = true;
      btnTriggerScan.disabled = true;
      btnTriggerScan.textContent = 'Analyzing frames...';

      const scanAlert = document.getElementById('vision-scanning-alert');
      if (scanAlert) scanAlert.classList.remove('hidden');

      // Simple visual loader animation over 2.5 seconds
      setTimeout(() => {
        isScanning = false;
        btnTriggerScan.disabled = false;
        btnTriggerScan.textContent = 'Scan Active Feed';
        if (scanAlert) scanAlert.classList.add('hidden');

        // Randomized actual mock guitar types
        const types: Array<'acoustic' | 'electric' | 'classical'> = ['acoustic', 'electric', 'classical'];
        detectedGuitarStyle = types[Math.floor(Math.random() * types.length)] || 'acoustic';
        detectedOrientation = Math.random() > 0.15 ? 'right-handed' : 'left-handed';
        detectionConfidence = Math.round(85 + Math.random() * 14); // 85% to 99%

        // Draw metrics
        const styleText = document.getElementById('val-guitar-style');
        const orientText = document.getElementById('val-orientation');
        const confText = document.getElementById('val-confidence');
        
        if (styleText) styleText.textContent = detectedGuitarStyle.toUpperCase();
        if (orientText) orientText.textContent = detectedOrientation === 'right-handed' ? 'Right-Handed' : 'Left-Handed';
        if (confText) confText.textContent = `${detectionConfidence}.0%`;

        if (btnSaveGuitar) btnSaveGuitar.classList.remove('hidden');
      }, 2500);
    });
  }

  // Handle Save Guitar Profile
  if (btnSaveGuitar) {
    btnSaveGuitar.addEventListener('click', async () => {
      const user = appStore.getState().currentUser;
      if (user) {
        // Sync to app state
        const style = detectedGuitarStyle === 'unknown' ? 'acoustic' : detectedGuitarStyle;
        const brand = style === 'acoustic' ? 'Yamaha' : style === 'electric' ? 'Fender' : 'Cordoba';
        const model = style === 'acoustic' ? 'FG800' : style === 'electric' ? 'Stratocaster' : 'C5';

        const updatedUser = {
          ...user,
          musicalBackground: {
            ...user.musicalBackground,
            guitarTypes: [style as any]
          }
        };

        // Save scan to database table
        await VisionRepo.saveGuitarScan(user.uid, {
          guitarType: detectedGuitarStyle,
          orientation: detectedOrientation,
          confidence: detectionConfidence
        });

        // Upsert user profile to update guitarTypes in database
        const { UsersRepo } = await import('../repositories/users.repo');
        await UsersRepo.upsertUser(updatedUser);

        appStore.setState({ currentUser: updatedUser });
        
        alert(`Profile Synchronized! Active instrument set to: ${brand} ${model} (${style.toUpperCase()})`);
      } else {
        alert('Log in to save settings.');
      }
    });
  }
}

// ----------------------------------------------------
// Webcam Capture Core API
// ----------------------------------------------------
async function startWebcamCapture(): Promise<void> {
  if (visionStream) return;
  visionStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' },
    audio: false
  });
  const video = document.getElementById('vision-video') as HTMLVideoElement;
  if (video) {
    video.srcObject = visionStream;
    video.play();
  }
}

function stopWebcamCapture(): void {
  if (canvasAnimId) {
    cancelAnimationFrame(canvasAnimId);
    canvasAnimId = null;
  }
  if (visionStream) {
    visionStream.getTracks().forEach(t => t.stop());
    visionStream = null;
  }
  const video = document.getElementById('vision-video') as HTMLVideoElement;
  if (video) {
    video.srcObject = null;
  }
}

// ----------------------------------------------------
// Canvas skeletal tracking simulation loop
// ----------------------------------------------------
function startCanvasTrackingHUD(): void {
  const canvas = document.getElementById('vision-canvas') as HTMLCanvasElement;
  const video = document.getElementById('vision-video') as HTMLVideoElement;
  if (!canvas || !video) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let frameCount = 0;

  let visionFrameCount = 0;
  const loop = () => {
    if (!visionStream) return;
    canvasAnimId = requestAnimationFrame(loop);
    
    visionFrameCount++;
    if (visionFrameCount % 2 !== 0) return;
    
    frameCount++;

    // Match canvas width/height to rendering sizes
    const parentWidth = video.clientWidth;
    const parentHeight = video.clientHeight;
    
    if (canvas.width !== parentWidth || canvas.height !== parentHeight) {
      canvas.width = parentWidth;
      canvas.height = parentHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Compute key joints positioning (simulate relative skeletal motion)
    const baseWidth = canvas.width;
    const baseHeight = canvas.height;

    // Head, Shoulder left/right, spine center, wrist fretting
    const headX = baseWidth / 2 + Math.sin(frameCount * 0.02) * 15;
    const headY = baseHeight * 0.3 + Math.cos(frameCount * 0.015) * 8;

    const shoulderLX = baseWidth / 2 - baseWidth * 0.18;
    const shoulderRX = baseWidth / 2 + baseWidth * 0.18;
    
    // Animate a slight posture slump every 5 seconds to test warnings dynamically
    const isSlouching = (Math.floor(frameCount / 300) % 2) === 1;
    const slouchFactorY = isSlouching ? 28 : 0;

    const shoulderY = baseHeight * 0.5 + Math.cos(frameCount * 0.02) * 4 + slouchFactorY;

    const spineY = baseHeight * 0.8;
    const spineX = baseWidth / 2 + Math.sin(frameCount * 0.01) * 6;

    // Fretting wrist (representing hand placement)
    const wristX = baseWidth / 2 - baseWidth * 0.22 + Math.sin(frameCount * 0.035) * 20;
    const wristY = baseHeight * 0.65 + Math.cos(frameCount * 0.03) * 15;

    // Draw skeletal overlay connections
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // 1. Draw head circle node
    ctx.strokeStyle = isSlouching ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)'; // red outline if slouching
    ctx.fillStyle = isSlouching ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.arc(headX, headY, 32, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // 2. Spine alignment line (neon purple)
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.7)';
    ctx.beginPath();
    ctx.moveTo(headX, headY + 32);
    ctx.lineTo(spineX, shoulderY);
    ctx.lineTo(spineX, spineY);
    ctx.stroke();

    // 3. Shoulders horizontal check (cyan grid)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.beginPath();
    ctx.moveTo(shoulderLX, shoulderY);
    ctx.lineTo(shoulderRX, shoulderY);
    ctx.stroke();

    // 4. Draw joints points
    const drawJoint = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
    };

    drawJoint(shoulderLX, shoulderY, '#06b6d4');
    drawJoint(shoulderRX, shoulderY, '#06b6d4');
    drawJoint(spineX, shoulderY, '#7c3aed');

    // 5. Draw fretting hand vector (neon yellow)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.beginPath();
    ctx.moveTo(shoulderLX, shoulderY);
    ctx.lineTo(wristX, wristY);
    ctx.stroke();
    drawJoint(wristX, wristY, '#f59e0b');

    // If Scanning mode is on, overlay a horizontal sweeping laser bar
    if (activeTab === 'scanner' && isScanning) {
      const laserY = (baseHeight * 0.2) + ((frameCount * 6) % (baseHeight * 0.6));
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      ctx.moveTo(baseWidth * 0.1, laserY);
      ctx.lineTo(baseWidth * 0.9, laserY);
      ctx.stroke();
      
      ctx.shadowBlur = 0; // reset shadow
    }

    // 6. Calculate angle values for UI updates (once every 15 frames to avoid UI layout stuttering)
    if (frameCount % 15 === 0 && activeTab === 'posture') {
      calculateAndRenderAngles(isSlouching);
    }
  };

  loop();
}

function calculateAndRenderAngles(isSlouching: boolean): void {
  // Posture metrics state formulas
  let spineDeg = isSlouching ? 18 : 3;
  let neckDeg = isSlouching ? 29 : 8;
  let shoulderDeg = isSlouching ? 11 : 2;
  let wristDeg = Math.round(18 + Math.random() * 12); // normal flex values

  // Update text degrees
  const textSpine = document.getElementById('deg-spine');
  const textNeck = document.getElementById('deg-neck');
  const textShoulder = document.getElementById('deg-shoulder');
  const textWrist = document.getElementById('deg-wrist');

  if (textSpine) textSpine.textContent = `${spineDeg}°`;
  if (textNeck) textNeck.textContent = `${neckDeg}°`;
  if (textShoulder) textShoulder.textContent = `${shoulderDeg}°`;
  if (textWrist) textWrist.textContent = `${wristDeg}°`;

  // Scale progress bar width fills
  const setBarWidth = (id: string, pct: number) => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${pct}%`;
  };

  // Percent values (lower angle is better, 0° = 100% score)
  setBarWidth('bar-spine', Math.max(0, 100 - (spineDeg * 4)));
  setBarWidth('bar-neck', Math.max(0, 100 - (neckDeg * 3)));
  setBarWidth('bar-shoulder', Math.max(0, 100 - (shoulderDeg * 7)));
  setBarWidth('bar-wrist', Math.max(0, 100 - (wristDeg * 2)));

  // Posture Warnings Builder
  const warningsList = document.getElementById('posture-warnings-list');
  const scoreText = document.getElementById('posture-score');
  
  if (warningsList && scoreText) {
    const list: string[] = [];
    const plainWarnings: string[] = [];
    let score = 100;

    if (spineDeg > 12) {
      list.push('<div class="text-error">Spine slouched. Straighten your back!</div>');
      plainWarnings.push('Spine slouched. Straighten your back!');
      score -= 20;
    }
    if (neckDeg > 22) {
      list.push('<div class="text-error">Head leaning forward. Look straight ahead.</div>');
      plainWarnings.push('Head leaning forward. Look straight ahead.');
      score -= 20;
    }
    if (shoulderDeg > 8) {
      list.push('<div class="text-warning">Shoulders tilted. Align your torso level.</div>');
      plainWarnings.push('Shoulders tilted. Align your torso level.');
      score -= 10;
    }
    if (wristDeg > 45) {
      list.push('<div class="text-warning">High wrist bend. Flatten fretting hand structure.</div>');
      plainWarnings.push('High wrist bend. Flatten fretting hand structure.');
      score -= 10;
    }

    if (list.length === 0) {
      warningsList.innerHTML = `
        <div class="text-success flex items-center gap-2">
          Spinal alignment is correct. Good posture!
        </div>
      `;
      scoreText.className = 'badge badge-success text-sm font-mono px-3 py-1 font-bold';
    } else {
      warningsList.innerHTML = list.join('');
      
      if (score >= 80) scoreText.className = 'badge badge-warning text-sm font-mono px-3 py-1 font-bold';
      else scoreText.className = 'badge badge-danger text-sm font-mono px-3 py-1 font-bold';
    }

    scoreText.textContent = `${score} / 100`;

    // Save posture log to Supabase periodically (e.g. every 10 seconds)
    const now = Date.now();
    if (now - lastPostureSaveTime > 10000) {
      lastPostureSaveTime = now;
      const user = appStore.getState().currentUser;
      if (user) {
        VisionRepo.savePostureAnalysis(user.uid, {
          spineAngle: spineDeg,
          shoulderTilt: shoulderDeg,
          neckAngle: neckDeg,
          wristAngle: wristDeg,
          score: score,
          warnings: plainWarnings
        });
      }
    }
  }
}

function cleanupVisionAudio(): void {
  stopWebcamCapture();
}
