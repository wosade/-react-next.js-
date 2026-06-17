import type { NextConfig } from 'next';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env/.env') });
config({ path: resolve(__dirname, '../.env/.env.front') });

const nextConfig: NextConfig = {
  webpack(config) {
    const rules = config.module.rules;

    for (const rule of rules) {
      if (!rule?.oneOf) continue;

      const sassRule = rule.oneOf.find((r: any) =>
        r?.test?.toString?.().includes('module\\.(scss|sass)')
      );

      if (sassRule) {
        const lessUse = Array.isArray(sassRule.use)
          ? sassRule.use
              .map((u: any) => {
                if (!u || typeof u === 'string') return u;
                const loaderStr = typeof u.loader === 'string' ? u.loader : '';
                if (loaderStr.includes('sass-loader')) {
                  return { loader: 'less-loader' };
                }
                if (loaderStr.includes('resolve-url-loader')) {
                  return null;
                }
                return { ...u };
              })
              .filter(Boolean)
          : sassRule.use;

        const lessRule = {
          ...sassRule,
          test: /\.module\.less$/,
          use: lessUse,
        };

        const idx = rule.oneOf.indexOf(sassRule);
        rule.oneOf.splice(idx, 0, lessRule);
        break;
      }
    }

    return config;
  },
};

export default nextConfig;
