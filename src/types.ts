export interface ServiceConfig {
  id: string;
  name: string;
  workingDir: string;
  command: string;
  port: number;
  urlTemplate?: string;
  enabled?: boolean;
  isPreset?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServicesConfig {
  services: Record<string, ServiceConfig>;
}
