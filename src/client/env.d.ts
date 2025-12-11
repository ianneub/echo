/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONSOLE_DOMAIN: string;
  readonly VITE_INSPECT_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    __CONSOLE_DOMAIN__?: string;
    __INSPECT_DOMAIN__?: string;
  }
}

export {};
