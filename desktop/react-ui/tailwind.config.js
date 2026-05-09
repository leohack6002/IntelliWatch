export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#050812',
        panel: 'rgba(13, 22, 38, 0.72)',
        cyanedge: '#25d6ff',
        mint: '#62f6a8',
        amber: '#f5c84b',
        danger: '#ff596c'
      },
      boxShadow: {
        glow: '0 0 28px rgba(37, 214, 255, 0.24)',
        panel: '0 18px 60px rgba(0, 0, 0, 0.38)'
      },
      fontFamily: {
        display: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
