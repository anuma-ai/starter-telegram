const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const getMiniAppPage = (privyAppId: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Login</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--tg-theme-bg-color, #fff);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--tg-theme-text-color, #111);
    }
    #root {
      text-align: center;
      padding: 40px 20px;
      width: 100%;
    }
    .btn {
      background: var(--tg-theme-button-color, #111);
      color: var(--tg-theme-button-text-color, #fff);
      border: none;
      padding: 14px 48px;
      font-size: 16px;
      border-radius: 24px;
      cursor: pointer;
      font-weight: 500;
      transition: opacity 0.2s;
      width: 100%;
      max-width: 280px;
    }
    .btn:hover { opacity: 0.8; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .description {
      color: var(--tg-theme-hint-color, #666);
      font-size: 14px;
      max-width: 320px;
      margin: 24px auto 0;
      line-height: 1.5;
    }
    .success { color: #22c55e; font-size: 18px; }
    .error { color: #ef4444; font-size: 14px; margin-top: 16px; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.2.0",
      "react-dom": "https://esm.sh/react-dom@18.2.0",
      "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
      "react/jsx-runtime": "https://esm.sh/react@18.2.0/jsx-runtime",
      "@privy-io/react-auth": "https://esm.sh/@privy-io/react-auth@2.0.4?external=react,react-dom"
    }
  }
  </script>
</head>
<body>
  <div id="root">
    <button class="btn" disabled>Loading...</button>
  </div>

  <script type="module">
    import React, { useState, useEffect } from 'react';
    import { createRoot } from 'react-dom/client';
    import { PrivyProvider, usePrivy, useLogin, useIdentityToken, useCreateWallet } from '@privy-io/react-auth';

    const PRIVY_APP_ID = '${privyAppId}';
    const tg = window.Telegram?.WebApp;

    // Get Telegram user ID from WebApp or URL query param (dev mode)
    const urlParams = new URLSearchParams(window.location.search);
    const telegramUserId = tg?.initDataUnsafe?.user?.id || parseInt(urlParams.get('userId') || '0', 10) || null;

    function LoginContent() {
      const [status, setStatus] = useState('ready');
      const { ready, authenticated, user } = usePrivy();
      const { identityToken } = useIdentityToken();
      const { createWallet } = useCreateWallet();

      // Check if user has an embedded wallet
      const hasWallet = user?.linkedAccounts?.some(account => account.type === 'wallet' && account.walletClient === 'privy');

      useEffect(() => {
        if (tg) {
          tg.ready();
          tg.expand();
        }
      }, []);

      const sendToken = async (token) => {
        if (!telegramUserId) {
          setStatus('error');
          return;
        }

        const response = await fetch('/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, telegramUserId }),
        });

        if (response.ok) {
          setStatus('success');
          // Close the Mini App after success
          setTimeout(() => {
            if (tg) tg.close();
          }, 1500);
        } else {
          throw new Error('Failed to save token');
        }
      };

      const { login } = useLogin({
        onComplete: () => setStatus('creating-wallet'),
        onError: () => setStatus('error'),
      });

      // Create wallet after login if needed
      useEffect(() => {
        if (status === 'creating-wallet' && authenticated) {
          if (hasWallet) {
            setStatus('getting-token');
          } else {
            createWallet()
              .then(() => setStatus('getting-token'))
              .catch(() => setStatus('getting-token')); // Continue even if wallet creation fails
          }
        }
      }, [status, authenticated, hasWallet]);

      useEffect(() => {
        if (status === 'getting-token' && identityToken) {
          sendToken(identityToken).catch(() => setStatus('error'));
        }
      }, [status, identityToken]);

      // Auto-login if already authenticated
      useEffect(() => {
        if (ready && authenticated && identityToken && status === 'ready') {
          if (hasWallet) {
            setStatus('getting-token');
            sendToken(identityToken).catch(() => setStatus('error'));
          } else {
            setStatus('creating-wallet');
          }
        }
      }, [ready, authenticated, identityToken, status, hasWallet]);

      // Auto-trigger login for first-time users (Telegram-only flow)
      useEffect(() => {
        if (ready && !authenticated && status === 'ready' && telegramUserId) {
          login();
        }
      }, [ready, authenticated, status, telegramUserId]);

      if (!telegramUserId) {
        return React.createElement('div', null,
          React.createElement('p', { className: 'error' }, 'User ID not found. Please open this link from Telegram.')
        );
      }

      if (status === 'success') {
        return React.createElement('div', null,
          React.createElement('p', { className: 'success' }, 'Login successful!'),
          React.createElement('p', { className: 'description' }, tg ? 'You can now close this and chat with the bot.' : 'You can now return to Telegram and chat with the bot.')
        );
      }

      if (status === 'error') {
        return React.createElement('div', null,
          React.createElement('button', { className: 'btn', onClick: () => { setStatus('ready'); login(); } }, 'Try Again'),
          React.createElement('p', { className: 'error' }, 'Login failed. Please try again.')
        );
      }

      if (status === 'creating-wallet') {
        return React.createElement('button', { className: 'btn', disabled: true }, 'Creating wallet...');
      }

      if (status === 'getting-token') {
        return React.createElement('button', { className: 'btn', disabled: true }, 'Signing in...');
      }

      return React.createElement('div', null,
        React.createElement('button', {
          className: 'btn',
          disabled: !ready,
          onClick: login
        }, ready ? 'Sign In' : 'Loading...'),
        React.createElement('p', { className: 'description' },
          'Sign in to use the AI assistant.'
        )
      );
    }

    function App() {
      return React.createElement(PrivyProvider, {
        appId: PRIVY_APP_ID,
        config: {
          appearance: { theme: 'light' },
          loginMethods: ['telegram'],
          embeddedWallets: {
            createOnLogin: 'all-users',
          },
        }
      }, React.createElement(LoginContent));
    }

    const root = createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  </script>
</body>
</html>
`;

// Web Request/Response handler (used by both CF Worker and dev server)
export async function handleAuthRequest(
  request: Request,
  config: {
    setToken: (userId: number, token: string) => Promise<void>;
    privyAppId: string;
  }
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (
    request.method === "GET" &&
    (url.pathname === "/" || url.pathname.startsWith("/login"))
  ) {
    return new Response(getMiniAppPage(config.privyAppId), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  if (request.method === "POST" && url.pathname === "/callback") {
    try {
      const { token, telegramUserId } = (await request.json()) as {
        token?: string;
        telegramUserId?: number;
      };
      if (token && telegramUserId) {
        await config.setToken(telegramUserId, token);
        console.log(`Token saved for user ${telegramUserId}`);
        return Response.json({ success: true }, { headers: corsHeaders });
      }
      return Response.json(
        { error: "Missing token or userId" },
        { status: 400, headers: corsHeaders }
      );
    } catch {
      return Response.json(
        { error: "Invalid request" },
        { status: 400, headers: corsHeaders }
      );
    }
  }

  return new Response("Not found", { status: 404 });
}

export function getWebAppUrl(): string {
  return (
    process.env.AUTH_BASE_URL ||
    `http://localhost:${process.env.AUTH_PORT || "9876"}`
  );
}

export { getMiniAppPage };
