/**
 * MediaPipe On-Device Image Classifier
 * ======================================
 * Client-side photo pre-classification using Google MediaPipe Image Classification task.
 * Runs entirely in the browser — no server round-trip needed.
 *
 * PURPOSE:
 *   Before a citizen uploads a photo, MediaPipe classifies it on-device and returns
 *   a suggested civic category. This is sent as a hint to the backend, which can
 *   use it to improve accuracy or skip redundant Gemini Vision calls.
 *
 * ARCHITECTURE (pitch-ready, graceful degradation):
 *   Photo selected → MediaPipe classifies in browser → Category hint sent with form
 *   If MediaPipe fails or is unavailable → form submits normally, Gemini Vision handles it
 *
 * USAGE:
 *   import { classifyImageOnDevice, MEDIAPIPE_READY } from './mediapipeClassifier';
 *
 *   const result = await classifyImageOnDevice(file);
 *   if (result) {
 *     console.log(result.category);   // "Roads"
 *     console.log(result.confidence); // 0.87
 *     console.log(result.label);      // "pothole"
 *   }
 */

// ── MediaPipe category keyword mappings ───────────────────────────────────────
// Maps common ImageNet/COCO labels to Civic Pulse categories
const LABEL_CATEGORY_MAP: Record<string, string> = {
  // Roads
  pothole: 'Roads', road: 'Roads', pavement: 'Roads', asphalt: 'Roads',
  highway: 'Roads', bridge: 'Roads', traffic: 'Roads', vehicle: 'Roads',
  // Water
  flood: 'Water', puddle: 'Water', pipe: 'Water', drain: 'Water',
  sewage: 'Water', overflow: 'Water', water: 'Water',
  // Sanitation
  garbage: 'Sanitation', trash: 'Sanitation', waste: 'Sanitation',
  dump: 'Sanitation', litter: 'Sanitation', refuse: 'Sanitation',
  // Electricity
  wire: 'Electricity', cable: 'Electricity', pole: 'Electricity',
  transformer: 'Electricity', lamp: 'Electricity', streetlight: 'Electricity',
  // Health
  smoke: 'Health', fire: 'Health', pollution: 'Health', hospital: 'Health',
  // Safety
  fence: 'Safety', wall: 'Safety', construction: 'Safety',
  // Public Spaces
  park: 'Public Spaces', garden: 'Public Spaces', playground: 'Public Spaces',
  // Education
  school: 'Education', building: 'Education', classroom: 'Education',
};

export interface MediaPipeResult {
  category: string;       // Civic Pulse category
  label: string;          // Raw MediaPipe label
  confidence: number;     // 0.0 – 1.0
  source: 'mediapipe';    // Tagged for backend to understand source
}

// ── Global state ──────────────────────────────────────────────────────────────
let _classifier: any = null;
let _initAttempted = false;

/**
 * Whether MediaPipe is available in the current browser environment.
 * Always safe to check — never throws.
 */
export function isMediaPipeAvailable(): boolean {
  return typeof window !== 'undefined' && _classifier !== null;
}

/**
 * Lazily initialise MediaPipe Image Classification task.
 * Loads the WASM bundle from CDN on first call.
 * Safe to call multiple times — only initialises once.
 */
async function initMediaPipe(): Promise<boolean> {
  if (_initAttempted) return _classifier !== null;
  _initAttempted = true;

  try {
    // Dynamic import — only loads if MediaPipe CDN is reachable. A non-literal
    // specifier keeps tsc from resolving it; @vite-ignore keeps Vite from bundling.
    const visionUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm';
    const vision = await import(/* @vite-ignore */ visionUrl);

    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
    );

    _classifier = await vision.ImageClassifier.createFromOptions(filesetResolver, {
      baseOptions: {
        // EfficientNet Lite 4 — optimised for mobile/browser
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite4/float32/1/efficientnet_lite4.tflite',
        delegate: 'GPU',
      },
      maxResults: 5,
      scoreThreshold: 0.3,
      runningMode: 'IMAGE',
    });

    console.info('[MediaPipe] Image classifier initialised (EfficientNet Lite 4)');
    return true;
  } catch (err) {
    // Fail silently — Gemini Vision handles classification server-side
    console.warn('[MediaPipe] Initialisation failed (non-critical):', err);
    _classifier = null;
    return false;
  }
}

/**
 * Map a raw ImageNet/COCO label to a Civic Pulse category.
 */
function mapLabelToCategory(label: string): string {
  const lower = label.toLowerCase().replace(/_/g, ' ');
  for (const [keyword, category] of Object.entries(LABEL_CATEGORY_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  return 'General';
}

/**
 * Classify an image file on-device using MediaPipe.
 *
 * @param file  A File object from <input type="file">
 * @returns     MediaPipeResult or null if classification failed / unavailable
 */
export async function classifyImageOnDevice(
  file: File
): Promise<MediaPipeResult | null> {
  try {
    const ready = await initMediaPipe();
    if (!ready || !_classifier) return null;

    // Create HTMLImageElement from File for MediaPipe
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imageUrl;
    });

    const result = _classifier.classify(img);
    URL.revokeObjectURL(imageUrl); // Clean up

    if (!result?.classifications?.[0]?.categories?.length) return null;

    const top = result.classifications[0].categories[0];
    const label: string = top.categoryName || top.displayName || '';
    const confidence: number = top.score ?? 0;
    const category = mapLabelToCategory(label);

    console.info(`[MediaPipe] Classified: label="${label}", category="${category}", confidence=${confidence.toFixed(2)}`);

    return { category, label, confidence, source: 'mediapipe' };
  } catch (err) {
    // Silent fail — Gemini Vision handles classification server-side
    console.warn('[MediaPipe] Classification failed (non-critical):', err);
    return null;
  }
}

/**
 * Pre-warm MediaPipe in the background after page load.
 * Call this once in App.tsx to reduce latency on first photo upload.
 */
export function preWarmMediaPipe(): void {
  // Non-blocking background initialisation
  setTimeout(() => {
    initMediaPipe().catch(() => {
      // Silently ignored
    });
  }, 3000); // 3 second delay to not compete with initial page render
}
