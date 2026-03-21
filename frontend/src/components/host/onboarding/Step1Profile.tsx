"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";

type Props = {
  displayName: string;
  bio: string;
  onDisplayNameChange: (v: string) => void;
  onBioChange: (v: string) => void;
  onAvatarUploaded?: () => void;
};

export function Step1Profile({
  displayName,
  bio,
  onDisplayNameChange,
  onBioChange,
  onAvatarUploaded,
}: Props) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        toast.error("Dozwolone: JPG, PNG, WebP.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Max 5 MB.");
        return;
      }
      const fd = new FormData();
      fd.append("avatar", file);
      try {
        await api.patchForm("/api/v1/profile/", fd);
        setAvatarPreview(URL.createObjectURL(file));
        onAvatarUploaded?.();
        toast.success("Zdjęcie zapisane.");
      } catch {
        toast.error("Upload avatara wymaga wsparcia API (multipart).");
        setAvatarPreview(URL.createObjectURL(file));
        onAvatarUploaded?.();
      }
    },
    [onAvatarUploaded]
  );

  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-brand-dark">👤 O Tobie</h2>
      <p className="mt-1 text-sm text-text-muted">Goście chcą poznać Ciebie zanim zarezerwują pobyt.</p>

      <label className="mt-6 block text-sm font-semibold text-brand-dark">
        Wyświetlana nazwa
        <input
          className="input mt-2"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="Jan Kowalski"
        />
      </label>

      <label className="mt-4 block text-sm font-semibold text-brand-dark">
        Bio
        <textarea
          className="input mt-2 min-h-[100px] resize-y"
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          placeholder="Opowiedz gościom o sobie..."
        />
      </label>

      <div className="mt-6">
        <p className="text-sm font-semibold text-brand-dark">Zdjęcie profilowe</p>
        <div
          className="relative mt-2 flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#e5e7eb] bg-brand-surface"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onFile(e.dataTransfer.files[0] ?? null);
          }}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-[11px] text-text-muted">
              📷 Kliknij lub przeciągnij
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-text-muted">JPG, PNG · max 5 MB</p>
      </div>
    </div>
  );
}
