import { useEffect } from 'react';
import { Modal, Form, Input, Button, message, Space, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import type { ServiceConfig } from '../types';

const { Text } = Typography;

const DEFAULT_WORKING_DIR = '{rootDir}';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (serviceData: Omit<ServiceConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editService?: ServiceConfig | null;
}

const ServiceEditDialog: React.FC<Props> = ({ visible, onClose, onSave, editService }) => {
  const [form] = Form.useForm();
  const commandWatch = Form.useWatch('command', form) as string | undefined;

  useEffect(() => {
    if (visible) {
      if (editService) {
        form.setFieldsValue({
          name: editService.name,
          command: editService.command,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, editService, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editService) {
        const serviceData: Omit<ServiceConfig, 'id' | 'createdAt' | 'updatedAt'> = {
          name: values.name,
          command: values.command,
          workingDir: editService.workingDir || DEFAULT_WORKING_DIR,
          port: editService.port,
          urlTemplate: editService.urlTemplate,
          enabled: editService.enabled ?? true,
        };
        onSave(serviceData);
      } else {
        const serviceData: Omit<ServiceConfig, 'id' | 'createdAt' | 'updatedAt'> = {
          name: values.name,
          command: values.command,
          workingDir: DEFAULT_WORKING_DIR,
          port: 0,
          enabled: true,
        };
        onSave(serviceData);
      }

      onClose();
      form.resetFields();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error('提交失败: ' + error.message);
    }
  };

  const fullCommandPreview = (() => {
    const cmd = (commandWatch ?? '').trim();
    return cmd || '（未输入）';
  })();

  return (
    <Modal
      title={editService ? '编辑任务' : '创建任务'}
      open={visible}
      onCancel={onClose}
      width={760}
      className="sm-task-modal"
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit}>
            {editService ? '保存修改' : '创建任务'}
          </Button>
        </Space>
      }
    >
      <div className="sm-task-edit-layout">
        <div className="sm-task-edit-form">
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            {editService
              ? '仅名称与启动命令可在此修改；工作目录与端口等保持原配置。'
              : '只需填写名称与启动命令；工作目录默认为项目根目录，端口为 0（脚本任务，不做端口探测）。'}
          </Text>

          <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item
              name="name"
              label="任务名称"
              rules={[{ required: true, message: '请输入任务名称' }]}
            >
              <Input placeholder="例如：本地 API" allowClear />
            </Form.Item>

            <Form.Item
              name="command"
              label="启动命令"
              rules={[{ required: true, message: '请输入启动命令' }]}
            >
              <Input.TextArea
                placeholder="例如：python main.py 或 npm run dev"
                rows={6}
                autoSize={{ minRows: 6, maxRows: 14 }}
              />
            </Form.Item>
          </Form>
        </div>

        <aside className="sm-task-preview-pane" aria-label="启动命令预览">
          <div className="sm-task-preview-head">启动命令</div>
          <pre className="sm-task-preview-body">{fullCommandPreview}</pre>
        </aside>
      </div>
    </Modal>
  );
};

export default ServiceEditDialog;
