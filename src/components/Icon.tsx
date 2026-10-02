const paths = {
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2",
  phone: "M5 4h3l1.5 4.5-2 1.2a11 11 0 0 0 6.8 6.8l1.2-2L20 16v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  chat: "M4 20l1.3-3.9A8 8 0 1 1 8 19.3L4 20Zm5-8h.01M12 12h.01M15 12h.01",
  mail: "M4 6h16v12H4V6Zm0 0 8 7 8-7",
  box: "M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Zm0 0L12 12l8-4.5M12 12v9",
  copy: "M9 9h11v11H9V9Zm-5 6V4h11",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z",
  question: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6m0 3h.01",
  mobile: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 15h2",
  heart: "M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z",
  grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  list: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
  user: "M12 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM5 19.2c1.4-3 3.8-4.4 7-4.4s5.6 1.4 7 4.4",
  cart: "M6 7h15l-1.6 8.2H8.2L6 7Zm0 0L5 4H2m7 15.5h.01M17 19.5h.01",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4",
  chevronLeft: "M15 5l-7 7 7 7",
  chevronRight: "M9 5l7 7-7 7",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z",
  truck: "M3 6h11v10H3V6Zm11 4h4l3 3v3h-7v-6ZM7 19a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 7 19Zm10 0a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z",
  shield: "M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6l7-3Zm-3 9 2 2 4-4",
  card: "M3 6h18v12H3V6Zm0 4h18M7 15h4",
  store: "M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6",
  instagram: "M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm4.5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.2-1.7h.01",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-5 w-5", filled = false }: { name: IconName; className?: string; filled?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}
