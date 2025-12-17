import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ClickUI, useClickRef } from '@make-software/csprclick-ui';
import { useCep18Permit } from '../hooks/useCep18Permit';

const TestContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  color: #1a1919;
  margin-bottom: 0.5rem;
  text-align: center;
`;

const Subtitle = styled.p`
  color: #666666;
  text-align: center;
  margin-bottom: 2rem;
`;

const ConfigSection = styled.div`
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 6px;
  margin-bottom: 2rem;
  border: 1px solid #dee2e6;
`;

const ConfigLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #1a1919;
  font-weight: 600;
`;

const ConfigInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
  }
`;

const TestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const TestCard = styled.div`
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TestTitle = styled.h3`
  color: #1a1919;
  margin-bottom: 1rem;
  font-size: 16px;
`;

const TestInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const TestButton = styled.button`
  width: 100%;
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const ResultBox = styled.div<{ type?: 'success' | 'error' | 'info' }>`
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
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
  font-size: 13px;
  word-break: break-all;
  font-family: 'Courier New', monospace;
`;

const LogsSection = styled.div`
  margin-top: 2rem;
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 6px;
  border: 1px solid #dee2e6;
`;

const LogsTitle = styled.h3`
  color: #1a1919;
  margin-bottom: 1rem;
`;

const LogsContainer = styled.div`
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ClearButton = styled.button`
  background: transparent;
  border: 1px solid #ccc;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background: #f8f9fa;
  }
`;

interface TestResult {
  name: string;
  result: string;
  type: 'success' | 'error' | 'info';
}

