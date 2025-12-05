/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ECHO_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
