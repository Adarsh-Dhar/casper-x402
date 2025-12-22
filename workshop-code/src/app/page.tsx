'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Typography, Space, Alert, Input, Tabs, Descriptions } from 'antd';
import { useCasperX402 } from '@/hooks/useCasperX402';
import type { KeyPairInfo } from '@/services/casperClient';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

export default function Home() {
  const [content, setContent] = useState<string>('');
  const [keyPair, setKeyPair] = useState<KeyPairInfo | null>(null);
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [serverInfo, setServerInfo] = useState<any>(null);
  
  const { 
    loading, 
    error, 
    paymentData, 
    balance, 
    fetchWithPayment, 
    generateKeyPair, 
    loadKeyPair, 
    getBalance, 
    clearError 
  } = useCasperX402();

  // Fetch server info on component mount
  useEffect(() => {
    fetchServerInfo();
  }, []);

  // Update balance when keyPair changes
  useEffect(() => {
    if (keyPair) {
      getBalance(keyPair.publicKey);
    }
  }, [keyPair, getBalance]);

  const fetchServerInfo = async () => {
    try {
      const response = await fetch('/api/info');
      if (response.ok) {
        const info = await response.json();
        setServerInfo(info);
      }
    } catch (err) {
      console.error('Failed to fetch server info:', err);
    }
  };

  const handleGenerateKeyPair = () => {
    const newKeyPair = generateKeyPair();
    setKeyPair(newKeyPair);
    setPrivateKeyInput(newKeyPair.privateKey);
    clearError();
  };

  const handleLoadKeyPair = () => {
    try {
      const loadedKeyPair = loadKeyPair(privateKeyInput);
      setKeyPair(loadedKeyPair);
      clearError();
    } catch (err) {
      // Error is handled in the hook
    }
  };

  const unlockContent = async () => {
    if (!keyPair) {
      return;
    }

    clearError();
    setContent('');

    try {
      const response = await fetchWithPayment('/api/premium-content');

      if (response.ok) {
        const data = await response.json();
        setContent(data.content || data.message);
      } else {
        const errorData = await response.json();
        console.error('Failed to unlock content:', errorData);
      }
    } catch (err) {
      console.error('Error unlocking content:', err);
    }
  };

  const tabItems = [
    {
      key: '1',
      label: 'Generate New Keys',
      children: (
        <Space direction="vertical" className="w-full">
          <Paragraph>
            Generate a new Casper key pair for testing. This creates a random private/public key pair.
          </Paragraph>
          <Button type="primary" onClick={handleGenerateKeyPair} className="w-full">
            Generate New Key Pair
          </Button>
        </Space>
      ),
    },
    {
      key: '2',
      label: 'Load Existing Keys',
      children: (
        <Space direction="vertical" className="w-full">
          <Paragraph>
            Load an existing key pair by entering your private key (hex format).
          </Paragraph>
          <TextArea
            placeholder="Enter private key in hex format (64 characters)"
            value={privateKeyInput}
            onChange={(e) => setPrivateKeyInput(e.target.value)}
            rows={3}
          />
          <Button 
            type="primary" 
            onClick={handleLoadKeyPair}
            disabled={!privateKeyInput.trim()}
            className="w-full"
          >
            Load Key Pair
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Title level={1} className="text-indigo-900">
            Casper x402 Workshop
          </Title>
          <Paragraph className="text-lg text-gray-600">
            Pay-Per-Request APIs on Casper Network using x402 Protocol
          </Paragraph>
        </div>

        {serverInfo && (
          <Card className="mb-6 shadow-lg" title="Server Information">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Network">{serverInfo.network}</Descriptions.Item>
              <Descriptions.Item label="Contract Hash">{serverInfo.contract_hash}</Descriptions.Item>
              <Descriptions.Item label="Facilitator URL">{serverInfo.facilitator_url}</Descriptions.Item>
              <Descriptions.Item label="Supported Tokens">{serverInfo.supported_tokens?.join(', ') || 'CSPR'}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Casper Wallet Setup" className="shadow-lg">
            <Tabs items={tabItems} />
            
            {keyPair && (
              <div className="mt-4">
                <Alert
                  message="Key Pair Loaded"
                  description={
                    <div>
                      <div><strong>Public Key:</strong> {keyPair.publicKey}</div>
                      <div><strong>Account Hash:</strong> {keyPair.accountHash}</div>
                      <div><strong>Balance:</strong> {balance} motes</div>
                    </div>
                  }
                  type="success"
                  showIcon
                />
              </div>
            )}
          </Card>

          <Card title="Premium Content Access" className="shadow-lg">
            <Space direction="vertical" className="w-full">
              <Paragraph>
                This premium content requires payment of <Text strong>1 CSPR</Text> to unlock.
                Set up your Casper keys and click the button below to access it.
              </Paragraph>
              
              <Button
                type="primary"
                size="large"
                onClick={unlockContent}
                loading={loading}
                disabled={!keyPair}
                className="w-full"
              >
                {loading ? 'Processing Payment...' : 'Unlock Premium Content (1 CSPR)'}
              </Button>

              {error && (
                <Alert message="Error" description={error} type="error" showIcon />
              )}

              {paymentData && (
                <Card className="bg-blue-50 border-blue-200">
                  <Title level={5} className="text-blue-800">Payment Transaction Created</Title>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Deploy Hash">{paymentData.deploy_hash}</Descriptions.Item>
                    <Descriptions.Item label="Amount">{paymentData.amount} motes</Descriptions.Item>
                    <Descriptions.Item label="Recipient">{paymentData.recipient}</Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {content && (
                <Card className="bg-green-50 border-green-200">
                  <Title level={4} className="text-green-800">
                    🎉 Premium Content Unlocked!
                  </Title>
                  <Paragraph className="text-green-700 whitespace-pre-line">
                    {content}
                  </Paragraph>
                </Card>
              )}
            </Space>
          </Card>
        </div>

        <Card className="mt-8 shadow-lg" title="How the Casper x402 Integration Works">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Title level={4}>Payment Flow</Title>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Client requests premium content from Next.js API</li>
                <li>API proxies request to Express server</li>
                <li>Server returns HTTP 402 with Casper payment requirements</li>
                <li>Client creates and signs Casper transfer deploy</li>
                <li>Client retries with signed deploy in X-Payment header</li>
                <li>Server verifies payment with Casper facilitator</li>
                <li>Facilitator validates signature and processes payment</li>
                <li>Server returns premium content after verification</li>
              </ol>
            </div>
            <div>
              <Title level={4}>Technical Stack</Title>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Frontend:</strong> Next.js with Casper JS SDK</li>
                <li><strong>Server:</strong> Express.js with x402 middleware</li>
                <li><strong>Facilitator:</strong> Rust-based Casper facilitator</li>
                <li><strong>Blockchain:</strong> Casper Network</li>
                <li><strong>Protocol:</strong> x402 Payment Required</li>
                <li><strong>Cryptography:</strong> Ed25519 signatures</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="mt-6 shadow-lg" title="Workshop Notes">
          <Alert
            message="Development Environment"
            description="This workshop connects to a local Casper test network and facilitator. In production, you would connect to Casper mainnet and use real CSPR tokens."
            type="info"
            showIcon
          />
        </Card>
      </div>
    </div>
  );
}