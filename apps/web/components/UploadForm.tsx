"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/apiUrl";
import { SamplePicker } from "./SamplePicker";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadFile(selected: File) {
    setUploading(true);
    setError(null);

    const body = new FormData();
    body.append("file", selected);

    try {
      const response = await fetch(`${API_URL}/v1/documents`, { method: "POST", body });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      const data = await response.json();
      router.push(`/documents/${data.document_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      uploadFile(dropped);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) {
      setFile(selected);
      uploadFile(selected);
    }
  }

  function handleSampleSelect(sample: File) {
    setFile(sample);
    uploadFile(sample);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors duration-150 ${
          isDraggingOver ? "border-accent bg-accent/5" : "border-border-strong hover:border-subtle"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="application/pdf"
          required
          onChange={handleFileChange}
          className="sr-only"
        />
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-foreground/5 text-muted transition-transform duration-150 group-active:scale-95">
          {uploading ? (
            <Spinner />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 16V4m0 0L7 9m5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {uploading ? "Reading your PDF…" : file ? file.name : "Drop a PDF here, or click to browse"}
          </p>
          <p className="text-xs text-subtle mt-1">Works with PDFs up to 100 pages</p>
        </div>
        {!uploading && (
          <div onClick={(event) => event.stopPropagation()} className="w-full pt-1">
            <SamplePicker onSelect={handleSampleSelect} disabled={uploading} />
          </div>
        )}
      </div>
      {error && <p className="text-danger text-sm px-1">{error}</p>}
    </div>
  );
}
