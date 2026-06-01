export interface GlobalSettings {
  proxy?: {
    enabled: boolean;
    url: string; // e.g., http://127.0.0.1:7890
  };
}

const DEFAULT_SETTINGS: GlobalSettings = {
  proxy: {
    enabled: false,
    url: 'http://127.0.0.1:7890',
  },
};

export { DEFAULT_SETTINGS };
