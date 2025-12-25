/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Typography, Space, Alert, Input, Descriptions } from 'antd';
import { KeyPairInfo, useCasperX402 } from '@/hooks/useCasperX402';

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
    fetchWithPayment,
    loadKeyPair, 
    clearError,
    csprToMotes,
    motesToCspr
  } = useCasperX402();

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

  // Fetch server info on component mount
  useEffect(() => {
    fetchServerInfo();
  }, []);

  const handleLoadKeyPair = async () => {
    try {
      const loadedKeyPair = await loadKeyPair(privateKeyInput);
      setKeyPair(loadedKeyPair);
      clearError();
    } catch (err) {
      // Error is handled in the hook
      console.error('Failed to load key pair:', err);
    }
  };

  const unlockContent = async () => {
    if (!keyPair) {
      return;
    }

    clearError();
    setContent('');

    try {
      // Use the loaded key pair to fetch premium content
      // This will trigger the 402 flow, sign the tx with the private key, and retry
      const response = await fetchWithPayment('/api/premium-content', keyPair);

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
          <Card title="Private Key Setup" className="shadow-lg">
             <Space orientation="vertical" className="w-full">
                <Paragraph>
                  Enter your private key (hex format) to sign transactions.
                  Supports both ED25519 and SECP256K1 key formats.
                </Paragraph>
                <TextArea
                  placeholder="Enter private key in hex format (64 characters, without 0x prefix)"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  rows={3}
                />
                <Button 
                  type="primary" 
                  onClick={handleLoadKeyPair}
                  disabled={!privateKeyInput.trim()}
                  loading={loading}
                  className="w-full"
                >
                  Load Key Pair
                </Button>
              </Space>
            
            {keyPair && (
              <div className="mt-4">
                <Alert
                  title="Key Pair Loaded"
                  description={
                    <div>
                      <div><strong>Public Key:</strong> {keyPair.publicKey}</div>
                      <div><strong>Account Hash:</strong> {keyPair.accountHash}</div>
                    </div>
                  }
                  type="success"
                  showIcon
                />
              </div>
            )}
          </Card>

          <Card title="Premium Content Access" className="shadow-lg">
            <Space orientation="vertical" className="w-full">
              <Paragraph>
                This premium content requires payment of <Text strong>1 CSPR</Text> ({csprToMotes(1)} motes) to unlock.
              </Paragraph>
              
              <Button
                type="primary"
                size="large"
                onClick={unlockContent}
                loading={loading}
                disabled={!keyPair}
                className="w-full"
              >
                {loading ? 'Processing Payment...' : 'Unlock Content (1 CSPR)'}
              </Button>

              {error && (
                <Alert title="Error" description={error} type="error" showIcon />
              )}

              {paymentData && (
                <Card className="bg-blue-50 border-blue-200">
                  <Title level={5} className="text-blue-800">✅ Real Transaction Submitted!</Title>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Deploy Hash">{paymentData.deploy_hash}</Descriptions.Item>
                    <Descriptions.Item label="Amount">
                      {paymentData.amount} motes ({motesToCspr(paymentData.amount).toFixed(1)} CSPR)
                    </Descriptions.Item>
                    <Descriptions.Item label="Recipient">{paymentData.recipient}</Descriptions.Item>
                    <Descriptions.Item label="Timestamp">
                      {new Date(paymentData.timestamp * 1000).toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Explorer">
                      <a 
                        href={`https://testnet.cspr.live/deploy/${paymentData.deploy_hash}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View on Casper Explorer →
                      </a>
                    </Descriptions.Item>
                  </Descriptions>
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <Text className="text-yellow-800 text-sm">
                      ⏳ <strong>Transaction submitted to Casper testnet!</strong><br/>
                      Balance will update automatically after blockchain confirmation (30-60 seconds).
                    </Text>
                  </div>
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
                <li>Client uses Private Key to create and sign Casper transfer deploy</li>
                <li>Client retries with signed deploy in X-Payment header</li>
                <li>Server verifies payment with Casper facilitator</li>
                <li>Facilitator validates signature and processes payment</li>
                <li>Server returns premium content after verification</li>
              </ol>
            </div>
            <div>
              <Title level={4}>Technical Stack</Title>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Frontend:</strong> Next.js with Casper JS SDK v5</li>
                <li><strong>Server:</strong> Express.js with x402 middleware</li>
                <li><strong>Facilitator:</strong> Rust-based Casper facilitator</li>
                <li><strong>Blockchain:</strong> Casper Testnet</li>
                <li><strong>Protocol:</strong> HTTP 402 Payment Required</li>
                <li><strong>Cryptography:</strong> ED25519 & SECP256K1 signatures</li>
              </ul>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}