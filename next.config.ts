import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// @ts-expect-error next-pwa doesn't have proper types for TS NextConfig sometimes
import withPWAInit from "next-pwa";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(withPWA(nextConfig));
