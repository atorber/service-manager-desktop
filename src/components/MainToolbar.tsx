import React from 'react';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  SyncOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { Button, Space, Typography, Tag } from 'antd';
import type { ServiceConfig } from '../types';

interface Props {
  title: string;
  subtitle?: string;
  selectedService: ServiceConfig | null;
  running: boolean;
  canRestart: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onRefresh: () => void;
  onOpenLogsDir: () => void;
  onOpenUrl?: (url: string) => void;
  url?: string | null;
}

const MainToolbar: React.FC<Props> = ({
  title,
  subtitle,
  selectedService,
  running,
  canRestart,
  onStart,
  onStop,
  onRestart,
  onRefresh,
  onOpenLogsDir,
  onOpenUrl,
  url,
}) => {
  return (
    <header className="sm-toolbar">
      <div className="sm-toolbar-left">
        <Typography.Text strong className="sm-toolbar-title">
          {title}
        </Typography.Text>
        {subtitle && (
          <Tag className="sm-toolbar-tag" color="default">
            {subtitle}
          </Tag>
        )}
        {url && running && (
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => onOpenUrl?.(url)}
          >
            打开
          </Button>
        )}
      </div>
      <div className="sm-toolbar-right">
        <Space size={4} wrap>
          {selectedService && (
            <>
              <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={onStart} disabled={running}>
                启动
              </Button>
              <Button size="small" danger icon={<StopOutlined />} onClick={onStop} disabled={!running}>
                停止
              </Button>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={onRestart}
                disabled={!running || !canRestart}
              >
                重启
              </Button>
            </>
          )}
          <Button size="small" icon={<SyncOutlined />} onClick={onRefresh}>
            刷新
          </Button>
          <Button size="small" icon={<FolderOpenOutlined />} onClick={onOpenLogsDir}>
            日志目录
          </Button>
        </Space>
      </div>
    </header>
  );
};

export default MainToolbar;
