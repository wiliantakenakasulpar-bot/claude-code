"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Car,
  Search,
  Download,
  ImageIcon,
  Loader2,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { clsx } from "clsx";

interface Vehicle {
  id: string;
  plate?: string | null;
  model?: string | null;
  color?: string | null;
  year?: number | null;
  createdAt: string;
  _count: { images: number };
  images: Array<{ thumbnailPath?: string | null; finalName?: string | null }>;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...(search && { search }) });
      const res = await fetch(`/api/vehicles?${params}`);
      const data = await res.json();
      if (data.success) {
        setVehicles(data.data);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadVehicles, 300);
    return () => clearTimeout(t);
  }, [loadVehicles]);

  async function downloadVehicle(vehicleId: string, plate: string | null) {
    setDownloading(vehicleId);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${plate || "veiculo"}_fotos.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado!");
    } catch {
      toast.error("Erro no download");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} veículo(s) com imagens processadas
          </p>
        </div>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por placa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-20">
          <Car className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Nenhum veículo encontrado</p>
          <p className="text-gray-300 text-sm mt-1">
            As placas são detectadas automaticamente durante o processamento
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {vehicles.map((vehicle) => {
            const cover = vehicle.images[0];
            return (
              <div key={vehicle.id} className="card-hover p-0 overflow-hidden">
                {/* Cover image */}
                <div className="aspect-video bg-gray-100 relative">
                  {cover?.thumbnailPath ? (
                    <img
                      src={`/api/files/${cover.thumbnailPath}`}
                      alt={vehicle.plate || "Veículo"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <span className="font-mono font-bold text-white text-lg tracking-wider">
                      {vehicle.plate || "Sem placa"}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <ImageIcon className="w-4 h-4" />
                      {vehicle._count.images} foto(s)
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadVehicle(vehicle.id, vehicle.plate || null)}
                        disabled={downloading === vehicle.id}
                        className={clsx(
                          "btn-secondary text-xs px-2.5 py-1.5",
                          downloading === vehicle.id && "opacity-60"
                        )}
                        title="Download ZIP"
                      >
                        {downloading === vehicle.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        ZIP
                      </button>
                      <Link
                        href={`/library?vehicleId=${vehicle.id}`}
                        className="btn-primary text-xs px-2.5 py-1.5"
                      >
                        Ver
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
