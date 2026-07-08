// src/Pages/components/AssetAttachments.tsx
import * as React from "react";
import { toast } from "sonner";
import { Paperclip, FileText, Download, Eye, Trash2, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAssetAttachmentApi,
  isImageContentType,
  type AssetAttachment,
} from "@/lib/asset-attachment-api";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentThumbnail({
  assetId,
  attachment,
}: {
  assetId: string;
  attachment: AssetAttachment;
}) {
  const { getViewUrl } = useAssetAttachmentApi();
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    getViewUrl(assetId, attachment)
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => {
        // fall back to the generic file icon below
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, attachment.id]);

  if (!url) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={attachment.fileName}
      className="h-10 w-10 shrink-0 rounded object-cover"
    />
  );
}

interface AssetAttachmentsProps {
  /** Undefined while creating a brand-new asset that hasn't been saved yet. */
  assetId?: string;
  /** Files picked but not yet uploaded — uploaded by the parent on save. */
  stagedFiles: File[];
  onStagedFilesChange: (files: File[]) => void;
  disabled?: boolean;
  /** View/download only — hides Add Attachment and Delete (used in the read-only detail panel). */
  readOnly?: boolean;
}

export function AssetAttachments({
  assetId,
  stagedFiles,
  onStagedFilesChange,
  disabled,
  readOnly,
}: AssetAttachmentsProps) {
  const { list, remove, getViewUrl } = useAssetAttachmentApi();
  const [attachments, setAttachments] = React.useState<AssetAttachment[]>([]);
  const [loading, setLoading] = React.useState(!!assetId);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const refresh = React.useCallback(async () => {
    if (!assetId) {
      setAttachments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await list(assetId);
      setAttachments(data);
    } catch (e) {
      toast.error("Failed to load attachments", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [assetId, list]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFilesSelected = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      // Snapshot to a real array before resetting the input's value — the
      // live FileList reflects the reset too, so reading it afterwards
      // (or checking .length after clearing) sees 0 files.
      const newFiles = Array.from(files);
      e.target.value = "";
      onStagedFilesChange([...stagedFiles, ...newFiles]);
    },
    [stagedFiles, onStagedFilesChange],
  );

  const removeStaged = React.useCallback(
    (index: number) => {
      onStagedFilesChange(stagedFiles.filter((_, i) => i !== index));
    },
    [stagedFiles, onStagedFilesChange],
  );

  const handleDelete = React.useCallback(
    async (attachment: AssetAttachment) => {
      if (!assetId) return;
      setDeletingId(attachment.id);
      try {
        await remove(assetId, attachment.id);
        setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
        toast.success("Attachment removed");
      } catch (err) {
        toast.error("Failed to remove attachment", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setDeletingId(null);
      }
    },
    [assetId, remove],
  );

  const { download } = useAssetAttachmentApi();

  const handleDownload = React.useCallback(
    async (attachment: AssetAttachment) => {
      if (!assetId) return;
      try {
        await download(assetId, attachment);
      } catch (err) {
        toast.error("Download failed", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [assetId, download],
  );

  const handleView = React.useCallback(
    async (attachment: AssetAttachment) => {
      if (!assetId) return;
      try {
        const url = await getViewUrl(assetId, attachment);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        toast.error("Failed to open attachment", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [assetId, getViewUrl],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Attachments (screenshots, invoices, warranty documents)
        </div>
        {!readOnly && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
              Add Attachment
            </Button>
          </div>
        )}
      </div>

      {assetId && (
        <>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading attachments…
            </div>
          ) : attachments.length > 0 ? (
            <ul className="space-y-2">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center gap-3 rounded-md border p-2"
                >
                  {isImageContentType(attachment.contentType) ? (
                    <AttachmentThumbnail assetId={assetId} attachment={attachment} />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{attachment.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(attachment.fileSize)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleView(attachment)}
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(attachment)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(attachment)}
                      disabled={deletingId === attachment.id}
                      title="Delete"
                    >
                      {deletingId === attachment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      {stagedFiles.length > 0 && (
        <ul className="space-y-2">
          {stagedFiles.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-md border border-dashed p-2"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatBytes(file.size)} — will be uploaded on save
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeStaged(index)}
                disabled={disabled}
                title="Remove"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!assetId && stagedFiles.length === 0 && (
        <p className="text-sm text-muted-foreground">No attachments added yet.</p>
      )}
      {assetId && !loading && attachments.length === 0 && stagedFiles.length === 0 && (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      )}
    </div>
  );
}
