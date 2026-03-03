/**
 * Bulletproof PPTX download utility
 * Handles binary blob from create-download API → triggers browser download
 */

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/**
 * Extract filename from Content-Disposition header
 */
function getFilenameFromHeaders(headers: Record<string, string> = {}, fallback = 'presentation.pptx'): string {
  const disposition = headers['content-disposition'] || headers['Content-Disposition'];
  if (!disposition) return fallback;

  // Try filename*=UTF-8''encoded_name (RFC 5987)
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      // fall through
    }
  }

  // Try filename="name"
  const quotedMatch = disposition.match(/filename=["']([^"']+)["']/i);
  if (quotedMatch) return quotedMatch[1];

  // Try filename=name (unquoted)
  const unquotedMatch = disposition.match(/filename=([^;\s]+)/i);
  if (unquotedMatch) return unquotedMatch[1].trim();

  return fallback;
}

/**
 * Trigger browser download of a Blob as PPTX file
 */
export function triggerPptxDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup - delay slightly so download starts before revoke
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Process axios response with responseType: 'blob'
 * Returns { success, filename, errorMessage }
 */
export async function processPptxResponse(
  data: Blob,
  headers: Record<string, string>,
  status: number,
  fallbackFilename = 'presentation.pptx'
): Promise<{ success: boolean; filename?: string; errorMessage?: string }> {
  const contentType = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();

  // Server returned JSON (error) disguised as blob
  if (contentType.includes('application/json') || status >= 400) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return { success: false, errorMessage: parsed.message || parsed.error || 'Request failed' };
    } catch {
      return { success: false, errorMessage: `Request failed (HTTP ${status})` };
    }
  }

  // Validate we got actual binary (PPTX is a ZIP, starts with PK)
  if (data.size < 100) {
    return { success: false, errorMessage: 'Received empty or invalid file' };
  }

  const filename = getFilenameFromHeaders(headers, fallbackFilename);
  const blob = new Blob([data], { type: PPTX_MIME });
  triggerPptxDownload(blob, filename);

  return { success: true, filename };
}
