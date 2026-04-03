import { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, message, Space, Typography, Alert } from 'antd';
import { SaveOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { api } from '../api/tauri';
import type { ServiceConfig } from '../types';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (serviceData: Omit<ServiceConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editService?: ServiceConfig | null;
}

const ServiceEditDialog: React.FC<Props> = ({ visible, onClose, onSave, editService }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editService) {
        form.setFieldsValue({
          name: editService.name,
          workingDir: editService.workingDir,
          command: editService.command,
          port: editService.port,
          urlTemplate: editService.urlTemplate || '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, editService, form]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const serviceData: Omit<ServiceConfig, 'id' | 'createdAt' | 'updatedAt'> = {
        name: values.name,
        workingDir: values.workingDir,
        command: values.command,
        port: values.port,
        urlTemplate: values.urlTemplate || undefined,
        enabled: true,
      };

      onSave(serviceData);
      onClose();
      form.resetFields();
    } catch (error: any) {
      message.error('提交失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const result = await api.selectDirectory();
      if (result.success && result.filePath) {
        form.setFieldValue('workingDir', result.filePath);
      } else if (result.canceled) {
        // ignore
      } else {
        message.error('选择目录失败: ' + (result.message || '未知错误'));
      }
    } catch (error: any) {
      message.error('选择目录异常: ' + error.message);
    }
  };

  return (
    <Modal
      title={editService ? '编辑任务' : '创建任务'}
      open={visible}
      onCancel={onClose}
      width={600}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} loading={loading}>
            {editService ? '保存修改' : '创建任务'}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert
          message={
            <Text type="secondary">
              {editService
                ? '修改任务配置后，需要重启任务才能生效。'
                : '创建新任务后，可以在任务列表中启动和管理。'}
            </Text>
          }
          type="info"
          showIcon
        />

        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
            tooltip="任务的显示名称"
          >
            <Input placeholder="例如: 数据库服务" />
          </Form.Item>

          <Form.Item
            name="workingDir"
            label={
              <Space>
                <span>工作目录</span>
                <Button type="link" size="small" icon={<FolderOpenOutlined />} onClick={handleSelectDirectory}>
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
            name="command"
            label="启动命令"
            rules={[{ required: true, message: '请输入启动命令' }]}
            tooltip="启动服务的命令，命令和参数用空格分隔"
          >
            <Input placeholder="python main.py" />
          </Form.Item>

          <Form.Item
            name="port"
            label="监听端口"
            rules={[{ required: true, message: '请输入端口号' }]}
            tooltip="服务监听的端口号，用于状态检测（脚本任务可填 0）"
          >
            <InputNumber min={0} max={65535} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="urlTemplate" label="访问地址模板" tooltip="可选，服务的访问地址，支持 {port} 占位符">
            <Input placeholder="http://localhost:{port}" />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
};

export default ServiceEditDialog;
