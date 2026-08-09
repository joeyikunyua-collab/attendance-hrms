import type { AppProps } from "next/app";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { SettingsProvider } from "@/lib/SettingsContext";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <HeroUIProvider>
      <ToastProvider placement="bottom-center" />
      <SettingsProvider>
        <Component {...pageProps} />
      </SettingsProvider>
    </HeroUIProvider>
  );
}
