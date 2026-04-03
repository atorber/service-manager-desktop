import React from 'react';
import { Drawer, Button, Empty, Typography, Space, Alert } from 'antd';
import { ClearOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  serviceId: string;
  serviceLogs: Record<string, LogEntry[]>;
  onClear?: (serviceId: string) => void;
}

const SERVICE_NAMES: Record<string, string> = {
  backend: '后端服务',
  frontend: '前端服务',
  wechat: '微信机器人',
};

const ServiceLogDrawer: React.FC<Props> = ({ visible, onClose, serviceId, serviceLogs, onClear }) => {
  const logs = serviceLogs[serviceId] || [];

  const getLogAlertType = (type: string): 'success' | 'info' | 'warning' | 'error' => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  return (
    <Drawer
      title={`${SERVICE_NAMES[serviceId] || serviceId} - 操作日志`}
      placement="right"
      width={600}
      open={visible}
      onClose={onClose}
      extra={
        onClear && logs.length > 0 ? (
          <Button icon={<ClearOutlined />} onClick={() => onClear(serviceId)} danger size="small">
            清空日志
          </Button>
        ) : null
      }
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {logs.length === 0 ? (
          <Empty
            description={<Text type="secondary">暂无日志记录</Text>}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          logs.map((log, index) => (
            <Alert
              key={index}
              message={
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {log.timestamp}
                  </Text>
                  <Text strong style={{ fontSize: 11 }}>
                    [{log.type.toUpperCase()}]
                  </Text>
                  <Text style={{ wordBreak: 'break-all' }}>{log.message}</Text>
                </Space>
              }
              type={getLogAlertType(log.type)}
              showIcon={false}
              style={{
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            />
          ))
        )}
      </Space>
    </Drawer>
  );
};

export default ServiceLogDrawer;
