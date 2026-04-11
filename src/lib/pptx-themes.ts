export interface PptxTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    accent: string;
    dark: string;
    light: string;
    muted: string;
    white: string;
    bodyBg: string;
  };
}

export const PPTX_THEMES: PptxTheme[] = [
  {
    id: "modern-dark",
    name: "Modern Dark",
    description: "Elegant dark navy with gold accents",
    colors: {
      primary: "1a365d",
      accent: "d4a843",
      dark: "0f172a",
      light: "f8fafc",
      muted: "94a3b8",
      white: "FFFFFF",
      bodyBg: "f1f5f9",
    },
  },
  {
    id: "corporate-blue",
    name: "Corporate Blue",
    description: "Professional blue with clean whites",
    colors: {
      primary: "065A82",
      accent: "1C7293",
      dark: "21295C",
      light: "F0F4F8",
      muted: "8DA9C4",
      white: "FFFFFF",
      bodyBg: "EDF2F7",
    },
  },
  {
    id: "academic-green",
    name: "Academic Green",
    description: "Forest green with moss highlights",
    colors: {
      primary: "2C5F2D",
      accent: "97BC62",
      dark: "1B3A1C",
      light: "F5F7F0",
      muted: "7A9E7E",
      white: "FFFFFF",
      bodyBg: "EEF2E6",
    },
  },
  {
    id: "warm-terracotta",
    name: "Warm Terracotta",
    description: "Earthy terracotta with sand tones",
    colors: {
      primary: "B85042",
      accent: "E7985B",
      dark: "4A2028",
      light: "FDF8F5",
      muted: "A7BEAE",
      white: "FFFFFF",
      bodyBg: "F7F0EA",
    },
  },
  {
    id: "berry-cream",
    name: "Berry & Cream",
    description: "Rich berry purple with soft cream",
    colors: {
      primary: "6D2E46",
      accent: "C97B84",
      dark: "3D1526",
      light: "FDF6F0",
      muted: "A26769",
      white: "FFFFFF",
      bodyBg: "F8F0EC",
    },
  },
  {
    id: "charcoal-minimal",
    name: "Charcoal Minimal",
    description: "Sleek charcoal with sharp contrasts",
    colors: {
      primary: "36454F",
      accent: "E8B931",
      dark: "212121",
      light: "F2F2F2",
      muted: "9E9E9E",
      white: "FFFFFF",
      bodyBg: "EBEBEB",
    },
  },
];
