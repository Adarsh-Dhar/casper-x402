import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { X402Demo } from '../X402Demo';

// Setup jest-dom matchers
import '@testing-library/jest-dom';

// Mock the useX402 hook
jest.mock('../../hooks/useX402', () => ({
  useX402: jest.fn()
}));

// Mock ClickUI component
jest.mock('@make-software/csprclick-ui', () => ({
  ClickUI: () => <div data-testid="click-ui">Wallet Connection UI</div>
}));

// Simple mock theme for testing
const mockTheme = {
  colors: {
    background: '#ffffff',
    text: '#000000',
    textSecondary: '#666666',
    primary: '#007bff',
    primaryHover: '#0056b3'
  },
  withMedia: (styles: any) => styles
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('X402Demo Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    test('should display ClickUI component for wallet connection', () => {
      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: jest.fn()
      });

      renderWithTheme(<X402Demo />);
      
      expect(screen.getByTestId('click-ui')).toBeInTheDocument();
      expect(screen.getByText('Wallet Connection UI')).toBeInTheDocument();
    });

    test('should provide a clear button to trigger payment flow', () => {
      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: jest.fn()
      });

      renderWithTheme(<X402Demo />);
      
      const paymentButton = screen.getByRole('button', { name: /unlock premium content/i });
      expect(paymentButton).toBeInTheDocument();
      expect(paymentButton).toHaveTextContent('Unlock Premium Content (Gasless)');
    });

    test('should display title and description', () => {
      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: jest.fn()
      });

      renderWithTheme(<X402Demo />);
      
      expect(screen.getByText('Casper X402 Payment Adapter Demo')).toBeInTheDocument();
      expect(screen.getByText(/this demo showcases the x402 payment flow/i)).toBeInTheDocument();
    });

    test('should display logs section', () => {
      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: jest.fn()
      });

      renderWithTheme(<X402Demo />);
      
      expect(screen.getByText('Payment Flow Logs')).toBeInTheDocument();
      expect(screen.getByText(/no logs yet/i)).toBeInTheDocument();
    });
  });

  describe('Payment Flow Integration', () => {
    /**
     * **Feature: x402-payment-adapter, Property 12: Demo interface flow**
     * For any payment button interaction, the demo should trigger the facilitator endpoint
     */
    test('should call facilitator backend endpoint when payment button is clicked', async () => {
      const mockFetchWithPayment = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'Premium content unlocked!' })
      });

      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: mockFetchWithPayment
      });

      renderWithTheme(<X402Demo />);
      
      const paymentButton = screen.getByRole('button', { name: /unlock premium content/i });
      fireEvent.click(paymentButton);

      await waitFor(() => {
        expect(mockFetchWithPayment).toHaveBeenCalledWith('http://localhost:3000/paywall');
      });
    });

    test('should display success message when payment completes successfully', async () => {
      const mockFetchWithPayment = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'Premium content unlocked!' })
      });

      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: mockFetchWithPayment
      });

      renderWithTheme(<X402Demo />);
      
      const paymentButton = screen.getByRole('button', { name: /unlock premium content/i });
      fireEvent.click(paymentButton);

      await waitFor(() => {
        expect(screen.getByText(/success! content unlocked/i)).toBeInTheDocument();
      });
    });

    test('should display error message when payment fails', async () => {
      const mockFetchWithPayment = jest.fn().mockRejectedValue(new Error('Payment failed'));

      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: mockFetchWithPayment
      });

      renderWithTheme(<X402Demo />);
      
      const paymentButton = screen.getByRole('button', { name: /unlock premium content/i });
      fireEvent.click(paymentButton);

      await waitFor(() => {
        expect(screen.getByText(/payment failed: payment failed/i)).toBeInTheDocument();
      });
    });

    test('should show loading state during payment processing', async () => {
      let resolvePayment: (value: any) => void;
      const paymentPromise = new Promise(resolve => {
        resolvePayment = resolve;
      });

      const mockFetchWithPayment = jest.fn().mockReturnValue(paymentPromise);

      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: mockFetchWithPayment
      });

      renderWithTheme(<X402Demo />);
      
      const paymentButton = screen.getByRole('button', { name: /unlock premium content/i });
      fireEvent.click(paymentButton);

      // Check loading state
      expect(screen.getByText('Processing Payment...')).toBeInTheDocument();
      expect(paymentButton).toBeDisabled();

      // Resolve the payment
      resolvePayment!({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'Success' })
      });

      await waitFor(() => {
        expect(screen.getByText('Unlock Premium Content (Gasless)')).toBeInTheDocument();
        expect(paymentButton).not.toBeDisabled();
      });
    });

    test('should log payment flow steps', async () => {
      const mockFetchWithPayment = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'Premium content' })
      });

      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: mockFetchWithPayment
      });

      renderWithTheme(<X402Demo />);
      
      const paymentButton = screen.getByRole('button', { name: /unlock premium content/i });
      fireEvent.click(paymentButton);

      await waitFor(() => {
        const logsContainer = screen.getByText(/starting x402 payment flow/i).closest('div');
        expect(logsContainer).toHaveTextContent('Starting X402 payment flow...');
        expect(logsContainer).toHaveTextContent('Calling facilitator backend endpoint...');
        expect(logsContainer).toHaveTextContent('Payment successful! Content unlocked.');
      });
    });

    test('should handle non-200 response status', async () => {
      const mockFetchWithPayment = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn()
      });

      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: mockFetchWithPayment
      });

      renderWithTheme(<X402Demo />);
      
      const paymentButton = screen.getByRole('button', { name: /unlock premium content/i });
      fireEvent.click(paymentButton);

      await waitFor(() => {
        // Check for the status message specifically
        const statusMessages = screen.getAllByText(/request failed with status: 500/i);
        expect(statusMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('UI Interactions', () => {
    test('should clear logs when clear button is clicked', async () => {
      const mockFetchWithPayment = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ content: 'Success' })
      });

      const { useX402 } = require('../../hooks/useX402');
      useX402.mockReturnValue({
        fetchWithPayment: mockFetchWithPayment
      });

      renderWithTheme(<X402Demo />);
      
      // Trigger payment to generate logs
      const paymentButton = screen.getByRole('button', { name: /unlock premium content/i });
      fireEvent.click(paymentButton);

      await waitFor(() => {
        expect(screen.getByText(/starting x402 payment flow/i)).toBeInTheDocument();
      });

      // Clear logs
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      expect(screen.getByText(/no logs yet/i)).toBeInTheDocument();
    });

    test('should handle different error types appropriately', async () => {
      const errorScenarios = [
        {
          error: new Error('Network timeout'),
          expectedMessage: 'Payment failed: Network timeout'
        },
        {
          error: new Error('Wallet not connected'),
          expectedMessage: 'Payment failed: Wallet not connected'
        },
        {
          error: 'String error',
          expectedMessage: 'Payment failed: Unknown error occurred'
        }
      ];

      for (const scenario of errorScenarios) {
        const mockFetchWithPayment = jest.fn().mockRejectedValue(scenario.error);

        const { useX402 } = require('../../hooks/useX402');
        useX402.mockReturnValue({
          fetchWithPayment: mockFetchWithPayment
        });

        const { unmount } = renderWithTheme(<X402Demo />);
        
        const paymentButton = screen.getByRole('button', { name: /unlock premium content/i });
        fireEvent.click(paymentButton);

        await waitFor(() => {
          expect(screen.getByText(scenario.expectedMessage)).toBeInTheDocument();
        });

        unmount();
        jest.clearAllMocks();
      }
    });
  });
});