export const Cep18PermitTest: React.FC = () => {
  const clickRef = useClickRef();
  const [contractHash, setContractHash] = useState('');
  const [nodeAddress, setNodeAddress] = useState('https://node.testnet.cspr.cloud');
  const [chainName, setChainName] = useState('casper-test');
  const [logs, setLogs] = useState<string>('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const contract = useCep18Permit({
    nodeAddress,
    contractHash,
    chainName
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => `${prev}[${timestamp}] ${message}\n`);
  };

  const addResult = (name: string, result: string, type: 'success' | 'error' | 'info' = 'info') => {
    setResults(prev => [...prev, { name, result, type }]);
    addLog(`${name}: ${result}`);
  };

  const clearAll = () => {
    setLogs('');
    setResults([]);
  };

  // Read-only tests
  const testName = async () => {
    try {
      setIsLoading(true);
      addLog('Testing name()...');
      const result = await contract.name();
      addResult('name()', result, 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('name()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testSymbol = async () => {
    try {
      setIsLoading(true);
      addLog('Testing symbol()...');
      const result = await contract.symbol();
      addResult('symbol()', result, 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('symbol()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testDecimals = async () => {
    try {
      setIsLoading(true);
      addLog('Testing decimals()...');
      const result = await contract.decimals();
      addResult('decimals()', result.toString(), 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('decimals()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testTotalSupply = async () => {
    try {
      setIsLoading(true);
      addLog('Testing totalSupply()...');
      const result = await contract.totalSupply();
      addResult('totalSupply()', result, 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('totalSupply()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testBalanceOf = async () => {
    try {
      setIsLoading(true);
      const account = clickRef?.getActiveAccount?.();
      if (!account?.public_key) {
        throw new Error('Wallet not connected');
      }
      addLog(`Testing balanceOf(${account.public_key})...`);
      const result = await contract.balanceOf(account.public_key);
      addResult('balanceOf()', result, 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('balanceOf()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testNonceOf = async () => {
    try {
      setIsLoading(true);
      const account = clickRef?.getActiveAccount?.();
      if (!account?.public_key) {
        throw new Error('Wallet not connected');
      }
      addLog(`Testing nonceOf(${account.public_key})...`);
      const result = await contract.nonceOf(account.public_key);
      addResult('nonceOf()', result.toString(), 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('nonceOf()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Write operation tests (with dummy values)
  const testTransfer = async () => {
    try {
      setIsLoading(true);
      addLog('Testing transfer() with dummy values...');
      const dummyRecipient = '0189099e95b8682bc6c3644f542f19344c3e3ece4dc7c655ca3523eb091b080de3';
      const dummyAmount = '1000000000000000000'; // 1 token with 18 decimals
      const result = await contract.transfer(dummyRecipient, dummyAmount);
      addResult('transfer()', `Deploy: ${result}`, 'info');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('transfer()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testApprove = async () => {
    try {
      setIsLoading(true);
      addLog('Testing approve() with dummy values...');
      const dummySpender = '0189099e95b8682bc6c3644f542f19344c3e3ece4dc7c655ca3523eb091b080de3';
      const dummyAmount = '5000000000000000000'; // 5 tokens
      const result = await contract.approve(dummySpender, dummyAmount);
      addResult('approve()', `Deploy: ${result}`, 'info');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('approve()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testAllowance = async () => {
    try {
      setIsLoading(true);
      const account = clickRef?.getActiveAccount?.();
      if (!account?.public_key) {
        throw new Error('Wallet not connected');
      }
      const dummySpender = '0189099e95b8682bc6c3644f542f19344c3e3ece4dc7c655ca3523eb091b080de3';
      addLog(`Testing allowance(${account.public_key}, ${dummySpender})...`);
      const result = await contract.allowance(account.public_key, dummySpender);
      addResult('allowance()', result, 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('allowance()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testTransferFrom = async () => {
    try {
      setIsLoading(true);
      addLog('Testing transferFrom() with dummy values...');
      const dummyOwner = '0189099e95b8682bc6c3644f542f19344c3e3ece4dc7c655ca3523eb091b080de3';
      const dummyRecipient = '0189099e95b8682bc6c3644f542f19344c3e3ece4dc7c655ca3523eb091b080de3';
      const dummyAmount = '500000000000000000'; // 0.5 tokens
      const result = await contract.transferFrom(dummyOwner, dummyRecipient, dummyAmount);
      addResult('transferFrom()', `Deploy: ${result}`, 'info');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('transferFrom()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testClaimPayment = async () => {
    try {
      setIsLoading(true);
      const account = clickRef?.getActiveAccount?.();
      if (!account?.public_key) {
        throw new Error('Wallet not connected');
      }
      addLog('Testing claimPayment() with dummy values...');
      const dummyRecipient = '0189099e95b8682bc6c3644f542f19344c3e3ece4dc7c655ca3523eb091b080de3';
      const dummyAmount = '2000000000000000000'; // 2 tokens
      const dummyNonce = 0;
      const dummyDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const dummySignature = '0x' + '0'.repeat(128); // Dummy signature
      const result = await contract.claimPayment(
        account.public_key,
        dummyRecipient,
        dummyAmount,
        dummyNonce,
        dummyDeadline,
        dummySignature
      );
      addResult('claimPayment()', `Deploy: ${result}`, 'info');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addResult('claimPayment()', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TestContainer>
      <Title>🧪 Cep18Permit Contract Test Suite</Title>
      <Subtitle>Test all contract functions with dummy values</Subtitle>

      {/* Wallet Connection */}
      <ClickUI />

      {/* Configuration */}
      <ConfigSection>
        <ConfigLabel>Contract Configuration</ConfigLabel>
        <ConfigInput
          type="text"
          placeholder="Node Address (e.g., https://node.testnet.cspr.cloud)"
          value={nodeAddress}
          onChange={(e) => setNodeAddress(e.target.value)}
        />
        <ConfigInput
          type="text"
          placeholder="Contract Hash (e.g., hash-abc123...)"
          value={contractHash}
          onChange={(e) => setContractHash(e.target.value)}
        />
        <ConfigInput
          type="text"
          placeholder="Chain Name (e.g., casper-test)"
          value={chainName}
          onChange={(e) => setChainName(e.target.value)}
        />
      </ConfigSection>

      {/* Read-Only Tests */}
      <div>
        <h2 style={{ marginBottom: '1rem' }}>📖 Read-Only Functions</h2>
        <TestGrid>
          <TestCard>
            <TestTitle>name()</TestTitle>
            <TestButton onClick={testName} disabled={isLoading || !contractHash}>
              Get Token Name
            </TestButton>
          </TestCard>

          <TestCard>
            <TestTitle>symbol()</TestTitle>
            <TestButton onClick={testSymbol} disabled={isLoading || !contractHash}>
              Get Token Symbol
            </TestButton>
          </TestCard>

          <TestCard>
            <TestTitle>decimals()</TestTitle>
            <TestButton onClick={testDecimals} disabled={isLoading || !contractHash}>
              Get Decimals
            </TestButton>
          </TestCard>

          <TestCard>
            <TestTitle>totalSupply()</TestTitle>
            <TestButton onClick={testTotalSupply} disabled={isLoading || !contractHash}>
              Get Total Supply
            </TestButton>
          </TestCard>

          <TestCard>
            <TestTitle>balanceOf()</TestTitle>
            <TestButton onClick={testBalanceOf} disabled={isLoading || !contractHash || !clickRef?.getActiveAccount?.()}>
              Get My Balance
            </TestButton>
          </TestCard>

          <TestCard>
            <TestTitle>nonceOf()</TestTitle>
            <TestButton onClick={testNonceOf} disabled={isLoading || !contractHash || !clickRef?.getActiveAccount?.()}>
              Get My Nonce
            </TestButton>
          </TestCard>
        </TestGrid>
      </div>

      {/* Write Operation Tests */}
      <div>
        <h2 style={{ marginBottom: '1rem' }}>✍️ Write Functions (Dummy Values)</h2>
        <TestGrid>
          <TestCard>
            <TestTitle>transfer()</TestTitle>
            <TestButton onClick={testTransfer} disabled={isLoading || !contractHash}>
              Test Transfer
            </TestButton>
          </TestCard>

          <TestCard>
            <TestTitle>approve()</TestTitle>
            <TestButton onClick={testApprove} disabled={isLoading || !contractHash}>
              Test Approve
            </TestButton>
          </TestCard>

          <TestCard>
            <TestTitle>allowance()</TestTitle>
            <TestButton onClick={testAllowance} disabled={isLoading || !contractHash || !clickRef?.getActiveAccount?.()}>
              Test Allowance
            </TestButton>
          </TestCard>

          <TestCard>
            <TestTitle>transferFrom()</TestTitle>
            <TestButton onClick={testTransferFrom} disabled={isLoading || !contractHash}>
              Test TransferFrom
            </TestButton>
          </TestCard>

          <TestCard>
            <TestTitle>claimPayment()</TestTitle>
            <TestButton onClick={testClaimPayment} disabled={isLoading || !contractHash || !clickRef?.getActiveAccount?.()}>
              Test Claim Payment
            </TestButton>
          </TestCard>
        </TestGrid>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>📊 Test Results</h2>
          <TestGrid>
            {results.map((result, idx) => (
              <TestCard key={idx}>
                <TestTitle>{result.name}</TestTitle>
                <ResultBox type={result.type}>{result.result}</ResultBox>
              </TestCard>
            ))}
          </TestGrid>
        </div>
      )}

      {/* Logs */}
      <LogsSection>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <LogsTitle>📝 Execution Logs</LogsTitle>
          <ClearButton onClick={clearAll}>Clear All</ClearButton>
        </div>
        <LogsContainer>
          {logs || 'No logs yet. Click a test button to start.'}
        </LogsContainer>
      </LogsSection>
    </TestContainer>
  );
};
