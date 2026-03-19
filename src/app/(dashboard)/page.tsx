"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Images,
  Car,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  TrendingUp,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { DashboardStats, Batch } from "@/types";
import { clsx } from "clsx";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {loading ? (
        <div className="skeleton h-8 w-16 mb-1" />
      ) : (
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString("pt-BR")}</p>
      )}
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function BatchStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    processing: { label: "Processando", className: "status-badge status-processing" },
    completed: { label: "Concluído", className: "status-badge status-completed" },
    partial: { label: "Parcial", className: "status-badge bg-orange-100 text-orange-700" },
    error: { label: "Erro", className: "status-badge status-error" },
  };
  const c = config[status] || config.processing;
  return <span className={c.className}>{c.label}</span>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadStats() {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadStats();
    // Auto-refresh every 15s if there are pending items
    const interval = setInterval(() => {
      if (stats?.pendingImages && stats.pendingImages > 0) {
        loadStats();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [stats?.pendingImages]);

  const statCards = [
    {
      label: "Imagens processadas",
      value: stats?.processedImages || 0,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Em processamento",
      value: stats?.pendingImages || 0,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
    },
    {
      label: "Veículos tratados",
      value: stats?.totalVehicles || 0,
      icon: Car,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total de imagens",
      value: stats?.totalImages || 0,
      icon: Images,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Visão geral do seu processamento de imagens
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setRefreshing(true); loadStats(); }}
            disabled={refreshing}
            className="btn-secondary"
          >
            <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
            Atualizar
          </button>
          <Link href="/upload" className="btn-primary">
            <Upload className="w-4 h-4" />
            Novo Upload
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      {/* Error alert */}
      {!loading && (stats?.errorImages || 0) > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-8">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {stats?.errorImages} imagem(s) com erro de processamento
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Acesse a biblioteca para visualizar e reprocessar
            </p>
          </div>
          <Link href="/library?status=error" className="ml-auto btn-ghost text-red-600 text-xs">
            Ver erros <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Batches */}
        <div className="col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">Lotes Recentes</h2>
            <Link href="/library" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          ) : !stats?.recentBatches?.length ? (
            <div className="text-center py-12">
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhum lote ainda</p>
              <Link href="/upload" className="btn-primary mt-4 text-xs">
                Fazer primeiro upload
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentBatches.map((batch: Batch & { _count?: { images: number } }) => (
                <Link
                  key={batch.id}
                  href={`/library?batchId=${batch.id}`}
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
                      <Images className="w-4.5 h-4.5 w-[18px] h-[18px] text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600">
                        {batch.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {batch.totalImages} imagens •{" "}
                        {new Date(batch.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {batch.processedImages}/{batch.totalImages}
                      </p>
                      {batch.totalImages > 0 && (
                        <div className="w-20 bg-gray-100 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-brand-500 h-1.5 rounded-full"
                            style={{
                              width: `${(batch.processedImages / batch.totalImages) * 100}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <BatchStatusBadge status={batch.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
            <div className="space-y-2">
              <Link
                href="/upload"
                className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 hover:bg-brand-100 transition-colors"
              >
                <Upload className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-medium text-brand-700">Novo Upload em Massa</span>
              </Link>
              <Link
                href="/library"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Images className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Ver Biblioteca</span>
              </Link>
              <Link
                href="/vehicles"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Car className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Veículos por Placa</span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Configurar Padrão</span>
              </Link>
            </div>
          </div>

          {/* Processing status */}
          {(stats?.pendingImages || 0) > 0 && (
            <div className="card p-5 border-yellow-100 bg-yellow-50">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
                <h3 className="text-sm font-semibold text-yellow-800">Processando</h3>
              </div>
              <p className="text-xs text-yellow-700">
                {stats?.pendingImages} imagem(s) sendo processadas pela IA
              </p>
              <div className="mt-3 bg-yellow-100 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full progress-active"
                  style={{
                    width: `${
                      stats?.totalImages
                        ? ((stats.processedImages / stats.totalImages) * 100).toFixed(0)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
