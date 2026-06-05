const API_URL = import.meta.env.VITE_API_URL || "";

let accessToken = localStorage.getItem("theo_access_token") || "";

export function setAccessToken(token) {
  accessToken = token || "";
  if (token) {
    localStorage.setItem("theo_access_token", token);
  } else {
    localStorage.removeItem("theo_access_token");
  }
}

export function getAccessToken() {
  return accessToken;
}

function toApiError(response, data, fallbackMessage = "Request failed") {
  const error = new Error(data.message || fallbackMessage);
  error.status = response.status;
  error.code = data.code || data.details?.code;
  error.details = data.details;
  return error;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    }
  });

  if (response.status === 401 && path !== "/api/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request(path, options);
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw toApiError(response, data);
  }

  return data;
}

export async function refreshSession() {
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    setAccessToken("");
    return null;
  }

  const data = await response.json();
  setAccessToken(data.accessToken);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" })
};

export async function streamMessage(conversationId, payload, onToken) {
  const response = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok || !response.body) {
    const error = await response.json().catch(() => ({}));
    throw toApiError(response, error, "Streaming failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let tokenCount = 0;

  function processFrame(frame) {
    const event = frame.includes("event: error") ? "error" : frame.includes("event: done") ? "done" : "message";
    const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
    if (!dataLine) return;

    const data = JSON.parse(dataLine.slice(6));
    if (event === "error") {
      throw new Error(data.message);
    }
    if (event === "message" && data.token) {
      tokenCount += 1;
      onToken(data.token);
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";

    for (const frame of frames) {
      processFrame(frame);
    }
  }

  if (buffer.trim()) {
    processFrame(buffer);
  }

  if (tokenCount === 0) {
    throw new Error("Theo did not receive a response from the model. Please try again.");
  }
}
