import React, { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/lib/store/authStore";
import "@/styles/globals.css";

function App({ Component, pageProps }: AppProps) {
  const { checkAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Restore user from localStorage on app initialization
    checkAuth().finally(() => setIsReady(true));
  }, [checkAuth]);

  // Prevent flash of content before auth check completes
  if (!isReady) {
    return null;
  }

  return (
    <>
      <Component {...pageProps} />
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;
