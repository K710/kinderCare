/** @type {import('tailwindcss').Config} */
// Token theo DESIGN.md – không tự ý đổi
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1F2A44', soft: '#5B6478' },
        paper: '#F6F8FB',
        surface: '#FFFFFF',
        line: '#E3E7EE',
        leaf: { DEFAULT: '#2F9E5B', soft: '#E6F4EC', dark: '#257F49' },
        sun: { DEFAULT: '#FFC23D', soft: '#FFF4D6' },
        sky: { DEFAULT: '#4BA3E3', soft: '#E4F1FB' },
        peach: { DEFAULT: '#FF7F6E', soft: '#FFE9E5' },
        berry: { DEFAULT: '#D6455D', soft: '#FBE4E8' },
        role: { admin: '#5B6478', principal: { DEFAULT: '#7A5AF8', soft: '#EFEBFE', dark: '#5A3FD0' }, teacher: '#2F9E5B', parent: '#F28C28' },
      },
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.6' }],
        sm: ['14px', { lineHeight: '1.6' }],
        base: ['16px', { lineHeight: '1.6' }],
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['22px', { lineHeight: '1.25' }],
        '2xl': ['28px', { lineHeight: '1.25' }],
        '3xl': ['36px', { lineHeight: '1.25' }],
      },
      borderRadius: {
        btn: '10px', // nút & input
        card: '16px', // khối nội dung
        photo: '12px', // ảnh album
      },
      spacing: { 4.5: '18px', 11: '44px' },
      boxShadow: {
        float: '0 8px 24px rgba(31, 42, 68, 0.12)', // chỉ modal / dropdown / bottom sheet
      },
      maxWidth: { content: '1280px', parent: '640px' },
    },
  },
  plugins: [],
};
