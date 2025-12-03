import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   /* config options here */
   reactStrictMode: true,
   typescript: {
      ignoreBuildErrors: true,
   },
   // API body size limit for image uploads
   api: {
      bodyParser: {
         sizeLimit: '50mb',
      },
   },
};

export default nextConfig;
