'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Typography, Space, Alert, Input, Tabs, Descriptions } from 'antd';
import { useCasperX402 } from '@/hooks/useCasperX402';
import useCsprClick from '@/hooks/useCsprClick';
import type { KeyPairInfo } from '@/services/casperClient';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

export default function Home() {
  const [content, setContent] = useState<string>('');
  const [keyPair, setKeyPair] = useState<KeyPairInfo | null>(null);
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [walletDebug, setWalletDebug] = useState<any>(null);
  
  const { 
    loading, 
    error, 
    paymentData, 
    balance, 
    activeAccount,
    fetchWithPayment,
    fetchWithWalletPayment, 
    generateKeyPair, 
    loadKeyPair, 
    getBalance, 
    clearError 
  } = useCasperX402();

  const { connectWallet, disconnectWallet, isClient, csprClickReady } = useCsprClick();

  // Debug wallet detection
  useEffect(() => {
    if (isClient && csprClickReady) {
      const debug = {
        CasperWalletProvider: !!(window as any).CasperWalletProvider,
        casperlabsSigner: !!(window as any).casperlabsSigner,
        csprclick: !!(window as any).csprclick,
        windowKeys: typeof window !== 'undefined' ? Object.keys(window).filter(key => key.toLowerCase().includes('casper')) : []
      };
      setWalletDebug(debug);
      console.log('Wallet Debug Info:', debug);
    }
  }, [isClient, csprClickReady]);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
    } finally {
      setIsConnecting(false);
    }
  };

  // Fetch server info on component mount
  useEffect(() => {
    fetchServerInfo();
  }, []);

  // Update balance when activeAccount changes
  useEffect(() => {
    if (activeAccount) {
      getBalance(activeAccount.public_key);
    }
  }, [activeAccount, getBalance]);

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

  const unlockContentWithWallet = async () => {
    if (!activeAccount) {
      return;
    }

    clearError();
    setContent('');

    try {
      console.log('Attempting to unlock content with wallet:', activeAccount.public_key);
      const response = await fetchWithWalletPayment('/api/premium-content');

      if (response.ok) {
        const data = await response.json();
        setContent(data.content || data.message);
        console.log('Content unlocked successfully');
      } else {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          console.error('Server error response:', errorData);
          
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.details) {
            errorMessage = errorData.details;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        }
        
        // Set the error to be displayed in the UI
        console.error('Failed to unlock content:', errorMessage);
        // The error will be set by the fetchWithWalletPayment function
      }
    } catch (err) {
      console.error('Error unlocking content:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Detailed error:', errorMessage);
      // The error will be set by the fetchWithWalletPayment function
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
      label: 'Connect Wallet',
      children: (
        <Space orientation="vertical" className="w-full">
          <Paragraph>
            Connect your Casper wallet using CSPR.click to sign transactions securely.
            Use any supported Casper wallet extension (Casper Wallet, Casper Signer, etc.).
          </Paragraph>
          {activeAccount ? (
            <div>
              <Alert
                title="Wallet Connected"
                description={
                  <div>
                    <div><strong>Public Key:</strong> {activeAccount.public_key}</div>
                    <div><strong>Account Hash:</strong> {activeAccount.account_hash}</div>
                    <div><strong>Balance:</strong> {balance} motes</div>
                  </div>
                }
                type="success"
                showIcon
              />
              <Button 
                type="default" 
                onClick={disconnectWallet} 
                className="w-full mt-4"
              >
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <div>
              <Alert
                title="No Wallet Connected"
                description={
                  csprClickReady 
                    ? "Click below to connect your Casper wallet. If you have Casper Wallet or Casper Signer installed, it will connect directly. Otherwise, a development wallet will be used for testing."
                    : "CSPR.click is loading... Please wait for the connection interface to be ready."
                }
                type="warning"
                showIcon
              />
              <Button 
                type="primary" 
                onClick={handleConnectWallet} 
                disabled={!csprClickReady || isConnecting}
                loading={isConnecting}
                className="w-full mt-4"
              >
                {isConnecting ? "Connecting..." : csprClickReady ? "Connect Wallet" : "Loading CSPR.click..."}
              </Button>
              <Button 
                type="default" 
                onClick={() => window.location.reload()} 
                className="w-full mt-2"
                size="small"
              >
                Refresh Page to Detect Wallet
              </Button>
              
              {walletDebug && (
                <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                  <div><strong>Wallet Detection Debug:</strong></div>
                  <div>CasperWalletProvider: {walletDebug.CasperWalletProvider ? '✅' : '❌'}</div>
                  <div>casperlabsSigner: {walletDebug.casperlabsSigner ? '✅' : '❌'}</div>
                  <div>csprclick: {walletDebug.csprclick ? '✅' : '❌'}</div>
                  <div>Casper window keys: {walletDebug.windowKeys?.join(', ') || 'none'}</div>
                </div>
              )}
            </div>
          )}
        </Space>
      ),
    },
    {
      key: '2',
      label: 'Generate New Keys',
      children: (
        <Space orientation="vertical" className="w-full">
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
      key: '3',
      label: 'Load Existing Keys',
      children: (
        <Space orientation="vertical" className="w-full">
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
        {/* CSPR.click Status */}
        {isClient && !csprClickReady && (
          <div className="h-12 bg-blue-100 border border-blue-300 rounded mb-4 flex items-center justify-center">
            <span className="text-blue-700">Loading CSPR.click...</span>
          </div>
        )}
        {isClient && csprClickReady && (
          <div className="h-12 bg-green-100 border border-green-300 rounded mb-4 flex items-center justify-center">
            <span className="text-green-700">✅ CSPR.click Ready - Connect your wallet below</span>
          </div>
        )}
        
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
                  title="Key Pair Loaded"
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
            <Space orientation="vertical" className="w-full">
              <Paragraph>
                This premium content requires payment of <Text strong>1 CSPR</Text> to unlock.
                You can use either a connected wallet or manual keys.
              </Paragraph>
              
              {activeAccount && (
                <Button
                  type="primary"
                  size="large"
                  onClick={unlockContentWithWallet}
                  loading={loading}
                  className="w-full mb-4"
                >
                  {loading ? 'Processing Payment...' : 'Unlock with Wallet (1 CSPR)'}
                </Button>
              )}
              
              <Button
                type={activeAccount ? "default" : "primary"}
                size="large"
                onClick={unlockContent}
                loading={loading}
                disabled={!keyPair}
                className="w-full"
              >
                {loading ? 'Processing Payment...' : 'Unlock with Manual Keys (1 CSPR)'}
              </Button>

              {error && (
                <Alert title="Error" description={error} type="error" showIcon />
              )}

              {paymentData && (
                <Card className="bg-blue-50 border-blue-200">
                  <Title level={5} className="text-blue-800">✅ Real Transaction Submitted!</Title>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Deploy Hash">{paymentData.deploy_hash}</Descriptions.Item>
                    <Descriptions.Item label="Amount">{paymentData.amount} motes ({(parseInt(paymentData.amount) / 1000000000).toFixed(1)} CSPR)</Descriptions.Item>
                    <Descriptions.Item label="Recipient">{paymentData.recipient}</Descriptions.Item>
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

        <Card className="mt-6 shadow-lg" title="Workshop Status - Real Casper Transactions">
          <Alert
            title="✅ Real Casper Transactions Active"
            description={
              <div>
                <p><strong>Current Status:</strong> This workshop is now configured for REAL Casper testnet transactions.</p>
                <br />
                <p><strong>What's Working:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  <li>✅ Real wallet connection with your actual Casper account</li>
                  <li>✅ Real balance display (5,000 CSPR from testnet)</li>
                  <li>✅ Real transaction submission to Casper testnet</li>
                  <li>✅ Real CSPR transfers (1 CSPR per content unlock)</li>
                  <li>✅ Real blockchain confirmation and explorer links</li>
                  <li>✅ Automatic balance refresh after confirmation</li>
                </ul>
                <br />
                <p><strong>Important Notes:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  <li>💰 Each content unlock costs <strong>1 CSPR</strong> from your real balance</li>
                  <li>⏳ Balance updates after blockchain confirmation (30-60 seconds)</li>
                  <li>🔗 All transactions are viewable on <a href="https://testnet.cspr.live" target="_blank" rel="noopener noreferrer" className="text-blue-600">testnet.cspr.live</a></li>
                  <li>🔒 Your private keys remain secure in your wallet</li>
                </ul>
                <br />
                <p><strong>Account Details:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  <li>📍 Network: Casper Testnet</li>
                  <li>🔑 Your Public Key: 0202c9bda7c0da47cf0bbcd9972f8f40be72a81fa146df672c60595ca1807627403e</li>
                  <li>💰 Starting Balance: 5,000 CSPR</li>
                  <li>📤 Recipient: 02037a9634b3d340f3ea6f7403f95d9698b23fca03623ac94b619a96898b897b0dad</li>
                </ul>
              </div>
            }
            type="success"
            showIcon
          />
        </Card>
      </div>
    </div>
  );
}