'use client';

import { useEffect } from 'react';

/**
 * Em modo dev, conecta ao WebSocket do servidor customizado e recarrega a página
 * quando algum arquivo (app, components, lib, public) é alterado.
 * Em produção não faz nada.
 */
export function DevAutoReload() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/_next/dev-reload`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'reload') {
              window.location.reload();
            }
          } catch {
            if (event.data === 'reload') window.location.reload();
          }
        };
        ws.onclose = () => {
          ws = null;
          reconnectTimeout = setTimeout(connect, 2000);
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        reconnectTimeout = setTimeout(connect, 2000);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, []);

  return null;
}
