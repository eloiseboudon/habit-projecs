import { Stack } from "expo-router";

import { HabitDataProvider } from "../context/HabitDataContext";

export default function RootLayout() {
  return (
    <HabitDataProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </HabitDataProvider>
  );
}
