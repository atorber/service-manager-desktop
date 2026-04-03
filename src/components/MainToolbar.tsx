import React from 'react';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  SyncOutlined,
  SettingOutlined,
  LinkOutlined,
  MoreOutlined,
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
  onServiceConfig: () => void;
  onWeChatConfig: () => void;
  onOpenUrl?: (url: string) => void;
  url?: string | null;
  onStartAll: () => void;
  onStopAll: () => void;
  onRestartAll: () => void;
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
  onServiceConfig,
  onWeChatConfig,
  onOpenUrl,
  url,
  onStartAll,
  onStopAll,
  onRestartAll,
}) => {
  const batchItems: MenuProps['items'] = [
    { key: 'all-start', label: '全部启动（后端+前端）', onClick: onStartAll },
    { key: 'all-stop', label: '全部停止', onClick: onStopAll },
    { key: 'all-restart', label: '全部重启', onClick: onRestartAll },
  ];

  const moreItems: MenuProps['items'] = [
    { key: 'cfg', label: '服务配置', icon: <SettingOutlined />, onClick: onServiceConfig },
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
          <Dropdown menu={{ items: batchItems }} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />}>
              全栈
            </Button>
          </Dropdown>
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
