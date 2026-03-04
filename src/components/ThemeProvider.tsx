"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ 
  children, 
  ...props 
}: React.ComponentProps<typeof NextThemesProvider>) {
  // Forçamos o atributo 'forcedTheme' como dark para que o app nunca mude
  return (
    <NextThemesProvider 
      {...props} 
      forcedTheme="dark"
      enableSystem={false}
      defaultTheme="dark"
    >
      {children}
    </NextThemesProvider>
  );
}