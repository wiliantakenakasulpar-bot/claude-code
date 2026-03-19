"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  MoreHorizontal,
  ImageIcon,
  ArrowDownToLine,
  Pencil,
  X,
  Archive,
  Filter,
  ZoomIn,
} from "lucide-react";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import type { Image as ImageType } from "@/types";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    pending: { label: "Aguardando", icon: Clock, className: "status-badge status-pending" },
    queued: { label: "Na fila", icon: Clock, className: "status-badge status-pending" },
    processing: { label: "Processando", icon: Loader2, className: "status-badge status-processing" },
    completed: { label: "Concluído", icon: CheckCircle2, className: "status-badge status-completed" },
    error: { label: "Erro", icon: AlertCircle, className: "status-badge status-error" },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span className={c.className}>
      <Icon className={clsx("w-3 h-3", status === "processing" && "animate-spin")} />
      {c.label}
    </span>
  );
}

function PlateEditModal({
  image,
  onClose,
  onSave,
}: {
  image: ImageType;
  onClose: () => void;
  onSave: (plate: string) => void;
}) {
  const [plate, setPlate] = useState(image.plateDetected || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/images/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateDetected: plate.toUpperCase() }),
      });
      const data = await res.json();
      if (data.success) {
        onSave(plate.toUpperCase());
        toast.success("Placa atualizada");
        onClose();
      } else {
        toast.error(data.error || "Erro ao salvar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Editar Placa</h3>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Informe a placa do veículo manualmente
        </p>
        <input
          type="text"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="Ex: ABC1D23"
          maxLength={8}
          className="input-field mb-4 font-mono text-center text-lg tracking-widest uppercase"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageCard({
  image,
  selected,
  onSelect,
  onEdit,
  onDownload,
  onReprocess,
}: {
  image: ImageType;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onReprocess: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const thumbnailUrl = image.thumbnailPath
    ? `/api/files/${image.thumbnailPath}`
    : image.originalPath
    ? `/api/files/${image.originalPath}`
    : null;

  return (
    <div
      className={clsx(
        "image-card relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group",
        selected ? "border-brand-500 shadow-lg" : "border-transparent hover:border-gray-200"
      )}
      onClick={onSelect}
    >
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={image.finalName || image.originalName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-300" />
          </div>
        )}

        <div className="image-overlay absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="w-9 h-9 bg-white rounded-xl flex items-center justify-center hover:bg-brand-50 transition-colors shadow-lg"
          >
            <ArrowDownToLine className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 bg-white rounded-xl flex items-center justify-center hover:bg-brand-50 transition-colors shadow-lg"
          >
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        <div className="absolute top-2 left-2">
          <StatusBadge status={image.status} />
        </div>

        <div
          className={clsx(
            "absolute top-2 right-2 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
            selected ? "bg-brand-500 border-brand-500" : "bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
        </div>

        <div className="absolute bottom-2 right-2">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white transition-all shadow"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-gray-600" />
            </button>
            {showMenu && (
              <div className="absolute bottom-8 right-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-36 z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar placa
                </button>
                {image.status === "error" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onReprocess(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reprocessar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 bg-white">
        <p className="text-xs font-medium text-gray-800 truncate">
          {image.finalName || image.originalName}
        </p>
        <div className="flex items-center justify-between mt-1">
          {image.plateDetected ? (
            <span className="text-xs font-mono text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
              {image.plateDetected}
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="text-xs text-gray-400 hover:text-brand-600 flex items-center gap-1"
            >
              <Pencil className="w-2.5 h-2.5" />
              Sem placa
            </button>
          )}
          {image.width && (
            <span className="text-xs text-gray-400">{image.width}×{image.height}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function LibraryContent() {
  const searchParams = useSearchParams();
  const [images, setImages] = useState<ImageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingImage, setEditingImage] = useState<ImageType | null>(null);
  const [downloading, setDownloading] = useState(false);

  const batchId = searchParams.get("batchId") || "";
  const vehicleId = searchParams.get("vehicleId") || "";
  const PAGE_SIZE = 24;

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(statusFilter && { status: statusFilter }),
        ...(batchId && { batchId }),
        ...(vehicleId && { vehicleId }),
        ...(search && { plate: search }),
      });

      const res = await fetch(`/api/images?${params}`);
      const data = await res.json();
      if (data.success) {
        setImages(data.data);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, batchId, vehicleId, search]);

  useEffect(() => {
    loadImages();
    const interval = setInterval(() => {
      if (images.some((img) => ["queued", "processing"].includes(img.status))) {
        loadImages();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [loadImages, images]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === images.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(images.map((i) => i.id)));
  }

  async function downloadSelected() {
    if (selectedIds.size === 0) { toast.error("Selecione imagens"); return; }
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `autovision_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado!");
    } catch { toast.error("Erro no download"); }
    finally { setDownloading(false); }
  }

  async function downloadImage(image: ImageType) {
    const url = `/api/download?imageId=${image.id}&type=${image.processedPath ? "processed" : "original"}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = image.finalName || image.originalName;
    a.click();
  }

  async function reprocessImage(imageId: string) {
    const res = await fetch(`/api/images/${imageId}/reprocess`, { method: "POST" });
    const data = await res.json();
    if (data.success) { toast.success("Reprocessamento iniciado"); loadImages(); }
    else toast.error(data.error || "Erro");
  }

  async function downloadBatch() {
    if (!batchId) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lote_${batchId.slice(-8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado!");
    } catch { toast.error("Erro no download"); }
    finally { setDownloading(false); }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const processingCount = images.filter((i) => ["queued", "processing"].includes(i.status)).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biblioteca</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} imagem(s)
            {processingCount > 0 && <span className="ml-2 text-yellow-600">• {processingCount} processando...</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {batchId && (
            <button onClick={downloadBatch} disabled={downloading} className="btn-secondary">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              Download do Lote
            </button>
          )}
          {selectedIds.size > 0 && (
            <button onClick={downloadSelected} disabled={downloading} className="btn-primary">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download ({selectedIds.size})
            </button>
          )}
          <button onClick={loadImages} className="btn-ghost">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por placa..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {["", "completed", "processing", "error"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {s === "" ? "Todos" : s === "completed" ? "Concluídos" : s === "processing" ? "Processando" : "Com erro"}
            </button>
          ))}
        </div>
        {images.length > 0 && (
          <button onClick={selectAll} className="btn-ghost text-xs">
            <Filter className="w-3.5 h-3.5" />
            {selectedIds.size === images.length ? "Desselecionar" : "Selecionar todos"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <div className="skeleton aspect-video" />
              <div className="p-3 bg-white">
                <div className="skeleton h-3 w-3/4 mb-2" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-20">
          <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Nenhuma imagem encontrada</p>
          <p className="text-gray-300 text-sm mt-1">{search ? "Tente outra busca" : "Faça upload para começar"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              selected={selectedIds.has(image.id)}
              onSelect={() => toggleSelect(image.id)}
              onEdit={() => setEditingImage(image)}
              onDownload={() => downloadImage(image)}
              onReprocess={() => reprocessImage(image.id)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5">
            Anterior
          </button>
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm px-3 py-1.5">
            Próxima
          </button>
        </div>
      )}

      {editingImage && (
        <PlateEditModal
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSave={(plate) => {
            setImages((prev) => prev.map((img) => img.id === editingImage.id ? { ...img, plateDetected: plate } : img));
          }}
        />
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    }>
      <LibraryContent />
    </Suspense>
  );
}
