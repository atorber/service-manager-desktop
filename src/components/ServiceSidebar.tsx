import React from 'react';
import { PlusOutlined, GlobalOutlined, WechatOutlined, FileTextOutlined, CloudServerOutlined } from '@ant-design/icons';
import type { ServiceConfig } from '../types';

export interface ServiceStateItem {
  running: boolean;
  pid?: number;
  port?: boolean;
  apiHealth?: boolean;
}

interface Props {
  services: ServiceConfig[];
  serviceState: Record<string, ServiceStateItem | undefined>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

function iconFor(id: string) {
  if (id === 'backend') return <CloudServerOutlined />;
  if (id === 'frontend') return <GlobalOutlined />;
  if (id === 'wechat') return <WechatOutlined />;
  return <FileTextOutlined />;
}

const ServiceSidebar: React.FC<Props> = ({
  services,
  serviceState,
  selectedId,
  onSelect,
  onCreate,
}) => {
  return (
    <aside className="sm-sidebar">
      <div className="sm-sidebar-head">
        <span className="sm-sidebar-title">服务</span>
        <button type="button" className="sm-icon-btn" title="新建任务" onClick={onCreate}>
          <PlusOutlined />
        </button>
      </div>
      <nav className="sm-sidebar-nav">
        {services.map((svc) => {
          const st = serviceState[svc.id];
          const running = st?.running ?? false;
          const active = selectedId === svc.id;
          return (
            <button
              key={svc.id}
              type="button"
              className={`sm-sidebar-item ${active ? 'sm-sidebar-item--active' : ''}`}
              onClick={() => onSelect(svc.id)}
            >
              <span className="sm-sidebar-item-icon">{iconFor(svc.id)}</span>
              <span className="sm-sidebar-item-label">{svc.name}</span>
              <span
                className={`sm-sidebar-dot ${running ? 'sm-sidebar-dot--on' : 'sm-sidebar-dot--off'}`}
                title={running ? '运行中' : '已停止'}
              />
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default ServiceSidebar;
