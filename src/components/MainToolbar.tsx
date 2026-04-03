import React from 'react';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  SyncOutlined,
  SettingOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Space, Typography, Tag } from 'antd';
import type { MenuProps } from 'antd';
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
  onWeChatConfig: () => void;
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
  onWeChatConfig,
  onOpenUrl,
  url,
}) => {
  const moreItems: MenuProps['items'] = [
    ...(selectedService?.id === 'wechat'
      ? [{ key: 'wx', label: '微信推送配置', onClick: onWeChatConfig }]
      : []),
  ];

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
          {selectedService && (
            <Dropdown menu={{ items: moreItems }} trigger={['click']}>
              <Button size="small" icon={<SettingOutlined />} />
            </Dropdown>
          )}
        </Space>
      </div>
    </header>
  );
};

export default MainToolbar;
