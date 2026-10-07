import { Alert, Button } from 'antd';

type Props = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function ErrorState({
  title = 'Не удалось загрузить данные',
  message,
  onRetry,
  retrying,
}: Props) {
  return (
    <Alert
      type="error"
      showIcon
      title={title}
      description={message}
      action={
        onRetry && (
          <Button size="small" onClick={onRetry} loading={retrying}>
            Повторить
          </Button>
        )
      }
    />
  );
}
