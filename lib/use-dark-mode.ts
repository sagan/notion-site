import useDarkModeImpl from "@fisch0920/use-dark-mode";

export function useDarkMode() {
  const darkMode = useDarkModeImpl(false, {
    onChange: (isDarkMode) => {
      document.body.dataset.dark = isDarkMode ? "1" : "0";
    },
  });

  return {
    isDarkMode: darkMode.value,
    toggleDarkMode: darkMode.toggle,
  };
}
