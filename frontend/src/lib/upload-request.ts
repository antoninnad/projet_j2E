export type UploadProgress = (percent: number | null) => void

export type Fetcher = (url: string, init: RequestInit, onProgress?: UploadProgress) => Promise<Response>

export const fetchWithUpload: Fetcher = (url, init, onProgress) => {
  const { body, signal } = init
  if (!onProgress || !(body instanceof FormData)) return fetch(url, init)

  return new Promise((resolve, reject) => {
    signal?.throwIfAborted()
    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()

    // Fetch does not expose upload progress.
    xhr.upload.onprogress = ({ lengthComputable, loaded, total }) => {
      onProgress(lengthComputable && total ? Math.floor(loaded * 100 / total) : null)
    }
    xhr.onload = () => {
      const { status } = xhr
      if (!status) {
        reject(new Error("Upload failed"))
        return
      }
      const contentType = xhr.getResponseHeader("Content-Type")
      const responseBody = [204, 205, 304].includes(status) ? null : xhr.responseText
      resolve(new Response(responseBody, {
        status,
        headers: contentType ? { "Content-Type": contentType } : undefined,
      }))
    }
    xhr.onerror = () => reject(new Error("Upload failed"))
    xhr.onabort = () => reject(signal?.reason ?? new DOMException("Upload aborted", "AbortError"))
    xhr.onloadend = () => signal?.removeEventListener("abort", abort)

    xhr.open(init.method ?? "POST", url)
    new Headers(init.headers).forEach((value, name) => xhr.setRequestHeader(name, value))
    signal?.addEventListener("abort", abort, { once: true })
    xhr.send(body)
  })
}
