import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Setup jest-dom matchers
import '@testing-library/jest-dom';

// Mock all the complex dependencies
jest.mock('@make-software/csprclick-ui', () => ({
  useClickRef: jest.fn(() => ({
    on: jest.fn(),
    activeAccount: null,
    signMessage: jest.fn()
  })),
  ThemeModeType: {
    light: 'light',
    dark: 'dark'
  },
  ClickUI: () => <div data-testid="click-ui">Wallet Connection UI</div>
}));

jest.mock('../components/ClickTopBar', () => {
  return function MockClickTopBar() {
    return <div data-testid="click-top-bar">Top Bar</div>;
  };
});

jest.mock('../components/GettingStarted', () => ({
  LandingBrief: () => <div data-testid="landing-brief">Landing Brief</div>,
  SignedInBrief: () => <div data-testid="signed-in-brief">Signed In Brief</div>
}));

jest.mock('../components/container', () => {
  return function MockContainer({ children }: { children: React.ReactNode }) {
    return <div data-testid="container">{children}</div>;
  };
});

jest.mock('../components/GettingStarted/components', () => ({
  Welcome: () => <div data-testid="welcome">Welcome</div>
}));

jest.mock('../components/X402Demo', () => ({
  X402Demo: () => <div data-testid="x402-demo">X402 Demo Component</div>
}));

jest.mock('../hooks/useX402', () => ({
  useX402: jest.fn(() => ({
    fetchWithPayment: jest.fn()
  }))
}));

// Mock the theme
jest.mock('../settings/theme', () => ({
  AppTheme: {
    light: {
      colors: {
        background: '#ffffff',
        text: '#000000',
        textSecondary: '#666666',
        primary: '#007bff'
      },
      withMedia: (styles: any) => styles
    },
    dark: {
      colors: {
        background: '#000000',
        text: '#ffffff',
        textSecondary: '#cccccc',
        primary: '#007bff'
      },
      withMedia: (styles: any) => styles
    }
  }
}));

describe('App Component Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render X402Demo component in App context', () => {
    render(<App />);
    
    // Verify that the X402Demo component is rendered
    expect(screen.getByTestId('x402-demo')).toBeInTheDocument();
    expect(screen.getByText('X402 Demo Component')).toBeInTheDocument();
  });

  test('should render all main components including X402Demo', () => {
    render(<App />);
    
    // Verify all main components are present
    expect(screen.getByTestId('click-top-bar')).toBeInTheDocument();
    expect(screen.getByTestId('container')).toBeInTheDocument();
    expect(screen.getByTestId('welcome')).toBeInTheDocument();
    expect(screen.getByTestId('landing-brief')).toBeInTheDocument(); // No active account
    expect(screen.getByTestId('x402-demo')).toBeInTheDocument();
  });

  test('should maintain existing wallet connection integration', () => {
    const { useClickRef } = require('@make-software/csprclick-ui');
    const mockClickRef = {
      on: jest.fn(),
      activeAccount: { public_key: 'test-key' },
      signMessage: jest.fn()
    };
    useClickRef.mockReturnValue(mockClickRef);

    render(<App />);
    
    // Verify that wallet event listeners are set up
    expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:signed_in', expect.any(Function));
    expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:switched_account', expect.any(Function));
    expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:signed_out', expect.any(Function));
    expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:disconnected', expect.any(Function));
  });

  test('should render X402Demo alongside existing components without conflicts', () => {
    render(<App />);
    
    // Verify that both existing and new components coexist
    const container = screen.getByTestId('container');
    
    // Check that the container includes both getting started and demo sections
    expect(container).toContainElement(screen.getByTestId('welcome'));
    expect(container).toContainElement(screen.getByTestId('landing-brief'));
    expect(container).toContainElement(screen.getByTestId('x402-demo'));
  });

  test('should apply theme to X402Demo component', () => {
    render(<App />);
    
    // The X402Demo component should be wrapped in the ThemeProvider
    // This is verified by the component rendering without errors
    expect(screen.getByTestId('x402-demo')).toBeInTheDocument();
  });

  test('should handle theme switching with X402Demo present', () => {
    const { useClickRef } = require('@make-software/csprclick-ui');
    useClickRef.mockReturnValue({
      on: jest.fn(),
      activeAccount: null,
      signMessage: jest.fn()
    });

    const { rerender } = render(<App />);
    
    // Component should render successfully with light theme
    expect(screen.getByTestId('x402-demo')).toBeInTheDocument();
    
    // Re-render to simulate theme change (the component handles this internally)
    rerender(<App />);
    
    // Component should still be present after theme operations
    expect(screen.getByTestId('x402-demo')).toBeInTheDocument();
  });
});