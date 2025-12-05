/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ECHO_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    __ECHO_DOMAIN__?: string;
  }
}

export {};
