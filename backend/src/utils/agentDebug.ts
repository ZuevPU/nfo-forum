type DebugPayload = {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
};

export function sendAgentDebug(payload: DebugPayload): void {
  fetch('http://127.0.0.1:7843/ingest/d4c0971e-9897-4e1e-9faa-d063b5056602',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88e903'},body:JSON.stringify({sessionId:'88e903',runId:payload.runId,hypothesisId:payload.hypothesisId,location:payload.location,message:payload.message,data:payload.data,timestamp:Date.now()})}).catch(() => {});
}
