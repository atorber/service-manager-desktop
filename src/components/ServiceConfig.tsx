import { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, message, Tabs, Space, Typography, Alert } from 'antd';
import { SaveOutlined, ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { api } from '../api/tauri';
import type { ServicesConfig, ServiceConfig } from '../types';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
  initialServiceId?: string | null;
}

const ServiceConfigDialog: React.FC<Props> = ({ visible, onClose, onSave, initialServiceId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ServicesConfig | null>(null);

  const loadConfig = async () => {
    if (!visible) return;

    try {
      const result = await api.config.getAll();
      if (result.success && result.data) {
        setConfig(result.data as ServicesConfig);
        const services = (result.data as ServicesConfig).services || {};
        Object.keys(services).forEach((serviceId) => {
          const service = services[serviceId];
          if (service) {
            form.setFieldsValue({
              [`${serviceId}-workingDir`]: service.workingDir,
              [`${serviceId}-command`]: service.command,
              [`${serviceId}-port`]: service.port,
              [`${serviceId}-urlTemplate`]: service.urlTemplate || '',
            });
          }
        });
      } else {
        message.error('加载配置失败: ' + (result.message || '未知错误'));
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || '未知错误';
      message.error(`加载配置异常: ${errorMsg}`);
      console.error('加载配置异常:', error);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      if (initialServiceId) {
        const updates = {
          workingDir: values[`${initialServiceId}-workingDir`],
          command: values[`${initialServiceId}-command`],
          port: values[`${initialServiceId}-port`],
          urlTemplate: values[`${initialServiceId}-urlTemplate`] || undefined,
        };

        const result = await api.config.updateService(initialServiceId, updates);
        if (result.success) {
          const serviceName = config?.services?.[initialServiceId]?.name || initialServiceId;
          message.success(`${serviceName} 配置已保存，重启服务后生效`);
          onSave?.();
          onClose();
        } else {
          message.error(`配置保存失败: ${result.message || '未知错误'}`);
        }
      } else {
        const serviceIds: Array<'backend' | 'frontend' | 'wechat'> = ['backend', 'frontend', 'wechat'];
        let allSuccess = true;

        for (const serviceId of serviceIds) {
          const updates = {
            workingDir: values[`${serviceId}-workingDir`],
            command: values[`${serviceId}-command`],
            port: values[`${serviceId}-port`],
            urlTemplate: values[`${serviceId}-urlTemplate`] || undefined,
          };

          const result = await api.config.updateService(serviceId, updates);
          if (!result.success) {
            allSuccess = false;
            const serviceName = config?.services?.[serviceId]?.name || serviceId;
            message.error(`${serviceName}配置保存失败: ${result.message || '未知错误'}`);
          }
        }

        if (allSuccess) {
          message.success('配置已保存，重启服务后生效');
          onSave?.();
          onClose();
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || '未知错误';
      message.error(`保存配置失败: ${errorMsg}`);
      console.error('保存配置异常:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetDefaults = async () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要重置所有服务配置为默认值吗？此操作不可撤销。',
      onOk: async () => {
        try {
          setLoading(true);
          const result = await api.config.resetDefaults();
          if (result.success) {
            message.success('配置已重置为默认值');
            await loadConfig();
          } else {
            message.error('重置配置失败: ' + result.message);
          }
        } catch (error: any) {
          message.error('重置配置异常: ' + error.message);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  useEffect(() => {
    loadConfig();
  }, [visible]);

  const handleSelectDirectory = async (serviceId: string) => {
    try {
      const result = await api.selectDirectory();
      if (result.success && result.filePath) {
        form.setFieldValue(`${serviceId}-workingDir`, result.filePath);
      } else if (result.canceled) {
        // ignore
      } else {
        message.error('选择目录失败: ' + (result.message || '未知错误'));
      }
    } catch (error: any) {
      message.error('选择目录异常: ' + error.message);
    }
  };

  const serviceItems = [
    {
      key: 'backend',
      label: '后端服务',
      children: renderServiceForm('backend', config?.services?.backend),
    },
    {
      key: 'frontend',
      label: '前端服务',
      children: renderServiceForm('frontend', config?.services?.frontend),
    },
    {
      key: 'wechat',
      label: '微信机器人',
      children: renderServiceForm('wechat', config?.services?.wechat),
    },
  ];

  function renderServiceForm(serviceId: string, service?: ServiceConfig) {
    return (
      <div key={serviceId} style={{ maxWidth: 600 }}>
        <Form.Item
          name={`${serviceId}-workingDir`}
          label={
            <Space>
              <span>工作目录</span>
              <Button
                type="link"
                size="small"
                icon={<FolderOpenOutlined />}
                onClick={() => handleSelectDirectory(serviceId)}
              >
                选择目录
              </Button>
            </Space>
          }
          rules={[{ required: true, message: '请输入工作目录' }]}
          tooltip="服务启动时的工作目录，支持 {rootDir} 占位符"
        >
          <Input placeholder="{rootDir}/app" />
        </Form.Item>

        <Form.Item
          name={`${serviceId}-command`}
          label="启动命令"
          rules={[{ required: true, message: '请输入启动命令' }]}
          tooltip="启动服务的命令，命令和参数用空格分隔"
        >
          <Input placeholder="python main.py" />
        </Form.Item>

        <Form.Item
          name={`${serviceId}-port`}
          label="监听端口"
          rules={[{ required: true, message: '请输入端口号' }]}
          tooltip="服务监听的端口号，用于状态检测"
        >
          <InputNumber min={0} max={65535} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name={`${serviceId}-urlTemplate`}
          label="访问地址模板"
          tooltip="可选，服务的访问地址，支持 {port} 占位符"
        >
          <Input placeholder="http://localhost:{port}" />
        </Form.Item>

        {service && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">
              当前配置: 工作目录={service.workingDir}, 命令={service.command}, 端口={service.port}
            </Text>
          </div>
        )}
      </div>
    );
  }

  return (
    <Modal
      title={initialServiceId ? `${config?.services?.[initialServiceId]?.name || initialServiceId} 配置` : '服务配置'}
      open={visible}
      onCancel={onClose}
      width={800}
      footer={
        <Space>
          {!initialServiceId && (
            <Button icon={<ReloadOutlined />} onClick={resetDefaults} loading={loading}>
              重置默认
            </Button>
          )}
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={saveConfig} loading={loading}>
            保存配置
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert
          message="修改配置后，需要重启相应服务才能生效。工作目录支持使用 {rootDir} 占位符表示项目根目录。"
          type="warning"
          showIcon
        />

        <Form form={form} layout="vertical">
          {initialServiceId ? (
            renderServiceForm(initialServiceId, config?.services?.[initialServiceId])
          ) : (
            <Tabs defaultActiveKey="backend" items={serviceItems} />
          )}
        </Form>
      </Space>
    </Modal>
  );
};

export default ServiceConfigDialog;
