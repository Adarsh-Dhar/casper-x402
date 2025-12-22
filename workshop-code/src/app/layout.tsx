import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ConfigProvider } from 'antd';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Movement x402 Workshop',
  description: 'Pay-Per-Request APIs on Movement Network using x402 protocol',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#6366f1',
            },
          }}
        >
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}