'use client';

import { ReactNode } from 'react';
import { ConfigProvider } from 'antd';

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366f1',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
