/**
 * Module: Evidence Capture Service
 * Purpose: Automatically capture and persist evidence for TEF admin flows
 * 
 * Features:
 * - Timestamp capture (dd/MM/yyyy HH:mm:ss format)
 * - Screenshot capture via HTML2Canvas
 * - Password field masking (asterisks only)
 * - JSON + PNG file persistence
 * - Compliance with roteiro requirements (Seq 9/10/11/23)
 */

export type EvidenceType = 
  | "cancelar-prompt" 
  | "senha-supervisor" 
  | "reimpressao" 
  | "voltar-prompt"
  | "pendencia"
  | "menu-110-main";

export interface EvidenceSnapshot {
  sequence: number;
  type: EvidenceType;
  timestamp: string; // dd/MM/yyyy HH:mm:ss
  iso8601: string; // ISO for backend processing
  saleId?: string;
  nsuHost?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  screenshotBase64?: string;
  passwordFieldState?: {
    masked: string; // "●●●●●●"
    isVisible: boolean;
  };
}

export interface EvidenceBundle {
  sessionId: string;
  createdAt: string;
  evidences: EvidenceSnapshot[];
  complianceChecklist?: {
    seq9CancelarPromptCaptured: boolean;
    seq9SenhaMascaradaCaptured: boolean;
    seq10VoltarPromptCaptured: boolean;
    seq11ReimpressaoCaptured: boolean;
    seq23CancelarPromptCaptured: boolean;
  };
}

/**
 * Format timestamp to dd/MM/yyyy HH:mm:ss (Brazilian format)
 */
export function formatTimestampBR(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Mask password field (replace visible text with asterisks)
 */
export function maskPasswordField(element: HTMLInputElement | HTMLTextAreaElement | null): string {
  if (!element || !element.value) return "●●●●●●";
  return "●".repeat(Math.max(6, Math.min(element.value.length, 12)));
}

/**
 * Capture screenshot of specified container using HTML2Canvas
 * Falls back to null if library not available
 */
export async function captureScreenshot(containerId: string): Promise<string | null> {
  try {
    // Dynamically import html2canvas to avoid bundle size issues
    const html2canvas = (await import("html2canvas")).default;
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.warn(`[EvidenceCapture] Container ${containerId} not found`);
      return null;
    }

    const canvas = await html2canvas(container, {
      allowTaint: true,
      useCORS: true,
      scale: 1,
      logging: false,
      backgroundColor: "#ffffff",
    });

    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("[EvidenceCapture] Screenshot failed:", error);
    return null;
  }
}

/**
 * Create evidence snapshot with timestamp and optional screenshot
 */
export async function createEvidenceSnapshot(
  type: EvidenceType,
  action: string,
  description: string,
  options?: {
    sequence?: number;
    saleId?: string;
    nsuHost?: string;
    containerId?: string;
    passwordFieldSelector?: string;
    metadata?: Record<string, any>;
  }
): Promise<EvidenceSnapshot> {
  const now = new Date();
  const timestamp = formatTimestampBR(now);
  
  let screenshotBase64: string | undefined;
  let passwordFieldState: { masked: string; isVisible: boolean } | undefined;

  // Capture screenshot if container ID provided
  if (options?.containerId) {
    screenshotBase64 = (await captureScreenshot(options.containerId)) || undefined;
  }

  // Capture password field state if selector provided
  if (options?.passwordFieldSelector) {
    const passwordField = document.querySelector(options.passwordFieldSelector) as HTMLInputElement | null;
    if (passwordField) {
      passwordFieldState = {
        masked: maskPasswordField(passwordField),
        isVisible: passwordField.offsetParent !== null, // Check if visible
      };
    }
  }

  return {
    sequence: options?.sequence ?? 0,
    type,
    timestamp,
    iso8601: now.toISOString(),
    saleId: options?.saleId,
    nsuHost: options?.nsuHost,
    action,
    description,
    metadata: options?.metadata,
    screenshotBase64,
    passwordFieldState,
  };
}

/**
 * Persist evidence snapshot to backend (POST /api/tef/evidences)
 */
export async function persistEvidenceSnapshot(
  snapshot: EvidenceSnapshot,
  basePath: string = "/api/tef/evidences"
): Promise<{ ok: boolean; fileId?: string; error?: string }> {
  try {
    const response = await fetch(basePath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(snapshot),
    });

    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      throw new Error(json.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return { ok: true, fileId: result.fileId };
  } catch (error) {
    const msg = String(error instanceof Error ? error.message : error);
    console.error("[EvidenceCapture] Persist failed:", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Format evidence for display (UI panel)
 */
export function formatEvidenceForDisplay(snapshot: EvidenceSnapshot): string {
  const lines = [
    `[${snapshot.timestamp}] ${snapshot.action}`,
    `Tipo: ${snapshot.type}`,
  ];

  if (snapshot.saleId) lines.push(`Venda: ${snapshot.saleId}`);
  if (snapshot.nsuHost) lines.push(`NSU: ${snapshot.nsuHost}`);
  if (snapshot.description) lines.push(`Descrição: ${snapshot.description}`);
  if (snapshot.passwordFieldState?.masked) {
    lines.push(`Senha: ${snapshot.passwordFieldState.masked}`);
  }
  if (snapshot.screenshotBase64) {
    lines.push(`Screenshot: Capturado ✓`);
  }

  return lines.join("\n");
}

/**
 * Build compliance checklist for pre-homologacao validation
 */
export function buildComplianceChecklist(evidences: EvidenceSnapshot[]): Record<string, boolean> {
  return {
    seq9CancelarPromptCaptured: evidences.some(e => e.sequence === 9 && e.type === "cancelar-prompt"),
    seq9SenhaMascaradaCaptured: evidences.some(e => e.sequence === 9 && e.passwordFieldState?.masked),
    seq10VoltarPromptCaptured: evidences.some(e => e.sequence === 10 && e.type === "voltar-prompt"),
    seq11ReimpressaoCaptured: evidences.some(e => e.sequence === 11 && e.type === "reimpressao"),
    seq23CancelarPromptCaptured: evidences.some(e => e.sequence === 23 && e.type === "cancelar-prompt"),
  };
}
