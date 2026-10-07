import { useEffect, useRef } from 'react';

import { Modal } from 'antd';
import { useLocation } from 'react-router';

import { useAppSelector } from 'shared/store';

import { useGlobalModal } from '../lib';

export function GlobalModal() {
  const { closeModal } = useGlobalModal();
  const state = useAppSelector((s) => s.globalModal);
  const isOpen = Boolean(state.body);
  const { pathname } = useLocation();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (isOpen) closeModal();
    }
  }, [pathname, isOpen, closeModal]);

  const { body, title, closable = true, width = 'fit-content' } = state;

  return (
    <Modal
      open={isOpen}
      title={title}
      footer={null}
      closable={closable}
      width={width}
      onCancel={closeModal}
      destroyOnHidden
      centered
      styles={{
        body: {
          overflowY: 'auto',
          maxHeight: 'calc(100dvh - 150px)',
        },
      }}
    >
      {body}
    </Modal>
  );
}
