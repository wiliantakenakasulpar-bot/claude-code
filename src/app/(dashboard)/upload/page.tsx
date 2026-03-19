"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Loader2,
  CloudUpload,
  FolderOpen,
  ArrowRight,
  Info,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import type { UploadFile } from "@/types";
import { v4 as uuidv4 } from "uuid";

const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 200;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileItem({ file, onRemove }: { file: UploadFile; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
      {/* Preview */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
        {file.preview ? (
          <img
            src={file.preview}
            alt={file.file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{file.file.name}</p>
        <p className="text-xs text-gray-400">{formatFileSize(file.file.size)}</p>

        {/* Progress bar */}
        {file.status === "uploading" && (
          <div className="mt-1.5 bg-gray-200 rounded-full h-1">
            <div
              className="bg-brand-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}

        {file.status === "error" && (
          <p className="text-xs text-red-500 mt-0.5">{file.error}</p>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {file.status === "pending" && (
          <span className="text-xs text-gray-400">Aguardando</span>
        )}
        {file.status === "uploading" && (
          <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
        )}
        {file.status === "uploaded" && (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        )}
        {file.status === "error" && (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}

        {file.status === "pending" && (
          <button
            onClick={onRemove}
            className="w-6 h-6 flex items-center justify-center rounded-lg
                       text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [batchName, setBatchName] = useState(
    `Lote ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
  );
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedBatchId, setUploadedBatchId] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = MAX_FILES - files.length;
      const toAdd = acceptedFiles.slice(0, remaining);

      if (acceptedFiles.length > remaining) {
        toast.error(`Máximo de ${MAX_FILES} imagens por lote`);
      }

      const newFiles: UploadFile[] = toAdd.map((file) => ({
        id: uuidv4(),
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
        status: "pending",
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    disabled: uploading,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        const msg = r.errors[0]?.message || "Arquivo inválido";
        toast.error(`${r.file.name}: ${msg}`);
      });
    },
  });

  function removeFile(id: string) {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }

  function clearAll() {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setUploadComplete(false);
    setUploadedBatchId(null);
    setOverallProgress(0);
  }

  async function startUpload() {
    if (files.length === 0) {
      toast.error("Adicione imagens antes de enviar");
      return;
    }

    setUploading(true);
    abortRef.current = new AbortController();

    // Upload in chunks of 10 files
    const CHUNK_SIZE = 10;
    const chunks: UploadFile[][] = [];
    const pendingFiles = files.filter((f) => f.status === "pending");

    for (let i = 0; i < pendingFiles.length; i += CHUNK_SIZE) {
      chunks.push(pendingFiles.slice(i, i + CHUNK_SIZE));
    }

    let processedCount = 0;
    let firstBatchId: string | null = null;

    for (const chunk of chunks) {
      if (abortRef.current.signal.aborted) break;

      // Mark chunk as uploading
      setFiles((prev) =>
        prev.map((f) =>
          chunk.find((c) => c.id === f.id) ? { ...f, status: "uploading", progress: 0 } : f
        )
      );

      const formData = new FormData();
      formData.append("batchName", batchName);

      chunk.forEach((f) => formData.append("files", f.file));

      try {
        const res = await fetch("/api/images", {
          method: "POST",
          body: formData,
          signal: abortRef.current.signal,
        });

        const data = await res.json();

        if (data.success) {
          if (!firstBatchId) firstBatchId = data.data.batch.id;

          setFiles((prev) =>
            prev.map((f) => {
              const uploaded = chunk.find((c) => c.id === f.id);
              return uploaded
                ? { ...f, status: "uploaded", progress: 100, imageId: data.data.images[0]?.id }
                : f;
            })
          );

          processedCount += chunk.length;
          setOverallProgress(Math.round((processedCount / pendingFiles.length) * 100));
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              chunk.find((c) => c.id === f.id)
                ? { ...f, status: "error", error: data.error || "Upload falhou" }
                : f
            )
          );
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") break;
        setFiles((prev) =>
          prev.map((f) =>
            chunk.find((c) => c.id === f.id)
              ? { ...f, status: "error", error: "Erro de conexão" }
              : f
          )
        );
      }
    }

    setUploading(false);
    setUploadedBatchId(firstBatchId);

    const hasErrors = files.some((f) => f.status === "error");
    const allSuccess = files.every((f) => f.status === "uploaded");

    if (allSuccess) {
      setUploadComplete(true);
      toast.success(`${pendingFiles.length} imagens enviadas! Processamento iniciado.`);
    } else if (hasErrors) {
      toast.error("Algumas imagens falharam no upload");
    }
  }

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const uploadedCount = files.filter((f) => f.status === "uploaded").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  if (uploadComplete) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="card p-10 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Concluído!</h2>
            <p className="text-gray-500 mb-2">
              {uploadedCount} imagens enviadas e na fila de processamento
            </p>
            {errorCount > 0 && (
              <p className="text-sm text-red-500 mb-4">
                {errorCount} imagem(s) com erro
              </p>
            )}
            <div className="bg-blue-50 rounded-xl p-4 mb-8 text-left">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Processamento em andamento</p>
                  <p className="text-xs text-blue-600 mt-1">
                    A IA está processando suas imagens: removendo fundo, melhorando qualidade e
                    detectando placas. Você receberá uma notificação quando concluir.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={clearAll} className="btn-secondary">
                Novo Upload
              </button>
              <Link
                href={uploadedBatchId ? `/library?batchId=${uploadedBatchId}` : "/library"}
                className="btn-primary"
              >
                Ver Imagens <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Upload de Imagens</h1>
          <p className="text-gray-500 text-sm mt-1">
            Envie até {MAX_FILES} fotos de veículos para processamento automático com IA
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Upload Zone */}
          <div className="col-span-2 space-y-4">
            {/* Batch name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome do Lote
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Ex: Estoque Janeiro 2025"
                className="input-field"
                disabled={uploading}
              />
            </div>

            {/* Drop zone */}
            <div
              {...getRootProps()}
              className={clsx(
                "upload-zone transition-all",
                isDragActive && "dropzone-active border-brand-500 bg-brand-50",
                uploading && "opacity-60 cursor-not-allowed"
              )}
            >
              <input {...getInputProps()} />
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CloudUpload className={clsx("w-8 h-8 text-brand-500", isDragActive && "animate-bounce")} />
                </div>
                {isDragActive ? (
                  <p className="text-brand-600 font-semibold text-lg">Solte as imagens aqui!</p>
                ) : (
                  <>
                    <p className="text-gray-700 font-semibold text-lg">
                      Arraste e solte as fotos aqui
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      ou clique para selecionar arquivos
                    </p>
                  </>
                )}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
                  <span>JPG, PNG, HEIC</span>
                  <span>•</span>
                  <span>Máx. {formatFileSize(MAX_FILE_SIZE)} por arquivo</span>
                  <span>•</span>
                  <span>Até {MAX_FILES} imagens</span>
                </div>
                <button className="btn-secondary mt-4 text-xs" type="button">
                  <FolderOpen className="w-3.5 h-3.5" />
                  Selecionar arquivos
                </button>
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    {files.length} arquivo(s) selecionado(s)
                  </p>
                  {!uploading && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remover todos
                    </button>
                  )}
                </div>

                {/* Overall progress */}
                {uploading && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progresso geral</span>
                      <span>{overallProgress}%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {files.map((file) => (
                    <FileItem
                      key={file.id}
                      file={file}
                      onRemove={() => removeFile(file.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Resumo</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total de arquivos</span>
                  <span className="font-medium">{files.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tamanho total</span>
                  <span className="font-medium">{formatFileSize(totalSize)}</span>
                </div>
                {uploadedCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Enviados</span>
                    <span className="font-medium text-green-600">{uploadedCount}</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Com erro</span>
                    <span className="font-medium text-red-600">{errorCount}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 my-4" />

              <button
                onClick={startUpload}
                disabled={uploading || pendingCount === 0}
                className="btn-primary w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando... {overallProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Enviar {pendingCount > 0 ? pendingCount : files.length} imagens
                  </>
                )}
              </button>
            </div>

            {/* What happens */}
            <div className="card p-5 bg-gradient-to-b from-brand-50 to-purple-50 border-brand-100">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">O que acontece</h3>
              <ol className="space-y-2.5">
                {[
                  "Upload das fotos originais",
                  "IA remove o fundo automaticamente",
                  "Fundo profissional aplicado",
                  "Iluminação e qualidade ajustadas",
                  "Placa detectada via OCR",
                  "Arquivos nomeados por placa",
                  "Download organizado disponível",
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 bg-brand-600 text-white rounded-full text-xs flex items-center justify-center font-medium mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-xs text-gray-600">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
