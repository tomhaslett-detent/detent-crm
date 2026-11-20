export const maxAttachmentBytes = 8 * 1024 * 1024;
const allowedExtensions = /\.(pdf|png|jpe?g|gif|txt|csv|xlsx|docx|pptx|zip)$/i;

export function attachmentInput(form) {
  if (!(form instanceof FormData)) throw new Error("Choose a file to upload.");
  const activityId = form.get("activityId");
  const sourceId = form.get("sourceId") || "";
  const file = form.get("file");
  if (typeof activityId !== "string" || !activityId || activityId.length > 100 ||
      typeof sourceId !== "string" || sourceId.length > 80 ||
      (sourceId && !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sourceId))) throw new Error("Invalid attachment details.");
  if (typeof File === "undefined" || !(file instanceof File) || file.size === 0 || file.size > maxAttachmentBytes) throw new Error("Choose a file up to 8 MB.");
  const filename = file.name.trim();
  const invalidName = [...filename].some((char) => char === "/" || char.charCodeAt(0) === 92 || char.charCodeAt(0) < 32);
  if (filename.length > 200 || invalidName || !allowedExtensions.test(filename)) {
    throw new Error("Choose a supported PDF, image, text, Office or ZIP file.");
  }
  return { activityId, sourceId, file, filename };
}
