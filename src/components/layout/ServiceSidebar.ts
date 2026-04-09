export interface ServiceStateItem {
  running: boolean;
  pid?: number;
  port?: boolean;
  apiHealth?: boolean;
}
