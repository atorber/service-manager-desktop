import React, { useState, useEffect } from 'react';
import { Drawer, Button, Input, Checkbox, Space, Typography, message, Modal, Card } from 'antd';
import { CheckOutlined, ReloadOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import { api } from '../api/tauri';

const { Paragraph } = Typography;

interface ServiceState {
  wechat: { running: boolean; pid?: number; apiHealth?: boolean };
}

interface Props {
  serviceState: ServiceState;
  onStart: () => void;
  onStop: () => void;
  onRefresh: () => void;
  addLog: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  isOpen: boolean;
  onClose: () => void;
}

const WeChatBotControls: React.FC<Props> = ({
  serviceState,
  onStart,
  onStop,
  addLog,
  isOpen,
  onClose,
}) => {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('http://127.0.0.1:8888');

  useEffect(() => {
    if (serviceState.wechat.running) {
      loadPushConfig();
    }
  }, [serviceState.wechat.running]);

  const loadPushConfig = async () => {
    try {
      const result = await api.wechatBot.getPushConfig();
      if (result.success && result.config) {
        setPushEnabled(result.config.enabled || false);
        setCallbackUrl(result.config.callbackUrl || 'http://127.0.0.1:8888');
      }
    } catch {
      // ignore
    }
  };

  const handleSetPushConfig = async () => {
    try {
      const result = await api.wechatBot.setPushConfig(pushEnabled, callbackUrl);
      if (result.success) {
        message.success(result.message);
        addLog(result.message, 'success');
      } else {
        message.error(`设置失败: ${result.message || '未知错误'}`);
        addLog(`设置失败: ${result.message || '未知错误'}`, 'error');
      }
    } catch (error: any) {
      message.error(`设置推送配置异常: ${error.message}`);
      addLog(`设置推送配置异常: ${error.message}`, 'error');
    }
  };

  return (
    <Drawer title="微信机器人配置" placement="right" width={600} onClose={onClose} open={isOpen} destroyOnClose={false}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card size="small">
          <Space>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={onStart} disabled={serviceState.wechat.running}>
              启动微信机器人
            </Button>
            <Button
              danger
              icon={<StopOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '确认停止',
                  content: '确定要停止微信机器人吗？',
                  okText: '停止',
                  okType: 'danger',
                  cancelText: '取消',
                  onOk: () => onStop(),
                });
              }}
              disabled={!serviceState.wechat.running}
            >
              停止微信机器人
            </Button>
          </Space>
        </Card>

        {serviceState.wechat.running ? (
          <Card
            title={
              <Space>
                <span>⚙️</span>
                <span>消息推送配置</span>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Checkbox checked={pushEnabled} onChange={(e: any) => setPushEnabled(e.target.checked)}>
                启用消息推送
              </Checkbox>
              <Input
                value={callbackUrl}
                onChange={(e: any) => setCallbackUrl(e.target.value)}
                placeholder="回调地址 (例如: http://127.0.0.1:8888)"
                disabled={!pushEnabled}
              />
              <Space>
                <Button type="primary" icon={<CheckOutlined />} onClick={handleSetPushConfig}>
                  保存配置
                </Button>
                <Button icon={<ReloadOutlined />} onClick={loadPushConfig}>
                  刷新配置
                </Button>
              </Space>
              <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: 0 }}>
                当启用推送时，微信机器人会将消息推送到指定的回调地址。
              </Paragraph>
            </Space>
          </Card>
        ) : (
          <Card>
            <Paragraph type="secondary" style={{ textAlign: 'center', margin: 0 }}>
              请先启动微信机器人以配置消息推送功能
            </Paragraph>
          </Card>
        )}
      </Space>
    </Drawer>
  );
};

export default WeChatBotControls;
