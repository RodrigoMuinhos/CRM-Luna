"use client";

import { useState } from "react";
import { ChevronDown, Download, Eye, EyeOff } from "lucide-react";
import type { EvidenceSnapshot } from "@/lib/evidenceCapture";
import { formatEvidenceForDisplay } from "@/lib/evidenceCapture";

export interface EvidencePanelProps {
  evidences: EvidenceSnapshot[];
  onDownload?: (evidence: EvidenceSnapshot) => void;
  title?: string;
  className?: string;
}

export function EvidencePanel({
  evidences,
  onDownload,
  title = "Evidências Capturadas",
  className = "",
}: EvidencePanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showScreenshots, setShowScreenshots] = useState(false);

  if (!evidences || evidences.length === 0) {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 ${className}`}>
        <p className="text-sm text-amber-700">
          {title} — Nenhuma evidência capturada ainda
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {title} ({evidences.length})
        </h3>
        <button
          onClick={() => setShowScreenshots(!showScreenshots)}
          className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
        >
          {showScreenshots ? (
            <>
              <EyeOff size={14} />
              Ocultar
            </>
          ) : (
            <>
              <Eye size={14} />
              Mostrar
            </>
          )}
          Screenshots
        </button>
      </div>

      <div className="space-y-2">
        {evidences.map((evidence, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-gray-200 bg-white overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedIndex(expandedIndex === idx ? null : idx)
              }
              className="w-full flex items-center justify-between gap-2 p-3 hover:bg-gray-50 transition"
            >
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {evidence.action}
                </p>
                <p className="text-xs text-gray-500">{evidence.timestamp}</p>
              </div>
              <div className="flex items-center gap-1">
                {evidence.screenshotBase64 && (
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                )}
                {evidence.passwordFieldState && (
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                )}
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition ${
                    expandedIndex === idx ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {expandedIndex === idx && (
              <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-2">
                {/* Metadata */}
                <div className="space-y-1">
                  <p className="text-xs font-mono text-gray-600">
                    {formatEvidenceForDisplay(evidence)
                      .split("\n")
                      .map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                  </p>
                </div>

                {/* Screenshot Preview */}
                {showScreenshots && evidence.screenshotBase64 && (
                  <div className="mt-2 border-t border-gray-300 pt-2">
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      Screenshot:
                    </p>
                    <img
                      src={evidence.screenshotBase64}
                      alt="Evidence screenshot"
                      className="max-w-full h-auto rounded border border-gray-300 max-h-[200px]"
                    />
                  </div>
                )}

                {/* Password Field State */}
                {evidence.passwordFieldState && (
                  <div className="mt-2 border-t border-gray-300 pt-2">
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      Campo Senha (Mascarado):
                    </p>
                    <div className="bg-white border border-green-300 rounded p-2 font-mono text-xs text-green-700">
                      {evidence.passwordFieldState.masked}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {onDownload && (
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={() => onDownload(evidence)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600 transition"
                    >
                      <Download size={12} />
                      Download
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compliance Summary */}
      {evidences.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">
            ✓ {evidences.length} evidência(s) capturada(s)
          </p>
          <p className="text-xs text-blue-600">
            Para conformidade: capture "Deseja cancelar?", "senha mascarada" e
            horário.
          </p>
        </div>
      )}
    </div>
  );
}
