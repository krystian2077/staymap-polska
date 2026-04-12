"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { cn } from "@/lib/utils";

type Img = { id: string; display_url: string; is_cover: boolean; sort_order: number };

type Props = {
  listingId: string;
  images: Img[];
  onRefresh: () => void;
};

export function Step4Photos({ listingId, images, onRefresh }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        toast.error("Dozwolone: JPG, PNG, WebP.");
        return;
      }
      if (file.size > 10_000_000) {
        toast.error("Max 10 MB na plik.");
        return;
      }
      const fd = new FormData();
      fd.append("image", file);
      fd.append("is_cover", images.length === 0 ? "true" : "false");
      setUploading(true);
      try {
        await api.postForm(`/api/v1/host/listings/${listingId}/images/`, fd);
        toast.success("Zdjęcie dodane.");
        onRefresh();
      } catch (e) {
        toast.error((e as Error).message || "Błąd uploadu.");
      } finally {
        setUploading(false);
      }
    },
    [images.length, listingId, onRefresh]
  );

  const handleDelete = async (imageId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to zdjęcie?")) return;
    setDeletingId(imageId);
    try {
      await api.delete(`/api/v1/host/listings/${listingId}/images/${imageId}/`);
      toast.success("Zdjęcie usunięte.");
      onRefresh();
    } catch (e) {
      toast.error("Błąd podczas usuwania zdjęcia.");
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-brand-dark">📷 Zdjęcia</h2>
      <p className="mt-1 text-sm text-text-muted">Minimum 1 zdjęcie. Pierwsze może być okładką.</p>

      <div
        className={cn(
          "mt-6 rounded-xl border-2 border-dashed border-brand-dark/[.06] p-8 text-center transition-colors",
          dragOver && "border-brand bg-brand-surface"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) void upload(f);
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          id="photo-upload"
          onChange={(e) => {
            const files = e.target.files;
            if (files) for (const f of Array.from(files)) void upload(f);
          }}
        />
        <label htmlFor="photo-upload" className="cursor-pointer">
          <span className="text-[32px]">🖼️</span>
          <p className="mt-2 font-semibold text-brand-dark">Dodaj zdjęcia</p>
          <p className="text-sm text-text-muted">Min. 1 zdjęcie · JPG/PNG/WebP · max 10 MB każde</p>
        </label>
      </div>

      {uploading ? (
        <div className="mt-2 h-1 overflow-hidden rounded bg-brand-muted">
          <div className="h-full w-full animate-pulse bg-brand" />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded-lg border border-brand-dark/[.06]"
          >
            {publicMediaUrl(img.display_url) ? (
              <Image src={publicMediaUrl(img.display_url) || ""} alt="Podgląd zdjęcia oferty" fill className="object-cover" unoptimized />
            ) : null}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-brand-dark">
                {img.is_cover ? "Okładka" : "Zdjęcie"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(img.id);
                }}
                disabled={deletingId === img.id}
                className="mt-1 rounded-full bg-red-500 p-2 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
            {img.is_cover ? (
              <span className="absolute bottom-1 left-1 rounded bg-brand-dark px-1.5 py-0.5 text-[10px] font-bold text-white">
                Okładka
              </span>
            ) : null}
          </div>
        ))}
        <label
          htmlFor="photo-upload"
          className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-brand-dark/[.06] text-text-muted"
        >
          + dodaj
        </label>
      </div>

      <p className="mt-3 text-center text-sm font-semibold text-brand-dark">
        Dodano zdjęć: {images.length} (wymagane min. 1)
      </p>
    </div>
  );
}
