"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Save,
  Loader2,
  Monitor,
  Sun,
  TreePine,
  Zap,
  Shield,
  FileImage,
} from "lucide-react";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import type { UserSettings } from "@/types";

type BackgroundType = "white" | "studio" | "outdoor";
type Quality = "high" | "ultra";
type Format = "jpg" | "png";

const backgroundOptions: {
  value: BackgroundType;
  label: string;
  desc: string;
  icon: React.ElementType;
  preview: string;
}[] = [
  {
    value: "white",
    label: "Fundo Branco",
    desc: "Fundo branco premium, ideal para e-commerce",
    icon: Monitor,
    preview: "bg-white border-2 border-gray-200",
  },
  {
    value: "studio",
    label: "Estúdio",
    desc: "Ambiente de estúdio automotivo com gradiente profissional",
    icon: Zap,
    preview: "bg-gradient-to-b from-gray-200 to-gray-400",
  },
  {
    value: "outdoor",
    label: "Externo Premium",
    desc: "Ambiente externo sofisticado com céu neutro",
    icon: TreePine,
    preview: "bg-gradient-to-b from-sky-300 to-gray-300",
  },
];

const qualityOptions: {
  value: Quality;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    value: "high",
    label: "Alta Qualidade",
    desc: "1920×1080 — ideal para anúncios online",
    icon: Shield,
  },
  {
    value: "ultra",
    label: "Ultra HD",
    desc: "3840×2160 — máxima resolução para impressão",
    icon: Zap,
  },
];

const formatOptions: { value: Format; label: string; desc: string }[] = [
  { value: "jpg", label: "JPG", desc: "Menor tamanho, compatível com todos os marketplaces" },
  { value: "png", label: "PNG", desc: "Sem perdas, ideal para edições futuras" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    backgroundType: "studio",
    quality: "high",
    format: "jpg",
    autoOcr: true,
    autoProcess: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) setSettings(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Configurações salvas!");
        setSettings(data.data);
      } else {
        toast.error(data.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-500 text-sm mt-1">
              Defina o padrão de saída para suas imagens processadas
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar
          </button>
        </div>

        <div className="space-y-6">
          {/* Background Type */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                <Sun className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Tipo de Fundo</h2>
                <p className="text-xs text-gray-400">Escolha o ambiente para suas fotos processadas</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {backgroundOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSettings({ ...settings, backgroundType: opt.value })}
                  className={clsx(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    settings.backgroundType === opt.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  {/* Preview swatch */}
                  <div className={clsx("w-full h-12 rounded-lg mb-3", opt.preview)} />
                  <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Qualidade de Saída</h2>
                <p className="text-xs text-gray-400">Resolução e qualidade das imagens finais</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {qualityOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSettings({ ...settings, quality: opt.value })}
                    className={clsx(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      settings.quality === opt.value
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "w-5 h-5 mb-2",
                        settings.quality === opt.value ? "text-brand-600" : "text-gray-400"
                      )}
                    />
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                <FileImage className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Formato do Arquivo</h2>
                <p className="text-xs text-gray-400">Formato das imagens processadas</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {formatOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSettings({ ...settings, format: opt.value })}
                  className={clsx(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    settings.format === opt.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <p className="text-sm font-semibold text-gray-800 mb-0.5">.{opt.value.toUpperCase()}</p>
                  <p className="text-xs text-gray-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Automation */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Automação</h2>
                <p className="text-xs text-gray-400">Controle o comportamento automático</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">Processamento Automático</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Processar imagens automaticamente após upload
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSettings({ ...settings, autoProcess: !settings.autoProcess })
                  }
                  className={clsx(
                    "relative w-11 h-6 rounded-full transition-colors",
                    settings.autoProcess ? "bg-brand-500" : "bg-gray-200"
                  )}
                >
                  <span
                    className={clsx(
                      "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                      settings.autoProcess && "translate-x-5"
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">Leitura Automática de Placa</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Detectar placa automaticamente via OCR
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSettings({ ...settings, autoOcr: !settings.autoOcr })
                  }
                  className={clsx(
                    "relative w-11 h-6 rounded-full transition-colors",
                    settings.autoOcr ? "bg-brand-500" : "bg-gray-200"
                  )}
                >
                  <span
                    className={clsx(
                      "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                      settings.autoOcr && "translate-x-5"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
