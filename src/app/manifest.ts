import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Yonatan Elias — Personal Profile & Portfolio Platform',
    short_name: 'Yonatan Elias',
    description: 'Computational Data Scientist & Full-Stack Systems Engineer Portfolio Platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#090a0f',
    theme_color: '#6366f1',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
