import { useEffect, useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useClickRef, ThemeModeType } from '@make-software/csprclick-ui';
import ClickTopBar from './components/ClickTopBar';
import { LandingBrief, SignedInBrief } from './components/GettingStarted';
import Container from './components/container';
import { Welcome } from './components/GettingStarted/components';
import { X402Demo } from './components/X402Demo';
import { Cep18PermitTest } from './components/Cep18PermitTest';
import { AppTheme } from './settings/theme';

const GettingStartedContainer = styled.div(({ theme }) =>
  theme.withMedia({
    maxWidth: ['100%', '720px', '960px'],
    padding: '0 12px',
    margin: '0 auto'
  })
);

const DemoSection = styled.div(({ theme }) =>
  theme.withMedia({
    maxWidth: ['100%', '720px', '960px'],
    padding: '2rem 12px',
    margin: '0 auto'
  })
);

const App = () => {
  const clickRef = useClickRef();
  const [themeMode, setThemeMode] = useState<ThemeModeType>(ThemeModeType.light);
  const [activeAccount, setActiveAccount] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<'home' | 'test'>('home');

  useEffect(() => {
    clickRef?.on('csprclick:signed_in', async (evt: any) => {
      await setActiveAccount(evt.account);
    });
    clickRef?.on('csprclick:switched_account', async (evt: any) => {
      await setActiveAccount(evt.account);
    });
    clickRef?.on('csprclick:signed_out', async (evt: any) => {
      setActiveAccount(null);
    });
    clickRef?.on('csprclick:disconnected', async (evt: any) => {
      setActiveAccount(null);
    });
  }, [clickRef?.on]);

  // Handle URL-based routing
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/test') {
      setCurrentPage('test');
    } else {
      setCurrentPage('home');
    }
  }, []);

  return (
    <ThemeProvider theme={AppTheme[themeMode]}>
      <ClickTopBar
        themeMode={themeMode}
        onThemeSwitch={() =>
          setThemeMode(themeMode === ThemeModeType.light ? ThemeModeType.dark : ThemeModeType.light)
        }
      />
      <Container>
        {currentPage === 'test' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <button
                onClick={() => {
                  setCurrentPage('home');
                  window.history.pushState({}, '', '/');
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid #ccc',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Back to Home
              </button>
            </div>
            <Cep18PermitTest />
          </>
        ) : (
          <>
            <Welcome />
            <GettingStartedContainer id={'getting-started'}>
              {activeAccount ? <SignedInBrief /> : <LandingBrief />}
            </GettingStartedContainer>
            
            <DemoSection id={'x402-demo'}>
              <X402Demo />
            </DemoSection>

            <div style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '2rem' }}>
              <button
                onClick={() => {
                  setCurrentPage('test');
                  window.history.pushState({}, '', '/test');
                }}
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                🧪 Go to Contract Test Page
              </button>
            </div>
          </>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default App;
