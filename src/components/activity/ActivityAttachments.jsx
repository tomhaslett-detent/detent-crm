import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { listActivityAttachments, openActivityAttachment, uploadActivityAttachment } from "@/lib/crm-attachments";

export default function ActivityAttachments({ activityId }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [download, setDownload] = useState(null);
  const query = useQuery({
    queryKey: ["crm-activity-attachments", user?.id, activityId],
    queryFn: () => listActivityAttachments({ data: { activityId } }),
    enabled: open && Boolean(user?.id),
    retry: false,
  });

  async function upload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("activityId", activityId);
    setBusy(true);
    setStatus("");
    try {
      await uploadActivityAttachment({ data });
      form.reset();
      await query.refetch();
      setStatus("Private attachment uploaded.");
    } catch {
      setStatus("Could not upload the attachment. Check the file and your access, then retry.");
    } finally {
      setBusy(false);
    }
  }

  async function prepare(attachment) {
    setBusy(true);
    setDownload(null);
    setStatus("");
    try {
      const { url } = await openActivityAttachment({ data: { activityId, attachmentId: attachment.id } });
      setDownload({ url, filename: attachment.filename });
    } catch {
      setStatus("Could not prepare this attachment. Check your access and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 text-xs">
      <button type="button" aria-expanded={open} className="font-medium underline underline-offset-2" onClick={() => { setOpen(!open); setDownload(null); setStatus(""); }}>
        Attachments
      </button>
      {open && <section className="mt-2 space-y-2 rounded border bg-card p-3" aria-label="Activity attachments">
        {query.isPending && <p role="status">Loading attachments…</p>}
        {query.isError && <p role="alert">Could not load attachments.</p>}
        {query.data?.attachments.length === 0 && <p>No files attached.</p>}
        {query.data?.attachments.length > 0 && <ul className="space-y-1">
          {query.data.attachments.map((file) => <li className="flex items-center justify-between gap-2" key={file.id}>
            <span className="break-all">{file.filename}</span>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => prepare(file)}>Get file link</Button>
          </li>)}
        </ul>}
        {download && <a href={download.url} target="_blank" rel="noopener noreferrer" className="block font-medium underline">
          Open {download.filename} · link valid for two minutes
        </a>}
        {query.data?.canUpload && <form onSubmit={upload} className="space-y-2">
          {query.data.pendingSourceIds.length > 0 && <label className="block">Source attachment reference
            <select name="sourceId" className="ml-2 rounded border bg-background px-2 py-1" disabled={busy}>
              <option value="">New attachment</option>
              {query.data.pendingSourceIds.map((id) => <option value={id} key={id}>{id}</option>)}
            </select>
          </label>}
          <label className="block">File up to 8 MB
            <input name="file" type="file" className="block py-1" required disabled={busy}
              accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.csv,.xlsx,.docx,.pptx,.zip" />
          </label>
          <Button type="submit" size="sm" disabled={busy}>Upload private file</Button>
        </form>}
        {status && <p role="status">{status}</p>}
      </section>}
    </div>
  );
}
