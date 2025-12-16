import React, { useState } from 'react';
import styled from 'styled-components';
import { ClickUI } from '@make-software/csprclick-ui';
import { useX402 } from '../hooks/useX402';

const DemoContainer = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 1rem;
  text-align: center;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 2rem;
  text-align: center;
  line-height: 1.6;
`;

const ActionSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0;
`;

const PaymentButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.primaryHover || theme.colors.primary};
    opacity: 0.9;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const LogsSection = styled.div`
  margin-top: 2rem;
`;

const LogsTitle = styled.h3`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 1rem;
`;

const LogsContainer = styled.div`
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  white-space: pre-wrap;
`;

const StatusMessage = styled.div<{ type: 'success' | 'error' | 'info' }>`
  padding: 12px;
  border-radius: 4px;
  margin: 1rem 0;
  background: ${({ type }) => {
    switch (type) {
      case 'success': return '#d4edda';
      case 'error': return '#f8d7da';
      case 'info': return '#d1ecf1';
      default: return '#f8f9fa';
    }
  }};
  border: 1px solid ${({ type }) => {
    switch (type) {
      case 'success': return '#c3e6cb';
      case 'error': return '#f5c6cb';
      case 'info': return '#bee5eb';
      default: return '#dee2e6';
    }
  }};
  color: ${({ type }) => {
    switch (type) {
      case 'success': return '#155724';
      case 'error': return '#721c24';
      case 'info': return '#0c5460';
      default: return '#495057';
    }
  }};
`;

export const X402Demo: React.FC = () => {
  const { fetchWithPayment } = useX402();
  const [logs, setLogs] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => `${prev}[${timestamp}] ${message}\n`);
  };

  const handleBuyContent = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    setLogs('');
    
    try {
      addLog('Starting X402 payment flow...');
      addLog('Calling facilitator backend endpoint...');
      
      // Call the facilitator backend (assuming it's running on localhost:3000)
      const response = await fetchWithPayment('http://localhost:3000/paywall');
      
      addLog(`Received response with status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addLog('Payment successful! Content unlocked.');
        addLog(`Content: ${JSON.stringify(data, null, 2)}`);
        
        setStatusMessage({
          type: 'success',
          text: `Success! Content unlocked: ${data.content || 'Premium content received'}`
        });
      } else {
        addLog(`Request failed with status: ${response.status}`);
        setStatusMessage({
          type: 'error',
          text: `Request failed with status: ${response.status}`
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Error: ${errorMessage}`);
      console.error('Payment failed:', error);
      
      setStatusMessage({
        type: 'error',
        text: `Payment failed: ${errorMessage}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs('');
    setStatusMessage(null);
  };

  return (
    <DemoContainer>
      <Title>Casper X402 Payment Adapter Demo</Title>
      
      <Description>
        This demo showcases the X402 payment flow integration with Casper blockchain.
        Connect your wallet and click the button below to trigger a 402 error and complete a gasless payment.
      </Description>

      {/* Wallet Connection UI */}
      <ClickUI />

      <ActionSection>
        <PaymentButton 
          onClick={handleBuyContent} 
          disabled={isLoading}
        >
          {isLoading ? 'Processing Payment...' : 'Unlock Premium Content (Gasless)'}
        </PaymentButton>
        
        {statusMessage && (
          <StatusMessage type={statusMessage.type}>
            {statusMessage.text}
          </StatusMessage>
        )}
      </ActionSection>

      <LogsSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <LogsTitle>Payment Flow Logs</LogsTitle>
          <button 
            onClick={clearLogs}
            style={{
              background: 'transparent',
              border: '1px solid #ccc',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        </div>
        <LogsContainer>
          {logs || 'No logs yet. Click the payment button to see the X402 flow in action.'}
        </LogsContainer>
      </LogsSection>
    </DemoContainer>
  );
};