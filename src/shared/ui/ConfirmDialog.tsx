import { Button, Modal } from 'antd';

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Отмена',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      width={420}
      destroyOnHidden
      title={title}
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">{description}</p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button size="large" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button size="large" type="primary" danger={danger} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
