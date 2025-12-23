'use client';

import { ReactNode, useState, useEffect } from 'react';
import { ConfigProvider } from 'antd';

export function ClientLayout({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Always render ConfigProvider without CSPR.click wrapper to avoid SSR issues
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