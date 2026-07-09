/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKER_ENDPOINT?: string;
  readonly VITE_DEFAULT_MODEL?: string;
  readonly VITE_APP_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css?inline' {
  const css: string;
  export default css;
}
