import type { Response } from "express";

const clients = new Set<Response>();

export function addSseClient(res: Response): void {
  clients.add(res);
}

export function removeSseClient(res: Response): void {
  clients.delete(res);
}

export function notifyUserLogin(payload: { name: string; email: string }): void {
  const data = JSON.stringify(payload);
  for (const res of clients) {
    try {
      res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}
